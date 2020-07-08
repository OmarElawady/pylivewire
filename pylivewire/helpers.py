import json


def jsonify(x):
    result = None
    try:
        result = x.to_json()
    except Exception:
        result = x
    return result


def from_json(cls, v):
    try:
        return cls.from_json(v)
    except Exception:
        return cls(v)


def is_jsonable(x):
    try:
        json.dumps(x)
    except (TypeError, OverflowError):
        try:
            x.to_json()
        except Exception:
            return False
    return True
