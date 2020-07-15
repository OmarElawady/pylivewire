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
import uuid
from jinja2 import environment
from copy import deepcopy


class Component:
    id = ""
    key = ""
    
    def __init__(self, **kwargs):
        # print(kwargs)
        self.key = str(kwargs["_key"])
        self.id = self.generate_random_id()
        self._jinja_env = kwargs["_flask_app"].jinja_env
        # print(self._jinja_env)
        self.fill_data(kwargs)
        _, filename = os.path.split(__file__)
        self.component_name, _ = os.path.splitext(filename)
        self._rendered_children = {}
        self._previously_rendered_children = {}
        self.initialize_defaults()

    def initialize_defaults(self):
        filtered_out = set("listeners")
        data = {k: v for k, v in self.__class__.__dict__.items() if not k.startswith("_") and k not in filtered_out}
        data["_livewire_parent_component"] = None
        for k, v in data.items():
            if k not in self.__dict__ and not callable(v):
                setattr(self, k, deepcopy(v))
                # print(k)

    def fill_data(self, data):
        for k, v in data.items():
            setattr(self, k, v)

    def generate_random_id(self):
        return str(uuid.uuid4())

    def set_previously_rendered_children(self, val):
        self._previously_rendered_children = val

    def add_rendered_child(self, item_key, item_id, item_tag):
        self._rendered_children[item_key] = {"id": item_id, "tag": item_tag}

    def is_previously_rendered(self, item_key):
        return item_key in self._previously_rendered_children

    def get_previously_rendered_data(self, item_key):
        return self._previously_rendered_children[item_key]

    def to_json(self):
        data_dict = {k: v for k, v in self.__dict__.items() if not k.startswith("_")}
        # data_dict["model"] = type(self).__name__
        return data_dict
        for i in dir(self):
            attr = getattr(self, i)
            if not i.startswith("__") and is_jsonable(attr):
                jsonfied = jsonify(attr)
                data_dict[i] = jsonfied
        return data_dict

    # def __getstate__(self):
    #     return {k: v for k, v in self.__dict__.items() if not k.startswith("_")}

    # def __setstate__(self, ddict):
    #     id = ddict["id"]
    #     if is_visited(id):
    #         self.__dict__ = ddict
    #     else:
    #         sess_obj = load_from_session(ddict["id"])
    #         self.__dict__ = sess_obj.__dict__
    #     # print("Fetching ", id)
    #     # self.print()

    # def serialize(self):
    #     return pickle.dumps(self)
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

    # @classmethod
    # def deserialize(cls, data):
    #     return pickle.loads(data)

    @classmethod
    def from_json(cls, flask_app, data):
        # new_instance = cls(_key=data["key"], _flask_app=flask_app)
        new_instance = cls(_key=data["key"], _flask_app=flask_app)
        # print(data)
        new_instance.fill_data(data)
        new_instance.hydrate()
        # new_instance.__class__ = cls
        # new_instance.__dict__ = data
        # new_instance._flask_app = flask_app
        return new_instance
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
            updating_method = f"updating_{k}"
            updated_method = f"updated_{k}"
            item_cls = type(getattr(self, k))
            assigned_value = from_json(item_cls, v)
            if self._call_if_exists(updating_method, k, assigned_value):
                setattr(self, k, assigned_value)
            self._call_if_exists(updated_method, k, assigned_value)

    def _call_if_exists(self, method_name, k, v):
        if hasattr(self, method_name) and callable(getattr(self, method_name)):
            return getattr(self, method_name)(field=k, value=v)
        return True

    def add_attrs_to_html(self, html_code):
        html_code = html_code.strip()
        pos = -1
        for i, c in enumerate(html_code):
            if c not in "<-._" and not c.isalnum():
                pos = i
                break
        initial_data = self.get_initial_data()
        initial_data_str = html.escape(json.dumps(initial_data))
        # print(initial_data)
        result = (
            html_code[0:pos]
            + f' wire:id="{self.id}" wire:key="{self.key}" wire:initial-data="{initial_data_str}" '
            + html_code[pos:]
        )

        return result

    def get_template_source(self, template):
        with open(template.filename, "r") as f:
            return f.read()

    def render_annotated(self, errors=None):
        if not errors:
            errors = {}
        self._errors = errors
        # env = Environment(loader=FileSystemLoader("frontdesk/templates"))
        # template = environment.get_template("list_view.html")
        # print(template)
        initial_render = self.render()
        # template = self._jinja_env.get_template("list_view.html")
        # template_source = self.get_template_source(template)
        # print(template_source)
        return self.add_attrs_to_html(initial_render)

    def get_initial_data(self):
        data = {}
        # data["key"] = self.key
        data["name"] = self.__class__.__name__
        data["data"] = self.to_json()
        data["renderedChildren"] = self._rendered_children
        return data

    def get_data_repr(self):
        return self.to_json()

    def emit(self, event, *args):
        add_event(event, *args)

    def render_template(self, template, **kwargs):
        updated_kwargs = {k: self.__dict__[k] for k in self.__dict__ if not k.startswith("__")}
        updated_kwargs["errors"] = self._errors
        updated_kwargs["obj"] = self
        updated_kwargs.update(kwargs)
        return render_template(template, **updated_kwargs)

    def __str__(self):
        return self.render_annotated()

    def validate(self, rules):
        doc = {k: self.__dict__[k] for k in self.__dict__ if not k.startswith("__")}
        v = Validator(allow_unknown=True)
        if not v.validate(doc, rules):
            raise ValidationError("Validation error occured", v.errors)

    def mount(self):
        pass

    def hydrate(self):
        pass
