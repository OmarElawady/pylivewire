import json
import os
from .helpers import jsonify, is_jsonable, from_json
import pickle
from .session import load_from_session, is_loaded, is_visited
from cerberus import Validator
from flask import render_template
from .errors import ValidationError
import html
from .events import add_event


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
        return json.dumps(data_dict)

    def __setstate__(self, ddict):
        id = ddict["id"]
        if is_visited(id):
            self.__dict__ = ddict
        else:
            sess_obj = load_from_session(ddict["id"])
            self.__dict__ = sess_obj.__dict__
        # print("Fetching ", id)
        # self.print()

    def serialize(self):
        return pickle.dumps(self)
        # hist = {}
        # for k in dir(self):
        #     if k.startswith("__"):
        #         continue
        #     v = getattr(self, k)
        #     if isinstance(v, Component):
        #         hist[k] = v
        #         setattr(self, k, ComponentRef(v.id))
        # res = pickle.dumps(self)
        # for k, v in hist.items():
        #     setattr(self, k, v)
        # return res

    @classmethod
    def deserialize(cls, data):
        return pickle.loads(data)

    # @classmethod
    # def from_json(cls, data):
    #     new_instance = cls(data["id"])
    #     for k, v in data.items():
    #         try:
    #             item_cls = type(getattr(cls, k))
    #             setattr(new_instance, k, from_json(item_cls, v))
    #         except Exception:
    #             pass
    #     return new_instance

    def render(self, **kwargs):
        raise NotImplementedError("Render must be impolemented for components")

    def update(self, json_data):
        for k, v in json_data.items():
            item_cls = type(getattr(self, k))
            setattr(self, k, from_json(item_cls, v))

    def render_annotated(self, errors=None):
        if not errors:
            errors = {}
        self.errors = errors
        html_code = self.render().strip()
        pos = -1
        for i, c in enumerate(html_code):
            if c not in "<-._" and not c.isalnum():
                pos = i
                break
        initial_data = self.get_initial_data()
        initial_data_str = html.escape(json.dumps(initial_data))
        result = html_code[0:pos] + f' wire:id="{self.id}" wire:initial-data="{initial_data_str}" ' + html_code[pos:]

        return result

    def get_initial_data(self):
        data = {}
        data["name"] = self.__class__.__name__
        data["data"] = self.to_json()
        return data

    def emit(self, event, *args):
        add_event(event, *args)

    def render_template(self, template, **kwargs):
        updated_kwargs = {k: self.__dict__[k] for k in self.__dict__ if not k.startswith("__")}
        updated_kwargs["errors"] = self.errors
        updated_kwargs.update(kwargs)
        return render_template(template, **updated_kwargs)

    def __str__(self):
        return self.render_annotated()

    def validate(self, rules):
        doc = {k: self.__dict__[k] for k in self.__dict__ if not k.startswith("__")}
        v = Validator(allow_unknown=True)
        if not v.validate(doc, rules):
            raise ValidationError("Validation error occured", v.errors)
