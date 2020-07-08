from .session import load_from_session
from .pylivewire import rerender_component

listeners = {}


def fire(event, payload):
    for listener in listeners.items:
        component_obj = load_from_session(listener)
        component_obj.fire(event, payload)
        rerender_component(component_obj)


def add_listener(event, component_id):
    if event not in listeners:
        listeners[event] = []
    listeners[event].append(component_id)
