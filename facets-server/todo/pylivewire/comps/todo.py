from pylivewire import Component, from_json, jsonify, load_component_object
from .item import Item
from flask import render_template


class List(list):
    type_ = None

    def __init__(self, type_, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def to_json(self):
        result = "["
        first = True
        for el in self:
            if not first:
                result += ","
            result += jsonify(el)
        result += "]"
        return result

    @classmethod
    def from_json(cls, data):
        new_instance = cls()
        for v in data:
            item_cls = cls.type_
            new_instance.append(from_json(item_cls, v))
        return new_instance


class ItemList(List):
    type_ = Item


class TODOList(Component):
    items = ItemList(Item)

    def __init__(self, id, **kwargs):
        self.items = ItemList(Item)
        self.items.append(load_component_object("Item"))
        super().__init__(id, **kwargs)

    def render(self):
        print(self.items)
        html = render_template("list_view.html", items=self.items)
        pos = -1
        for i, c in enumerate(html):
            if c not in "<-._" and not c.isalnum():
                pos = i
                break
        result = html[0:pos] + f' wire:id="{self.id}" ' + html[pos:]
        print(result)
        return result
