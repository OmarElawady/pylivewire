from flask import session
import pickle

session_hack = {}
cache = {}
vis = set()


def is_visited(id):
    return id in vis


def is_loaded(id):
    return id in cache


def load_from_session(id):
    # print(vis)
    vis.add(id)
    if id in cache:
        return cache[id]
    else:
        res = deserialize(session_hack[id])
        if id not in cache:
            cache[id] = res
        return cache[id]


def deserialize(val):
    return pickle.loads(val)


def clear_session():
    global cache, vis
    cache = {}
    vis = set()
