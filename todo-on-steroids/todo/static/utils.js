export { debounce, sendAjax, walkDom, htmlDecode, toCamelCase }
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

function sendAjax(id, payload, callbacks) {
    let xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {   // XMLHttpRequest.DONE == 4
            if (xmlhttp.status == 200) {
                // active_events.delete(id)
                for (let callback of callbacks) {
                    callback(xmlhttp.responseText);
                }
            }
        }
    };

    xmlhttp.open("POST", "/livewire/sync/" + id, true);
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    // console.log(payload)
    // console.log(JSON.parse(payload.payloadJSON()))
    xmlhttp.send(payload.payloadJSON());
}

function walkDom(element, func, data, update_data = () => { }, filter = () => true) {
    if (!filter(element, data))
        return
    data = update_data(element, data)
    func(element, data)
    element = element.firstElementChild
    while (element) {
        walkDom(element, enclosing_root, data, update_data, filter);
        element = element.nextElementSibling;
    }
}

function htmlDecode(input) {
    var e = document.createElement('textarea');
    e.innerHTML = input;
    return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
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
