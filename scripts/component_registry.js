export { ComponentRegistry }
class ComponentRegistry {
    constructor() {
        this.components = {

        }
    }
    getComponents() {
        return this.components.values()
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
        component.postInit()
    }
}