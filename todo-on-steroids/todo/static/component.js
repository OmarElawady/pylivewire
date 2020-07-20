export { Component }
import { htmlDecode, sendAjax, uploadFile } from "./utils.js"
import { WiredElement } from "./wired_element.js"
import { SyncPayload } from "./payload/sync_payload.js"
import { EventPayload } from "./payload/event_payload.js"
import { MethodPayload } from "./payload/method_payload.js"

class Component {
    constructor(element, taskScheduler, eventDispatcher, componentRegistry) {
        this.element = element
        this.taskScheduler = taskScheduler
        this.eventDispatcher = eventDispatcher
        this.componentRegistry = componentRegistry
        this.id = this.element.getAttribute("wire:id")
        new WiredElement(this, this.element)
        this.init()
    }


    updateData(data) {
        this.data = data
    }
    updateRenderedChildren(renderedChildren) {
        this.renderedChildren = renderedChildren
    }

    init() {
        this.component_data = this.parseInitialData()
        this.eventDispatcher.registerComponent(this)
        this.data = this.component_data["data"]
        this.name = this.component_data["name"]
        this.renderedChildren = this.component_data["renderedChildren"]
        this.childrenComponents = []
        this.loadingStateListeners = {}
        this.prefetched = {}
        this.loadingStateActivations = { "": 0 }
        this.initWalk(this.element)
        this.eventDispatcher.registerComponent(this)
    }

    postInit() {
        let we = this.element.WiredElementObject
        if (we.hasAttribute("init")) {
            console.log(we.getValue(), this.data[we.getAttribute("model")])
            this.callMethod(we.getAttribute("init"))
        }
        this.backSyncModels(this.element)
    }
    backSyncModels(element) {
        let we = element.WiredElementObject
        if (we.hasAttribute("model") && we.getValue() != this.data[we.getAttribute("model")])
            we.updateValue()
        element = element.firstElementChild
        while (element) {
            this.backSyncModels(element)
            element = element.nextElementSibling
        }
    }
    initWalk(element) {
        if (this.element != element) {
            if (element.hasAttribute("wire:id")) {
                this.componentRegistry.addComponent(new Component(element, this.taskScheduler, this.eventDispatcher, this.componentRegistry))
                return
            }
            else
                new WiredElement(this, element)
        }
        element = element.firstElementChild

        while (element) {
            this.initWalk(element)
            element = element.nextElementSibling
        }
    }

    parseInitialData() {
        /* parse wire:initial-data property during first rendering */
        return JSON.parse(htmlDecode(this.element.getAttribute('wire:initial-data')))
    }

    delete() {
        this.eventDispatcher.unregisterComponent(this)
        this.taskScheduler.removeComponent(this.id)
        for (let child of this.childrenComponents) {
            this.componentRegistry.delete(child)
        }
    }

    /* getters */

    getName() {
        return this.name
    }
    getID() {
        return this.id
    }

    dataJSON() {
        return this.data
    }

    getRenderedChildren() {
        return this.renderedChildren
    }

    /* -------------------------------------------------- */

    /* setters */

    appendChild(id) {
        this.childrenComponents.add(id)
    }

    /* -------------------------------------------------- */
    debounce(func, wait) {
        let timeout
        let active = false
        let force = false
        let that = this
        let executedFunction = function (...args) {
            const later = () => {
                timeout = null
                that.removeDebounceFunction(executedFunction)
                active = force = false
                func(...args)
            }
            clearTimeout(timeout)
            if (!active) {
                active = true
                that.addDebounceFunction(executedFunction)
            }
            if (force)
                later()
            else
                timeout = setTimeout(later, wait)
        }
        executedFunction.force = function (...args) {
            force = true
            executedFunction()
        }
        return executedFunction
    }

    addDebounceFunction(func) {
        if (!this.debounceFunctionList)
            this.debounceFunctionList = []
        this.debounceFunctionList.push(func)
    }

    removeDebounceFunction(func) {
        if (!this.debounceFunctionList)
            this.debounceFunctionList = []
        this.debounceFunctionList.splice(this.debounceFunctionList.indexOf(func), 1)
    }

    debounceAll() {
        if (this.startedDisposing !== undefined)
            return
        this.startedDisposing = true
        if (!this.debounceFunctionList)
            this.debounceFunctionList = []
        let cp = this.debounceFunctionList
        for (let deb of cp) {
            if (this.debounceFunctionList.indexOf(deb) === -1)
                continue
            deb.force()
        }
        this.startedDisposing = undefined

    }

    /* request sending */
    sendRequest(payload, ...callbacks) {
        sendAjax(this.id, payload, [this.processResponse.bind(this)].concat(callbacks))
        this.prefetched = {}
    }

    sendPrefetchRequest(payload, ...callbacks) {
        sendAjax(this.id, payload, callbacks)
    }

    sendSyncRequest(field, value, doneCallback) {
        this.activateTarget(field)
        // console.log(wiredElement)
        this.sendRequest(new SyncPayload(this, field, value), doneCallback, this.deactivator(field))
    }

    sendEventRequest(event, arglist, doneCallback) {
        // console.log(arglist)
        this.sendRequest(new EventPayload(this, event, arglist), doneCallback)
    }

    sendMethodRequest(methodCall, doneCallback) {
        if (methodCall in this.prefetched) {
            doneCallback(this.prefetched[methodCall])
            this.processResponse(this.prefetched[methodCall])
            delete this.prefetched[methodCall]
        } else {
            this.activateTarget(methodCall)
            this.sendRequest(new MethodPayload(this, methodCall), doneCallback, this.deactivator(methodCall))
        }
    }

    sendMethodPrefetchRequest(methodCall, doneCallback) {
        let handler = ((val) => {
            this.prefetched[methodCall] = val
        }).bind(this)
        this.sendPrefetchRequest(new MethodPayload(this, methodCall), doneCallback, handler)
    }

    sendFile(file, callback, doneCallback) {
        uploadFile(file, [callback, doneCallback])

    }
    /* -------------------------------------------------- */

    /* Component action triggers */

    $set(prop, val) {
        this.updateValue(prop, val)
    }
    addTask(method, ...args) {
        this.debounceAll()
        this.taskScheduler.addTask(this.id, method, ...args)

    }
    updateValue(field, value) {
        this.addTask(this.sendSyncRequest, field, value)
    }

    fireEvent(event, ...args) {
        this.addTask(this.sendEventRequest, event, args)
    }

    callMethod(methodCall) {
        this.addTask(this.sendMethodRequest, methodCall)
    }

    prefetchCallMethod(methodCall) {
        this.addTask(this.sendMethodPrefetchRequest, methodCall)
    }

    uploadFile(file, callback) {
        this.addTask(this.sendFile, file, callback)
    }
    refresh() {
        this.callMethod("refresh")
    }
    /* -------------------------------------------------- */

    /* processing response */

    closest_component_root(element) {
        while (element && !element.hasAttribute("wire:id"))
            element = element.parentElement
        return element
    }

    update_dom(dom) {
        let that = this
        morphdom(this.element, dom, {
            childrenOnly: false,
            getNodeKey: node => {
                if (node.nodeType != Node.ELEMENT_NODE)
                    return node.id;
                // console.log(node.getAttribute("wire:key"), node.getAttribute("wire:id"))
                // This allows the tracking of elements by the "key" attribute, like in VueJs.
                return node.hasAttribute(`wire:key`)
                    ? node.getAttribute(`wire:key`)
                    : // If no "key", then first check for "wire:id", then "id"
                    node.hasAttribute(`wire:id`)
                        ? node.getAttribute(`wire:id`)
                        : node.id
            },
            onBeforeElUpdated: (from, to) => {
                if (from.isEqualNode(to) || from.hasAttribute("wire:ignore") || to.hasAttribute("wire:id") && to.getAttribute("wire:id") != that.id)
                    return false
                return to
            },
            onNodeDiscarded: (node) => {
                if (node.nodeType != Node.ELEMENT_NODE || !node.hasAttribute("wire:id"))
                    return true
                that.componentRegistry.deleteComponent(node.getAttribute("wire:id"))
                return true
            },
            onNodeAdded: (node) => {
                if (node.nodeType != Node.ELEMENT_NODE || node.hasAttribute("ignore")) return;
                let enclosing_root = this.closest_component_root(node)
                if (enclosing_root == node)
                    this.componentRegistry.addComponent(new Component(node, this.taskScheduler, this.eventDispatcher, this.componentRegistry))
                else if (enclosing_root == this.element)
                    new WiredElement(this, node)
            }
        })
    }

    dispatchEvents(events) {
        for (let event of events) {
            this.eventDispatcher.fireEvent(event["event"], ...event["args"])
        }
    }
    updateDirtyInputs(el, dirtyInputs) {
        let we = el.WiredElementObject;
        if (el.hasAttribute("wire:id") && el.getAttribute("wire:id") != this.element.getAttribute("wire:id"))
            return
        if (we.hasAttribute("model")) {
            let model = we.getAttribute("model")
            if (dirtyInputs.indexOf(model) != -1) {
                el.value = this.data[model]
            }
        }
        el = el.firstElementChild
        while (el) {
            this.updateDirtyInputs(el, dirtyInputs)
            el = el.nextElementSibling;
        }
    }

    processResponse(response) {
        response = JSON.parse(response)
        let newDOM = response["dom"]
        this.data = response["newData"]
        this.renderedChildren = response["renderedChildren"]
        this.update_dom(newDOM)
        this.dispatchEvents(response["dispatchEvents"])
        this.updateDirtyInputs(this.element, response["dirtyInputs"])
        if (response["redirect"])
            window.location = response["redirect"]
    }



    listenOnTarget(target, activateCallback, deactivateCallback) {
        if (!(target in this.loadingStateListeners)) {
            this.loadingStateListeners[target] = []
            this.loadingStateActivations[target] = 0
        }
        this.loadingStateListeners[target].push([activateCallback, deactivateCallback])
    }

    activateTarget(target) {
        console.log("Activating", this.loadingStateActivations[""])
        if (target in this.loadingStateListeners) {
            this.loadingStateActivations[target] += 1
            if (this.loadingStateActivations[target] == 1)
                for (let callback of this.loadingStateListeners[target])
                    callback[0]()
        }
        if ("" in this.loadingStateListeners) {
            this.loadingStateActivations[""] += 1
            if (this.loadingStateActivations[""] == 1)
                for (let callback of this.loadingStateListeners[""])
                    callback[0]()
        }
    }

    deactivateTarget(target) {
        console.log("Deactivating", this.loadingStateActivations[""])
        if (target in this.loadingStateListeners) {
            assert(false)
            this.loadingStateActivations[target] -= 1
            if (this.loadingStateActivations[target] == 0)
                for (let callback of this.loadingStateListeners[target])
                    callback[1]()
        }
        if ("" in this.loadingStateListeners) {
            this.loadingStateActivations[""] -= 1
            if (this.loadingStateActivations[""] == 0)
                for (let callback of this.loadingStateListeners[""])
                    callback[1]()
        }
    }

    deactivator(target) {

        let func = () => {
            this.deactivateTarget(target)
        }
        return func.bind(this)
    }
}
