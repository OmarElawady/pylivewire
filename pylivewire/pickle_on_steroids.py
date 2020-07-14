import pickle
from pprint import pprint
import os
import io


class SmartUnpickler(pickle.Unpickler):
    def __init__(self):
        self.session_reader = SessionReader()
        super().__init__(self.session_reader)

    def load(self, obj_id):
        self.session_reader.set_session_key(obj_id)
        return super().load()


class SessionWriter:
    def __init__(self):
        self.res = b""

    def write(self, b):
        self.res += b

    def finish(self):
        session[self.session_key] = self.res
        self.res = b""

    def set_session_key(self, session_key):
        self.session_key = session_key


class SessionReader:
    def __init__(self):
        self.session_key = ""
        self.offset = 0

    def set_session_key(self, session_key):
        self.session_key = session_key
        self.offset = 0

    def read(self, size=-1):
        # print("inputs read", self.offset, size, self.session_key, session[self.session_key])
        if size == -1:
            size = len(session[self.session_key]) - self.offset
        assert self.offset + size <= len(session[self.session_key])
        size = min(size, len(session[self.session_key]) - self.offset)
        res = session[self.session_key][self.offset : self.offset + size]
        self.offset += size
        return res

    def readinto(self, b):
        assert False
        length = len(session[self.session_key])
        b[:length] = session[self.session_key]
        self.offset = length
        return length

    def readline(self, size=-1):
        # print("inputs", self.offset, size, self.session_key, session[self.session_key])
        if size == -1:
            size = len(session[self.session_key]) - self.offset
        size = min(size, len(session[self.session_key]) - self.offset)
        idx = session[self.session_key].find(b"\n", self.offset, self.offset + size)
        if idx == -1:
            res = session[self.session_key][self.offset :]
            self.offset = len(session[self.session_key])
            # print(res)
            return res
        else:
            res = session[self.session_key][self.offset : idx + 1]
            self.offset = idx + 1
            # print(res)
            return res


class SmartPickler(pickle.Pickler):
    def __init__(self):
        self.session_writer = SessionWriter()
        super().__init__(self.session_writer)

    def dump(self, obj):
        self.session_writer.set_session_key(obj.id)
        super().dump(obj)
        self.session_writer.finish()


session = {}
pr = SmartPickler()
f = io.BytesIO()
spr = pickle.Pickler(f)


class A:
    pass


class B:
    pass


a = A()
b = B()
a.b_ref = b
b.a_ref = a
a.name = "a"
b.name = "b"
a.id = "1"
b.id = "2"
pr.dump(a)
pr.dump(b)
spr.dump(a)
spr.dump(b)
print(f.read())
upr = SmartUnpickler()
a1 = upr.load("1")
b1 = upr.load("2")
pprint(session)
pprint(a.__dict__)
pprint(b.__dict__)
pprint(a1.__dict__)
