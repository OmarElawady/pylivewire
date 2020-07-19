export { WiredElement }
import { debounce, toCamelCase } from "./utils.js"
class WiredElement {
    constructor(component, element) {
        this.element = element
        this.component = component
        this.modelled = false
        this.listeners = []
        this.init()
    }

    init() {
        this.initFieldNameAndModifiers()
        this.addIfModelled()
        this.initBackendIfModelled()
        this.addEventListeners()
    }

    addIfModelled() {
        if (!this.modelled)
            return
        let event = "lazy" in this.modifiers && this.modifiers["lazy"] == true ? "change" : "input"

        let debounceInterval = "debounce" in this.modifiers ? this.modifiers["debounce"] : 0
        let debouncedventListener = debounce(this.eventListener.bind(this), debounceInterval)
        this.element.addEventListener(event, debouncedventListener)
        this.listeners.push({ event: event, handler: debouncedventListener })
        this.element.WiredElementObject = this
    }

    initBackendIfModelled() {
        // if (!this.modelled)
        //     this.component.updateValue(this.fieldName, this.element.value)
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
            if (attrib.name.startsWith("wire:model")) {
                this.fieldName = attrib.value
                this.attrName = attrib.name
                this.modifiers = this.getModifiers(attrib.name.slice("wire:model".length))
                this.modelled = true
            }
        }
    }

    getModifiers(mods) {
        let bools = ["lazy"]
        let ints = ["debounce"]
        let result = {
        }
        let splitted = mods.split('.')
        for (let i = 0; i < splitted.length; i++) {
            if (splitted[i] in bools) {
                result[[splitted[i]]] = true;
            } else if (splitted[i] in ints) {
                result[splitted[i]] = int(splitted[i + 1])
                i += 1
            }
        }
        return result
        // this.result = result
    }

    updateElement() {
        for (let listener of this.listeners)
            this.element.removeEventListeners(listener["event"], listener["handler"])
        if (this.element)
            this.init()
    }

    updateValue() {
        this.component.updateValue(this.fieldName, this.element.value)
    }

    eventListener(ev) {
        // console.log("Herer")
        this.updateValue()
    }
}