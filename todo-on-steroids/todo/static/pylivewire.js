event_queue = []
event_subscribtions = {}
event_remaining_count = 0
active_events = new Set()
components = {}

requestQueue = {

}

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
                active_events.delete(id)
                callback(xmlhttp.responseText);
                served(id)
            }
        }
    };
    active_events.add(id)
    xmlhttp.open("POST", "/livewire/sync/" + id, true);
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlhttp.send(JSON.stringify(payload));
}

function executeHandlerOntime(handler, id, preprocessor) {
    return (ev) => {
        if (preprocessor !== undefined) {
            if (!preprocessor(ev))
                return
        }
        appendHandler(id, handler, ev)
    }
}
function serve(id) {
    let handler, args;
    handler = requestQueue[id][0][0]
    args = requestQueue[id][0][1]
    // console.log(handler.toString())
    handler(...args)
    if (!active_events.has(id))
        served(id)
}

function served(id) {
    requestQueue[id].shift()
    if (requestQueue[id].length)
        serve(id)

}

function appendHandler(id, handler, ...args) {
    if (!(id in requestQueue))
        requestQueue[id] = []
    requestQueue[id].push([handler, args])
    if (requestQueue[id].length == 1)
        serve(id)
}

function closest_component_root(el) {
    while (el && el.getAttribute('wire:id') == null)
        el = el.parentElement;
    return el;
}

function fireEvents(events) {
    for (ev of events)
        fireEvent(ev)
}

function handle_response(element) {

    function update_dom(dom) {
        // console.log("Updating")
        // console.log(element.outerHTML)
        // console.log(dom)
        // console.log("----------------------------")
        // console.log(element, dom)
        morphdom(element, dom, {
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
                // console.log("Updating")
                // console.log(from.outerHTML)
                // console.log(to.outerHTML)
                // console.log("-----------------------------------")
                if (from.isEqualNode(to))
                    return false
                if (to.hasAttribute("ignore"))
                    return false
                return to
            },
            onBeforeNodeDiscarded: (node) => {
                // console.log("Deleting", node)
                return true
            },
            onNodeAdded: (node) => {
                if (node.nodeType == Node.ELEMENT_NODE) {
                    let enclosing_root = closest_component_root(node)
                    if (!node.hasAttribute("ignore"))
                        walkWireProps(node, enclosing_root)
                }
            }
        })
    }

    function updateDirtyInputs(el, component, dirtyInputs) {
        // console.log(dirtyInputs)
        if (el.hasAttribute("wire:id") && el.getAttribute("wire:id") != element.getAttribute("wire:id"))
            return
        if (el.hasAttribute("wire:model")) {
            model = el.getAttribute("wire:model")
            // console.log(model, dirtyInputs, model in dirtyInputs)
            if (dirtyInputs.indexOf(model) != -1) {
                el.value = component.data[model]
            }
        }
        el = el.firstElementChild
        while (el) {
            updateDirtyInputs(el, component, dirtyInputs)
            el = el.nextElementSibling;
        }
    }

    function handler(value) {
        value = JSON.parse(value)
        let dom = value['dom']
        let events = value['dispatchEvents']
        let component = components[value["newData"]["id"]]
        let dirtyInputs = value["dirtyInputs"]
        component.updateData(value["newData"])
        alreadyRendered = component.renderedChildren
        update_dom(dom)
        updateDirtyInputs(element, component, dirtyInputs)
        fireEvents(events)
        let redirect = value['redirect']
        component.updateRenderedChildren(value["renderedChildren"])
        if (redirect != "")
            window.location = redirect
    }
    return handler;
}

function sync_changes(el, enclosing_root, prop) {
    let props = prop.slice(5).split('.')
    let lazy = props.indexOf("lazy") != -1
    let isDebounce = props.indexOf("debounce") != -1
    let debounceInterval = isDebounce ? props[props.indexOf("debounce") + 1] : -1
    handler = function (ev) {
        sendSyncRequest(enclosing_root, el.getAttribute("wire:" + prop), el.value)
    }
    if (isDebounce)
        handler = debounce(handler, debounceInterval)
    el.addEventListener(lazy ? "change" : "input", executeHandlerOntime(handler, enclosing_root.getAttribute("wire:id")));
}

function createPayload(el, type, json) {

    return {
        type: type,
        json: json,
        oldData: components[el.getAttribute("wire:id")].data,
        name: components[el.getAttribute("wire:id")].name,
        renderedChildren: components[el.getAttribute("wire:id")].renderedChildren
    }
}

function createMethodCallPayload(el, methodName) {
    return createPayload(el, "callMethod", {
        methodName: methodName
    })
}

function createEventTriggerPayload(el, name, args) {
    return createPayload(el, "fireEvent", {
        event: name,
        args: args
    })
}

function createSyncPayload(el, model, data) {
    let json = {}
    json[model] = data
    return createPayload(el, "updateData", json)
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
    function preprocessor(ev) {

        if (self && ev.target != el) return false
        if (key_specified && listen_to.indexOf(ev.key) == -1)
            return false
        if (preventDefault)
            ev.preventDefault()
        if (stopPropagation)
            ev.stopPropagation()
        return true
    }
    function handler(ev) {
        let value = el.getAttribute("wire:" + key)
        if (value[0] == '$') {
            eval(value.replace("(", ".call(el, "))
        } else {
            let payload = createMethodCallPayload(enclosing_root, value)
            let callback = handle_response(enclosing_root)
            let id = enclosing_root.getAttribute("wire:id")
            sendAjax(id, payload, callback)
        }
    }
    if (isDebounce)
        handler = debounce(handler, debounceInterval)

    el.addEventListener(event, executeHandlerOntime(handler, enclosing_root.getAttribute("wire:id"), preprocessor))
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
        // if (!(component_listeners[i] in event_subscribtions))
        //     event_subscribtions[component_listeners[i]] = 0
        // event_subscribtions[component_listeners[i]]++;
        document.addEventListener(component_listeners[i], executeHandlerOntime(function (ev) {
            let value = ev.detail.name
            let args = ev.detail.args
            // console.log(value, args)
            let payload = createEventTriggerPayload(enclosing_root, value, args)
            let wrapper = val => {
                // console.log(el, enclosing_root)
                handle_response(enclosing_root)(val)
                // event_remaining_count--;
                // console.log("events remaining wrapper", event_remaining_count)
                // fireEvent()
            }
            // let callback = update_element(enclosing_root)
            let id = enclosing_root.getAttribute("wire:id")
            sendAjax(id, payload, wrapper)
        }, enclosing_root.getAttribute("wire:id")))
    }
}

function initializeComponent(el, enclosing_root) {
    if (el.getAttribute('wire:id') == null)
        return
    let id = el.getAttribute("wire:id");
    let element_data = (htmlDecode(el.getAttribute('wire:initial-data')))
    let parsed = JSON.parse(element_data)
    // console.log(parsed)
    let component = new Component(id, parsed)
    components[id] = component
}

function sendSyncRequest(enclosing_root, prop, val) {
    sendAjax(enclosing_root.getAttribute("wire:id"), createSyncPayload(enclosing_root, prop, val), handle_response(enclosing_root))
}

function fireEvent(ev) {
    let event = ev['event']
    // event_remaining_count = event_subscribtions[event]
    let args = ev['args']
    let evt = new CustomEvent(event, { detail: { name: event, args: args } })
    document.dispatchEvent(evt)
}

function $emit(event, ...args) {
    fireEvent({
        'event': event,
        'args': args
    })
}
function $set(prop, val) {
    let enclosing_root = closest_component_root(this)
    sendSyncRequest(enclosing_root, prop, val)
}
function walkWireProps(el, enclosing_root) {
    setEventListeners(el, enclosing_root)
    initializeComponent(el, enclosing_root)
    for (var i = 0; i < el.attributes.length; i++) {
        var attrib = el.attributes[i];
        if (attrib.name.startsWith("wire:")) {
            if (attrib.name.startsWith("wire:model")) {
                sync_changes(el, enclosing_root, attrib.name.slice(5))
                executeHandlerOntime(() => sendSyncRequest(enclosing_root, attrib.value, el.value), enclosing_root.getAttribute("wire:id"))()
            } else
                addLiveWireEventListener(el, enclosing_root, attrib.name.slice(5))
        }
    }
}
function walkDom(el, enclosing_root) {
    if (el.hasAttribute("ignore"))
        return;
    el.getAttribute("wire:id") && (enclosing_root = el)
    walkWireProps(el, enclosing_root)
    el = el.firstElementChild
    while (el) {
        walkDom(el, enclosing_root);
        el = el.nextElementSibling;
    }
}