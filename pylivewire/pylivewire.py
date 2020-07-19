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
import ast
from .errors import ValidationError
from .events import get_events, clear_events
from jinja2 import Undefined

models = dict()
flask_app = None

def load_models(root_dir):
    COMPONENTS_DIR = os.path.join(root_dir, "pylivewire/comps")
    for path in glob(os.path.join(COMPONENTS_DIR, "*.py")):
        _, f = os.path.split(path)
        model = f[:-3]
        module = SourceFileLoader(f"todo.pylivewire.comps.{model}", path).load_module()
        classes = inspect.getmembers(module, inspect.isclass)
        model_class = None
        for c in classes:
            if issubclass(c[1], Component):
                model_class = c[1]
        if model_class is not None:
            models[model_class.__name__] = model_class


def dummy_component_element(data, key):
    tag = data["tag"]
    id = data["id"]
    return f'<{tag} wire:id="{id}" wire:key="{key}" ignore></{tag}>'


def get_tag(html):
    for i, c in enumerate(html[1:]):
        if not c.isalnum() and c not in "-.":
            return html[1 : i + 1]
    assert False


def pylivewirecaller(*args, **kwargs):
    
    assert "_livewire_parent_component" in kwargs
    if isinstance(kwargs["_livewire_parent_component"], Undefined):
        kwargs["_livewire_parent_component"] = None
    if len(args) == 0:
        if "key" in kwargs:

            def closure(*iargs, **ikwargs):
                if "key" not in ikwargs:
                    ikwargs["key"] = kwargs["key"]
                ikwargs["_livewire_parent_component"] = kwargs["_livewire_parent_component"]
                return pylivewirecaller(*iargs, **ikwargs)

            return closure
        else:
            assert False
    component = args[0]
    kwargs["_key"] = kwargs["key"]
    del kwargs["key"]
    component_class = models[component]
    component_obj = component_class(_flask_app=flask_app, **kwargs)
    component_obj.mount()
    component_obj.hydrate()

    if component_obj._livewire_parent_component and component_obj._livewire_parent_component.is_previously_rendered(component_obj.key):
        data = component_obj._livewire_parent_component.get_previously_rendered_data(component_obj.key)
        component_obj._livewire_parent_component.add_rendered_child(component_obj.key, data["id"], data["tag"])
        return dummy_component_element(data, component_obj.key)

    res = component_obj.render_annotated()
    if component_obj._livewire_parent_component:
        component_obj._livewire_parent_component.add_rendered_child(component_obj.key, component_obj.id, get_tag(res))
    return res


def scripts():
    listeners = {}
    for name in models:
        comp = models[name]
        if hasattr(comp, "listeners"):
            listeners[comp.__name__] = comp.listeners
    return f"""
    <script>
    listeners = {json.dumps(listeners)}
    </script>
    """


def get_dirty_inputs(old, new):
    res = []
    for k, v in new.items():
        if k not in old or old[k] != new[k]:
            res.append(k)
    return res


def register_syncer(app):
    @app.route("/livewire/sync/<component_id>", methods=["POST"])
    def handle(component_id):
        global flask_app
        clear_events()
        type_ = request.json["type"]
        data = request.json["json"]
        component_data = request.json["oldData"]
        component_class = request.json["name"]
        rendered = request.json["renderedChildren"]
        component = models[component_class].from_json(flask_app, component_data)
        component.set_previously_rendered_children(rendered)
        errors = {}
        res = None
        try:
            if type_ == "updateData":
                for k, v in data.items():
                    component_data[k] = v
                component.update(data)
            elif type_ == "callMethod":  # Security issue!
                call = data["methodName"]
                lp = call.find("(")
                if lp == -1:
                    res = getattr(component, call)()
                else:
                    name = call[:lp]
                    args = ast.literal_eval(call[lp:])
                    if type(args) != "tuple":
                        args = (args,)
                    res = getattr(component, name)(*args)
            elif type_ == "fireEvent":
                event = data["event"]
                args = data["args"]
                getattr(component, event)(*args)

        except ValidationError as e:
            errors = e.args[1]
        if res is None:
            res = ""
        new_data = component.get_data_repr()
        response_data = {
            "dom": component.render_annotated(errors),
            "dispatchEvents": get_events(),
            "newData": new_data,
            "name": component_class,
            "renderedChildren": component._rendered_children,
            "redirect": res,
            "dirtyInputs": get_dirty_inputs(component_data, new_data),
        }
        return json.dumps(response_data)

    @app.route("/livewire/upload-file", methods=["POST"])
    def upload_file():
        file_name = str(uuid.uuid4())
        f = request.files['file']
        ext = f.filename.split('.')[-1]
        dst = file_name + "." + ext
        f.save(os.path.join(app.config["WIRE_TMP_UPLOAD_DIR"], dst))
        return json.dumps({
            "filename": dst
        })



def init_pylivewire(app, root_dir):
    global render_template, flask_app
    flask_app = app
    register_syncer(app)
    load_models(root_dir)
    app.jinja_env.add_extension("pylivewire.preprocessor.PreprocessPylivewireCalls")
    app.config["WIRE_TMP_UPLOAD_DIR"] = "/tmp"
    @app.context_processor
    def inject_user():
        return dict(pylivewirecaller=pylivewirecaller, app=app, pylivewire=sys.modules[__name__])
