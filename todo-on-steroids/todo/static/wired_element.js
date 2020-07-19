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
        this.init()
    }

    init() {
        this.initFieldNameAndModifiers()
        this.addIfModelled()
        this.initBackendIfModelled()
        this.addEventListeners()
        this.addPolling()
    }

    addIfModelled() {
        if (!("model" in this.attrs))
            return
        if (this.element.type == "file")
            this.addFileModel()
        else
            this.addInputModel()
        this.element.WiredElementObject = this
    }

    addFileModel() {
        let handler = this.uploadFile.bind(this)
        let event = this.attrs["model"].getModifier("lazy") === true ? "change" : "input"
        this.element.addEventListener(event, handler)
        this.listeners.push({ event: event, handler: handler })
    }

    addInputModel() {
        let event = this.attrs["model"].getModifier("lazy") === true ? "change" : "input"

        let debounceInterval = this.attrs["model"].getModifier("debounce") || 0
        let debouncedventListener = debounce(this.eventListener.bind(this), debounceInterval)
        this.element.addEventListener(event, debouncedventListener)
        this.listeners.push({ event: event, handler: debouncedventListener })
    }

    addPolling() {
        if (!("polling" in this.attrs))
            return
        let pollingInterval = this.attrs["polling"].getModifier("interval") || 10
        console.log(this.attrs["polling"])
        setInterval(this.component.refresh.bind(this.component), pollingInterval * 1000)
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
                // console.log("ASDASDASD")
            } else {
                this.component.callMethod(value)
            }
        }
        if (isDebounce)
            handler = debounce(handler, debounceInterval)
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
                this.attrs[attr.getStrippedName()] = attr
            }
            // if (attrib.name.startsWith("wire:model")) {
            //     this.fieldName = attrib.value
            //     this.attrName = attrib.name
            //     this.modifiers = this.getModifiers(attrib.name.slice("wire:model".length))
            //     this.modelled = true
            // }
        }
        // console.log(this.attrs)
    }

    // getModifiers(mods) {
    //     let bools = ["lazy"]
    //     let ints = ["debounce"]
    //     let result = {
    //     }
    //     let splitted = mods.split('.')
    //     for (let i = 0; i < splitted.length; i++) {
    //         if (splitted[i] in bools) {
    //             result[[splitted[i]]] = true;
    //         } else if (splitted[i] in ints) {
    //             result[splitted[i]] = int(splitted[i + 1])
    //             i += 1
    //         }
    //     }
    //     return result
    //     // this.result = result
    // }

    updateElement() {
        for (let listener of this.listeners)
            this.element.removeEventListeners(listener["event"], listener["handler"])
        if (this.element)
            this.init()
    }

    updateValue() {
        this.component.updateValue(this.attrs["model"].getValue(this.element), this.element.value)
    }

    uploadFile(ev) {
        this.component.uploadFile(ev.target.files[0], this.fileUploaded.bind(this))

    }

    fileUploaded(val) {
        val = JSON.parse(val)
        this.component.updateValue(this.attrs["model"].getValue(this.element), "livewire-tmp-file:" + val["filename"])
    }

    eventListener(ev) {
        // console.log("Herer")
        this.updateValue()
    }
}