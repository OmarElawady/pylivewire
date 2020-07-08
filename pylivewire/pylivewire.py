from functools import partial
from importlib.machinery import SourceFileLoader
import uuid
from .component import Component
from flask import session, render_template, request, session
import sys
import inspect
from glob import glob
import os
import json
import pickle
from .session import load_from_session
import ast
from .errors import ValidationError

models = dict()
to_be_updated = []


def load_models(root_dir):
    COMPONENTS_DIR = os.path.join(root_dir, "pylivewire/comps")
    for path in glob(os.path.join(COMPONENTS_DIR, "*.py")):
        _, f = os.path.split(path)
        model = f[:-3]
        module = SourceFileLoader(f"todo.pylivewire.comps.{model}", path).load_module()
        classes = inspect.getmembers(module, inspect.isclass)
        model_class = None
        for c in classes:
            if issubclass(c[1], Component):  # should be BaseComponent
                model_class = c[1]
        models[model_class.__name__] = model_class


def generate_id():
    return str(uuid.uuid4())


def load(component, **kwargs):
    id = generate_id()
    component_class = models[component]
    component_obj = component_class(id, **kwargs)
    session[id] = component_obj.serialize()
    return component_obj.render_annotated()


def load_component_object(component, **kwargs):
    id = generate_id()
    component_class = models[component]
    component_obj = component_class(id, **kwargs)
    session[id] = component_obj.serialize()
    return component_obj


def rerender_component(component_obj):
    pass


def register_syncer(app):
    @app.route("/livewire/sync/<component_id>", methods=["POST"])
    def handle(component_id):
        type_ = request.json["type"]
        data = request.json["json"]
        component = load_from_session(component_id)
        errors = {}
        try:
            if type_ == "updateData":
                component.update(data)
            elif type_ == "callMethod":  # Security issue!
                call = data["methodName"]
                lp = call.find("(")
                if lp == -1:
                    getattr(component, call)()
                else:
                    name = call[:lp]
                    args = ast.literal_eval(call[lp:])
                    if type(args) != "tuple":
                        args = (args,)
                    getattr(component, name)(*args)
        except ValidationError as e:
            errors = e.args[1]
        import ipdb

        ipdb.set_trace()
        session[component_id] = component.serialize()
        return component.render_annotated(errors)


def init_pylivewire(app, root_dir):
    global render_template
    render_template = partial(render_template, app=app, pylivewire=sys.modules[__name__])
    register_syncer(app)
    load_models(root_dir)
