class Component {
    constructor(id, data) {
        this.id = id
        this.data = data["data"]
        this.name = data["name"]
        this.renderedChildren = data["renderedChildren"]
    }

    updateData(data) {
        this.data = data
    }
    updateRenderedChildren(renderedChildren) {
        this.renderedChildren = renderedChildren
    }
}