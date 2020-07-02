walkDom(document.body, null)
function senAjax(link, payload, callback) {
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {   // XMLHttpRequest.DONE == 4
            if (xmlhttp.status == 200) {
                callback(xmlhttp.responseText);
            }
        }
    };

    xmlhttp.open("POST", thelink, true);
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlhttp.send(JSON.stringify(payload));
}

function update_element(element) {
    function upd(value) {
        element.outerHTML = value
        walkDom(element, element)
    }
    return upd
}

function sync_changes(el, enclosing_root) {
    el.addEventLisener(function (ev) {
        payload = {}
        payload[el.getAttribute("wire:model")] = el.value
        sendAjax(link, payload, update_element(enclosing_root))
    });
}

function walkDom(el, enclosing_root) {
    el.getAttribute("wire:id") && (enclosing_root = enclosing_root)
    model = el.getAttribute("wire:model")
    if (model != null) {
        sync_changes(data, model)
    }
    el = el.firstElementChild
    while (el) {
        walkDom(el, enclosing_id);
        el = el.nextElementSibling;
    }
}