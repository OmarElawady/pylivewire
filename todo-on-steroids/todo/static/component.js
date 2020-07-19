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
        // console.log("Msa2 l fol")
        this.component_data = this.parseInitialData()
        // console.log(this.component_data)
        this.eventDispatcher.registerComponent(this)
        // console.log(component_data)
        this.data = this.component_data["data"]
        this.name = this.component_data["name"]
        // console.log("sssssssssda", this.component_data)
        this.renderedChildren = this.component_data["renderedChildren"]
        this.childrenComponents = []
        this.initWalk(this.element)
        this.eventDispatcher.registerComponent(this)
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

    /* request sending */
    sendRequest(payload, doneCallback) {
        sendAjax(this.id, payload, [this.processResponse.bind(this), doneCallback])

    }

    sendSyncRequest(field, value, doneCallback) {
        // console.log(wiredElement)
        this.sendRequest(new SyncPayload(this, field, value), doneCallback)
    }

    sendEventRequest(event, arglist, doneCallback) {
        // console.log(arglist)
        this.sendRequest(new EventPayload(this, event, arglist), doneCallback)
    }

    sendMethodRequest(methodCall, doneCallback) {
        this.sendRequest(new MethodPayload(this, methodCall), doneCallback)
    }

    sendMethodRequest(methodCall, doneCallback) {
        this.sendRequest(new MethodPayload(this, methodCall), doneCallback)
    }
    sendFile(file, callback, doneCallback) {
        uploadFile(file, [callback, doneCallback])

    }
    /* -------------------------------------------------- */

    /* Component action triggers */

    $set(prop, val) {
        this.updateValue(prop, val)
    }

    updateValue(field, value) {
        this.taskScheduler.addTask(this.id, this.sendSyncRequest, field, value)
    }

    fireEvent(event, ...args) {
        this.taskScheduler.addTask(this.id, this.sendEventRequest, event, args)
    }

    callMethod(methodCall) {
        this.taskScheduler.addTask(this.id, this.sendMethodRequest, methodCall)
    }

    uploadFile(file, callback) {
        this.taskScheduler.addTask(this.id, this.sendFile, file, callback)
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
                if (from.isEqualNode(to) || to.hasAttribute("ignore"))
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
            // console.log(event)
            this.eventDispatcher.fireEvent(event["event"], ...event["args"])
        }
    }
    updateDirtyInputs(el, dirtyInputs) {
        if (el.hasAttribute("wire:id") && el.getAttribute("wire:id") != this.element.getAttribute("wire:id"))
            return
        if (el.hasAttribute("wire:model")) {
            let model = el.getAttribute("wire:model")
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
}
