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
    var xmlhttp = new XMLHttpRequest();

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
}
function closest_component_root(el) {
    while (el && el.getAttribute('wire:id') == null)
        el = el.parentElement;
    return el;
}
function update_element(element) {
    function upd(value) {
        parent = element.parentElement
        morphdom(element, value, {
            // childrenOnly: false,
            onBeforeElUpdated: (from, to) => {
                console.log(from)
                console.log(to)
                console.log(from.isEqualNode(to))
                if (from.isEqualNode(to))
                    return false;
                return to;
            },
            onNodeAdded: (node) => {
                if (node.nodeType == Node.ELEMENT_NODE) {
                    enclosing_root = closest_component_root(node)
                    walkWireProps(node, enclosing_root)
                }
            }
        })
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
        model = el.getAttribute("wire:" + prop)
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
    console.log(event, key_specified)
    function handler(ev) {
        console.log(self, key_specified, ev.key)
        if (self && ev.target != el) return
        if (key_specified && listen_to.indexOf(ev.key) == -1)
            return
        console.log(key, key.split('.'), ev.target)
        if (preventDefault)
            ev.preventDefault()
        if (stopPropagation)
            ev.stopPropagation()
        value = el.getAttribute("wire:" + key)
        payload = createMethodCallPayload(value)
        callback = update_element(enclosing_root)
        id = enclosing_root.getAttribute("wire:id")
        sendAjax(id, payload, callback)
    }
    if (isDebounce)
        handler = debounce(handler, debounceInterval)

    el.addEventListener(event, handler)
}

function setLivewireListeners(el, enclosing_root) {
    for (var i = 0; i < el.attributes.length; i++) {
        var attrib = el.attributes[i];
        if (attrib.name.startsWith("wire:")) {
            addLiveWireEventListener(el, enclosing_root, attrib.name.slice(5))
        }
    }
}

function walkWireProps(el, enclosing_root) {
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