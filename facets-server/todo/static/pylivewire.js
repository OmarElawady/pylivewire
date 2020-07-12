event_queue = []
event_subscribtions = {}
event_remaining_count = 0
active_events = new Set()

const debounce = (func, wait) => {
    let timeout

    return function executedFunction(...args) {
        const later = () => {
            timeout = null
            func(...args)
        }

        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}
walkDom(document.body, null)

function sendAjax(id, payload, callback) {
    let xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {   // XMLHttpRequest.DONE == 4
            if (xmlhttp.status == 200) {
                callback(xmlhttp.responseText);
            }
        }
    };

    xmlhttp.open("POST", "http://localhost:8080/livewire/sync/" + id, true);
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlhttp.send(JSON.stringify(payload));
    // callback(xmlhttp.responseText);
}

function closest_component_root(el) {
    while (el && el.getAttribute('wire:id') == null)
        el = el.parentElement;
    return el;
}

function fireEvents(events) {
    fireEvent()
}

function update_element(element) {
    function upd(value) {
        value = JSON.parse(value)
        let dom = value['dom']
        let events = value['dispatchEvents']
        event_queue.push(...events)
        let parent = element.parentElement
        // console.log(element, dom)
        morphdom(element, dom, {
            // childrenOnly: false,
            getNodeKey: node => {
                if (node.nodeType != Node.ELEMENT_NODE)
                    return null;

                // This allows the tracking of elements by the "key" attribute, like in VueJs.
                return node.hasAttribute(`wire:key`)
                    ? node.getAttribute(`wire:key`)
                    : // If no "key", then first check for "wire:id", then "id"
                    node.hasAttribute(`wire:id`)
                        ? node.getAttribute(`wire:id`)
                        : node.id
            },
            onBeforeElUpdated: (from, to) => {
                // console.log(from, to, from.isEqualNode(to))
                if (from.isEqualNode(to))
                    return false;
                return to;
            },
            onNodeAdded: (node) => {
                if (node.nodeType == Node.ELEMENT_NODE) {
                    let enclosing_root = closest_component_root(node)
                    walkWireProps(node, enclosing_root)
                }
            }
        })
        fireEvents()
    }
    return upd
}

function sync_changes(el, enclosing_root, prop) {
    let props = prop.slice(5).split('.')
    let lazy = props.indexOf("lazy") != -1
    let isDebounce = props.indexOf("debounce") != -1
    let debounceInterval = isDebounce ? props[props.indexOf("debounce") + 1] : -1
    handler = function (ev) {
        let data = {
            type: "updateData",
            json: {

            }
        }
        let model = el.getAttribute("wire:" + prop)
        data["json"][model] = el.value
        sendAjax(enclosing_root.getAttribute("wire:id"), data, update_element(enclosing_root))
    }
    if (isDebounce)
        handler = debounce(handler, debounceInterval)
    el.addEventListener(lazy ? "change" : "input", handler);
}

function createPayload(type, json) {
    return {
        type: type,
        json: json
    }
}

function createMethodCallPayload(methodName) {
    return createPayload("callMethod", {
        methodName: methodName
    })
}

function createEventTriggerPayload(name, args) {
    return createPayload("fireEvent", {
        event: name,
        args: args
    })
}

function createSyncPayload(model, data) {
    let json = {}
    json[model] = data
    return createPayload("updateData", json)
}
function toKebabCase(val) {
    let res = ""
    for (var i = 0; i < val.length; i++) {
        if (val[i] == val[i].toUpperCase()) {
            if (i)
                res += "-"
            res += val[i].toLowerCase()
        } else {
            res += val[i]
        }
    }
    return res
}

function toCamelCase(val) {
    let res = ""
    for (var i = 0; i < val.length; i++) {
        if (val[i] == '-') {
            res += val[i + 1].toUpperCase()
            i++
        } else if (i == 0) {
            res += val[i].toUpperCase()
        } else {
            res += val[i]
        }
    }
    return res
}

function addLiveWireEventListener(el, enclosing_root, key) {
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
        if (self && ev.target != el) return
        if (key_specified && listen_to.indexOf(ev.key) == -1)
            return
        if (preventDefault)
            ev.preventDefault()
        if (stopPropagation)
            ev.stopPropagation()
        let value = el.getAttribute("wire:" + key)
        let payload = createMethodCallPayload(value)
        let callback = update_element(enclosing_root)
        let id = enclosing_root.getAttribute("wire:id")
        sendAjax(id, payload, callback)
    }
    if (isDebounce)
        handler = debounce(handler, debounceInterval)

    el.addEventListener(event, handler)
}

function setLivewireListeners(el, enclosing_root) {
    for (var i = 0; i < el.attributes.length; i++) {
        let attrib = el.attributes[i];
        if (attrib.name.startsWith("wire:")) {
            addLiveWireEventListener(el, enclosing_root, attrib.name.slice(5))
        }
    }
}
function htmlDecode(input) {
    var e = document.createElement('textarea');
    e.innerHTML = input;
    return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
}


function setEventListeners(el, enclosing_root) {
    if (el.getAttribute('wire:id') == null)
        return
    let element_data = (htmlDecode(el.getAttribute('wire:initial-data')))
    let parsed = JSON.parse(element_data)
    let component_name = parsed['name']
    if (!(component_name in listeners))
        return
    let component_listeners = listeners[component_name]
    for (let i = 0; i < component_listeners.length; i++) {
        if (!(component_listeners[i] in event_subscribtions))
            event_subscribtions[component_listeners[i]] = 0
        event_subscribtions[component_listeners[i]]++;
        document.addEventListener(component_listeners[i], function (ev) {
            let value = ev.detail.name
            let args = ev.detail.args
            // console.log(value, args)
            let payload = createEventTriggerPayload(value, args)
            let wrapper = val => {
                console.log(el, enclosing_root)
                update_element(enclosing_root)(val)
                event_remaining_count--;
                console.log("events remaining wrapper", event_remaining_count)
                fireEvent()
            }
            // let callback = update_element(enclosing_root)
            let id = enclosing_root.getAttribute("wire:id")
            sendAjax(id, payload, wrapper)
        })
    }
}

function fireEvent() {
    if (event_queue.length == 0 || event_remaining_count != 0)
        return
    let top_event = event_queue.shift()
    let event = top_event['event']
    event_remaining_count = event_subscribtions[event]
    console.log("events remaining", event_remaining_count)
    console.log("event", event)
    let args = top_event['args']
    let evt = new CustomEvent(event, { detail: { name: event, args: args } })
    console.log(event, args)
    document.dispatchEvent(evt)
}

function $emit(event, ...args) {
    event_queue.push({
        'event': event,
        'args': args
    })
    fireEvent()
}

function walkWireProps(el, enclosing_root) {
    setEventListeners(el, enclosing_root)
    for (var i = 0; i < el.attributes.length; i++) {
        var attrib = el.attributes[i];
        if (attrib.name.startsWith("wire:")) {
            if (attrib.name.startsWith("wire:model"))
                sync_changes(el, enclosing_root, attrib.name.slice(5))
            else
                addLiveWireEventListener(el, enclosing_root, attrib.name.slice(5))
        }
    }
}
function walkDom(el, enclosing_root) {
    el.getAttribute("wire:id") && (enclosing_root = el)
    walkWireProps(el, enclosing_root)
    el = el.firstElementChild
    while (el) {
        walkDom(el, enclosing_root);
        el = el.nextElementSibling;
    }
}