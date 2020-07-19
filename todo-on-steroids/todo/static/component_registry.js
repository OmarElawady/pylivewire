export { ComponentRegistry }
class ComponentRegistry {
    constructor() {
        this.components = {

        }
    }

    getComponentById(id) {
        return this.components[id]
    }

    deleteComponent(id) {
        this.components[id].delete()
        delete this.components[id]
    }
    addComponent(component) {
        this.components[component.getID()] = component
    }
}