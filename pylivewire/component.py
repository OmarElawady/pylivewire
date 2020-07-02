import json
import os
from .helpers import jsonify, is_jsonable, from_json


class Component:
    id = ""

    def __init__(self, id, **kwargs):
        self.fill_data(kwargs)
        self.id = id
        _, filename = os.path.split(__file__)
        self.component_name, _ = os.path.splitext(filename)

    def fill_data(self, data):
        for k, v in data.items():
            setattr(self, k, v)

    def to_json(self):
        data_dict = {"id": self.id, "model": type(self).__name__}
        for i in dir(self):
            attr = getattr(self, i)
            if not i.startswith("__") and is_jsonable(attr):
                jsonfied = jsonify(attr)
                data_dict[i] = jsonfied
        print(data_dict)
        return json.dumps(data_dict)

    @classmethod
    def from_json(cls, data):
        new_instance = cls(data["id"])
        for k, v in data.items():
            try:
                item_cls = type(getattr(cls, k))
                setattr(new_instance, k, from_json(item_cls, v))
            except Exception:
                pass
        return new_instance

    def render(self, **kwargs):
        raise NotImplementedError("Render must be impolemented for components")

    def update(self, json_data):
        for k, v in json_data.items():
            item_cls = type(getattr(type(self), k))
            setattr(self, k, from_json(item_cls, v))
