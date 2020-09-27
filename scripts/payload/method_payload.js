export { MethodPayload }
import { Payload } from "./payload.js"

class MethodPayload extends Payload {
    constructor(component, methodCall) {
        super(component)
        this.type = "callMethod"
        this.json["methodName"] = methodCall // TODO: implement args
    }
}