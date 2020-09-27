export { SyncPayload }
import { Payload } from "./payload.js"

class SyncPayload extends Payload {
    constructor(component, fieldName, value) {
        super(component)
        this.type = "updateData"
        this.json[fieldName] = value
    }
}