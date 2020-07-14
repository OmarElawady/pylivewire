import pickle


def print_component_from_string(ss):
    obj = pickle.loads(ss)
    print_component(obj)


def print_component(obj):
    obj.print()
