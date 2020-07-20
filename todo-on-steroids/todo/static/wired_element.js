export { WiredElement }
import { debounce, toCamelCase } from "./utils.js"
import { Attribute } from "./attribute.js"

class WiredElement {
    constructor(component, element) {
        this.element = element
        this.component = component
        this.modelled = false
        this.listeners = []
        this.attrs = {}
        this.debounce_reg = this.component.addDebounceFunction.bind(this.component)
        this.debounce_unreg = this.component.removeDebounceFunction.bind(this.component)
        this.init()
    }

    init() {
        this.element.WiredElementObject = this
        this.initFieldNameAndModifiers()
        this.addIfModelled()
        this.initBackendIfModelled()
        this.addEventListeners()
        this.addPolling()
        this.addLoadingState()
        this.addOfflineState()
    }

    hasAttribute(attr) {
        return attr in this.attrs
    }

    getAttribute(attr) {
        if (!(attr in this.attrs))
            return
        return this.attrs[attr][0].getValue(this.element)
    }

    getAttributeObject(attr) {
        if (!(attr in this.attrs))
            return
        return this.attrs[attr][0]
    }

    getAttributeObjectList(attr) {
        if (!(attr in this.attrs))
            return []
        return this.attrs[attr]
    }

    addIfModelled() {
        if (!("model" in this.attrs))
            return
        if (this.element.type == "file")
            this.addFileModel()
        else
            this.addInputModel()
    }

    addFileModel() {
        let handler = this.uploadFile.bind(this)
        // console.log(this.getAttributeObject("model"))
        let event = this.getAttributeObject("model").getModifier("lazy") === true ? "change" : "input"
        this.element.addEventListener(event, handler)
        this.listeners.push({ event: event, handler: handler })
    }

    addInputModel() {
        let event = this.getAttributeObject("model").getModifier("lazy") === true ? "change" : "input"
        let debounceInterval = this.getAttributeObject("model").getModifier("debounce") || 0
        let debouncedventListener = this.component.debounce(this.eventListener.bind(this), debounceInterval)
        this.element.addEventListener(event, debouncedventListener)
        this.listeners.push({ event: event, handler: debouncedventListener })
    }

    addPolling() {
        if (!("polling" in this.attrs))
            return
        let pollingInterval = this.getAttributeObject("polling").getModifier("interval") || 10
        // console.log(this.getAttributeObject("polling"))
        setInterval(this.component.refresh.bind(this.component), pollingInterval * 1000)
    }

    addOfflineState() {
        if (this.hasAttribute("offline")) {
            this.hideElement()
            window.addEventListener('offline', this.showElement.bind(this));
        }
    }
    /* loading state */
    addLoadingState() {
        if (!(this.hasAttribute("loading")))
            return
        let targets = ""
        this.element.setAttribute("wire:ignore", "")
        if (this.hasAttribute("target"))
            target = this.getAttribute(target)
        targets = targets.split(',')
        targets = targets.map(x => x.trim())
        let loadingActions = this.getAttributeObjectList("loading")
        for (let loadingAction of loadingActions) {
            this.addLoadingAction(loadingAction, targets)
        }
    }

    addLoadingAction(loadingAction, targets) {
        let mods = loadingAction.getModifiers()
        if (Object.keys(mods).length === 0)
            this.addShowLoadingAction(targets)
        if ("remove" in mods)
            this.addHideLoadingAction(targets)
        if (mods["class"] == "remove")
            this.addClassRemoveAction(targets, loadingAction.getValue(this.element))
        if (mods["class"] == "add")
            this.addClassAddAction(targets, loadingAction.getValue(this.element))
        if (mods["attr"] == "remove")
            this.addAttrRemoveAction(targets, loadingAction.getValue(this.element))
        if (mods["attr"] == "add")
            this.addAttrAddAction(targets, loadingAction.getValue(this.element))
    }

    addForAllTargets(targets, act, deact) {
        for (let target of targets) {
            this.component.listenOnTarget(target, act, deact)
        }
    }

    addShowLoadingAction(targets) {
        this.element.style.display = "none"
        this.addForAllTargets(targets, this.showElement.bind(this), this.hideElement.bind(this))
    }
    addHideLoadingAction(targets) {
        this.addForAllTargets(targets, this.hideElement.bind(this), this.showElement.bind(this))
    }

    addClassRemoveAction(targets, val) {
        this.addForAllTargets(targets, this.curry(this.removeClass, val), this.curry(this.addClass, val))
    }

    addClassAddAction(targets, val) {
        this.addForAllTargets(targets, this.curry(this.addClass, val), this.curry(this.removeClass, val))
    }

    addAttrRemoveAction(targets, val) {
        this.addForAllTargets(targets, this.curry(this.removeAttribute, val), this.curry(this.addAttribute, val))
    }

    addAttrAddAction(targets, val) {
        this.addForAllTargets(targets, this.curry(this.addAttribute, val), this.curry(this.removeAttribute, val))
    }


    initBackendIfModelled() {

    }

    addLiveWireEventListener(key) {
        let props = key.split('.')
        let event = props[0]
        let stopPropagation = props.indexOf("stop") != -1
        let preventDefault = props.indexOf("prevent") != -1
        let self = props.indexOf("self") != -1
        let isDebounce = props.indexOf("debounce") != -1
        let debounceInterval = isDebounce ? props[props.indexOf("debounce") + 1] : -1
        let keyboard_events = ["enter", "escape", "arrow-right"]
        let keyboard_events_camel = keyboard_events.map(toCamelCase)
        let listen_to = []
        let key_specified = false
        for (var i = 0; i < props.length; i++) {
            let idx = keyboard_events.indexOf(props[i])
            if (idx != -1) {
                let camelCase = toCamelCase(keyboard_events_camel[idx])
                key_specified = true
                listen_to.push(camelCase)
            }
        }
        function handler(ev) {
            if (self && ev.target != this.element) return false
            if (key_specified && listen_to.indexOf(ev.key) == -1)
                return false
            if (preventDefault)
                ev.preventDefault()
            if (stopPropagation)
                ev.stopPropagation()
            let value = this.element.getAttribute("wire:" + key)
            if (value[0] == '$') {
                let comp = this.component
                eval("comp." + value)
            } else {
                this.component.callMethod(value)
            }
        }
        if (isDebounce)
            handler = this.component.debounce(handler, debounceInterval)
        handler = handler.bind(this)
        this.listeners.push(handler)
        this.element.addEventListener(event, handler)
    }

    addEventListeners() {
        for (var i = 0; i < this.element.attributes.length; i++) {
            var attrib = this.element.attributes[i];
            if (attrib.name.startsWith("wire")) {
                this.addLiveWireEventListener(attrib.name.slice(5))

            }
        }
    }

    getValue() {
        return this.element.value
    }

    getFieldName() {
        return this.fieldName
    }

    initFieldNameAndModifiers() {
        for (var i = 0; i < this.element.attributes.length; i++) {
            var attrib = this.element.attributes[i];
            if (attrib.name.startsWith("wire:")) {
                let attr = (new Attribute(attrib.name))
                let attrStrippedName = attr.getStrippedName()
                if (!(attrStrippedName in this.attrs)) {
                    this.attrs[attrStrippedName] = []
                }
                this.attrs[attrStrippedName].push(attr)
            }
        }
    }

    updateElement() {
        for (let listener of this.listeners)
            this.element.removeEventListeners(listener["event"], listener["handler"])
        if (this.element)
            this.init()
    }

    updateValue() {
        this.component.updateValue(this.getAttributeObject("model").getValue(this.element), this.element.value)
    }

    uploadFile(ev) {
        this.component.uploadFile(ev.target.files[0], this.fileUploaded.bind(this))

    }

    fileUploaded(val) {
        val = JSON.parse(val)
        this.component.updateValue(this.getAttributeObject("model").getValue(this.element), "livewire-tmp-file:" + val["filename"])
    }

    eventListener(ev) {
        this.updateValue()
    }


    /* element toggling classes */

    addClass(className) {
        console.log("Adding")
        this.element.classList.add(className)
    }

    removeClass(className) {
        console.log("Removing")
        this.element.classList.remove(className)
    }

    /* attr toggling */

    addAttribute(attr) {
        let key, val
        let splitted = attr.split('=')
        key = splitted[0]
        if (splitted.length > 1)
            val = splittted[1]
        else
            val = ""
        this.element.setAttribute(attr, val)
    }

    removeAttribute(attr) {
        this.element.removeAttribute(attr)
    }
    /* show/hide */

    showElement() {
        this.element.style.display = "inline"
    }

    hideElement() {
        this.element.style.display = "none"
    }

    curry(func, ...args) {
        let that = this
        let res = () => {
            func.call(that, ...args)
        }
        return res
    }
}