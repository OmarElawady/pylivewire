from flask import session
import pickle

cache = {}
vis = set()


def is_visited(id):
    return id in vis


def is_loaded(id):
    return id in cache


def load_from_session(id):
    vis.add(id)
    if id in cache:
        return cache[id]
    else:
        res = deserialize(session[id])
        if id not in cache:
            cache[id] = res
        return cache[id]


def deserialize(val):
    return pickle.loads(val)
