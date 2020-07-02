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

models = dict()


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
        print("Model class: " + model_class.__name__)
        models[model_class.__name__] = model_class


def generate_id():
    return str(uuid.uuid4())


def load(component, **kwargs):
    id = generate_id()
    component_class = models[component]
    component_obj = component_class(id, **kwargs)
    session["comps"][id] = component_obj.to_json()
    return component_obj.render()


def load_component_object(component, **kwargs):
    id = generate_id()
    component_class = models[component]
    component_obj = component_class(id, **kwargs)
    print(component_obj.to_json())
    session["comps"][id] = component_obj.to_json()
    return component_obj


def register_syncer(app):
    @app.route("/livewire/sync/<component_id>", methods=["POST"])
    def handle(component_id):
        data = request.json
        component_obj_json = json.loads(session["comps"][component_id])
        # print(component_obj_json)
        component_class = models[component_obj_json["model"]]
        component = component_class.from_json(component_obj_json)
        component.update(data)
        return component.render()


def init_pylivewire(app, root_dir):
    global render_template
    render_template = partial(render_template, app=app, pylivewire=sys.modules[__name__])
    register_syncer(app)
    print("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAa")
    load_models(root_dir)
