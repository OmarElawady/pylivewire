export { Payload }

class Payload {
    constructor(component) {
        this.type = "Generic"
        this.json = {}
        this.oldData = component.dataJSON()
        this.name = component.getName()
        this.renderedChildren = component.getRenderedChildren()
    }

    payloadJSON() {
        return JSON.stringify({
            type: this.type,
            json: this.json,
            oldData: this.oldData,
            name: this.name,
            renderedChildren: this.renderedChildren
        })
    }
}