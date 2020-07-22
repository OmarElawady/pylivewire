export { EventDispatcher }
class EventDispatcher {
    constructor(listeners) {
        /*
         * listeners is a dict mapping component name to the list of events it listens on
         */
        this.listeners = listeners
        this.componentListeners = {} // dict of event name to the set of active components that listens on this event
        this.initEventListeners()
    }

    initEventListeners() {
        // should it be implemented as js events?
    }

    registerComponent(component) {
        let componentName = component.getName()
        if (!(componentName in this.listeners))
            return
        let events = this.listeners[componentName]
        for (let event of events) {
            if (!(event in this.componentListeners))
                this.componentListeners[event] = new Set()
            this.componentListeners[event].add(component)
        }
    }

    unregisterComponent(component) {
        let componentName = component.getName()
        let events = this.listeners[componentName]
        for (let event of events) {
            this.componentListeners[event].delete(component)
        }
    }

    fireEvent(event, ...args) {
        if (event in this.componentListeners)
            for (let component of this.componentListeners[event])
                component.fireEvent(event, ...args)
    }
}
