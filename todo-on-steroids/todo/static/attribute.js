export { Attribute }
class Attribute {
    constructor(name) {
        this.name = name
        name = name.slice("wire:".length)
        this.attrName = name.split('.')[0]
        this.mods = this._getModifiers(name.slice(this.attrName.length + 1))

    }

    getStrippedName() {
        return this.attrName
    }

    getModifier(mod) {
        return this.mods[mod]
    }

    getValue(el) {
        return el.getAttribute(this.name)
    }

    getModifiers() {
        return this.mods
    }

    _getModifiers(mods) {
        let bools = ["lazy", "remove"]
        let ints = ["debounce", "interval"]
        let strings = ["class", "attr"]
        let result = {
        }
        let splitted = mods.split('.')
        // console.log(splitted)
        for (let i = 0; i < splitted.length; i++) {
            if (bools.indexOf(splitted[i]) != -1) {
                result[[splitted[i]]] = true;
            } else if (ints.indexOf(splitted[i]) != -1) {
                result[splitted[i]] = parseInt(splitted[i + 1])
                i += 1
            } else if (strings.indexOf(splitted[i]) != -1) {
                result[splitted[i]] = splitted[i + 1]
                i += 1
            }
        }
        return result
    }
}