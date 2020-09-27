export { EventPayload }
import { Payload } from "./payload.js"

class EventPayload extends Payload {
    constructor(component, event, args) {
        super(component)
        this.type = "fireEvent"
        this.json["event"] = event // TODO: implement args
        this.json["args"] = args // TODO: implement args
    }
}