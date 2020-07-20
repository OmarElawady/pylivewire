// import ComponentRegistry from "./component_registry.js"

class TaskScheduler {
    constructor(componentRegistry) {
        this.tasks = {}
        this.componentRegistry = componentRegistry
    }

    addTask(id, task, ...args) {
        if (!(id in this.tasks))
            this.tasks[id] = []
        this.tasks[id].push([task, args])
        if (this.tasks[id].length == 1)
            this.serve(id)
    }

    serve(id) {
        let done_callback = () => (this.served(id))
        let func, args;
        func = this.tasks[id][0][0]
        args = this.tasks[id][0][1]
        // console.log(this.componentRegistry.getComponentById(id))
        // console.log(func)
        func.call(this.componentRegistry.getComponentById(id), ...args, done_callback)
    }

    served(id) {
        if (id in this.tasks) {
            this.tasks[id].shift()
            if (this.tasks[id].length) {
                this.serve(id)
            }
        }
    }
    removeComponent(id) {
        delete this.tasks[id]
    }
}

export { TaskScheduler }