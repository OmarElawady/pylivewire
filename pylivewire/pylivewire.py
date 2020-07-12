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
from .session import load_from_session, clear_session, session_hack
import ast
from .errors import ValidationError
from .events import get_events, clear_events
from .debug import print_component, print_component_from_string

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
        models[model_class.__name__] = model_class


def generate_id():
    return str(uuid.uuid4())


def load(component, **kwargs):
    id = generate_id()
    component_class = models[component]
    # active_components.add(component_class)
    component_obj = component_class(id, **kwargs)
    session_hack[id] = component_obj.serialize()
    return component_obj.render_annotated()


def load_component_object(component, **kwargs):
    id = generate_id()
    component_class = models[component]
    # active_components.add(component_class)
    component_obj = component_class(id, **kwargs)
    session_hack[id] = component_obj.serialize()
    return component_obj


def scripts():
    listeners = {}
    for name in models:
        comp = models[name]
        if hasattr(comp, "listeners"):
            listeners[comp.__name__] = comp.listeners
            # for ls in comp.listeners:
            #     if ls not in listeners:
            #         listeners[ls] = []
            #     listeners[ls].append(comp.__name__)
    return f"""
    <script>
    listeners = {json.dumps(listeners)}
    </script>
    """


def register_syncer(app):
    @app.route("/livewire/sync/<component_id>", methods=["POST"])
    def handle(component_id):
        # print("------------------------------------------------------")
        # from pprint import pprint

        # print("before")
        # pprint(session)
        # print("------------------------------------------------------")
        print(session)
        clear_events()
        clear_session()
        type_ = request.json["type"]
        data = request.json["json"]
        component = load_from_session(component_id)
        # if component.__class__.__name__.startswith("T") and type_[0] == "f":
        #     import ipdb

        #     ipdb.set_trace()
        # print("enter")
        # print_component(component)
        errors = {}
        try:
            if type_ == "updateData":
                component.update(data)
                # print("middle")
                # print_component(component)
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
            elif type_ == "fireEvent":
                event = data["event"]
                args = data["args"]
                getattr(component, event)(*args)

        except ValidationError as e:
            errors = e.args[1]
        session_hack[component_id] = component.serialize()
        # print("end")
        # print_component(component)
        response_data = {"dom": component.render_annotated(errors), "dispatchEvents": get_events()}
        # print("------------------------------------------------------")
        # print("after")
        # pprint(session)
        # print("------------------------------------------------------")

        # import ipdb

        # ipdb.set_trace()
        return json.dumps(response_data)


def init_pylivewire(app, root_dir):
    global render_template
    render_template = partial(render_template, app=app, pylivewire=sys.modules[__name__])
    register_syncer(app)
    load_models(root_dir)
