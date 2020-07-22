import os
from shutil import copyfile
TMP_PREFIX = "livewire-tmp-file:"
class File:
    def __init__(self, val, flask_app):
        self.filename = None
        self.dirname = None
        self.flask_app = flask_app
        if val.startswith(TMP_PREFIX):
            self.filename = val[len(TMP_PREFIX):]
            self.dirname = flask_app.config["WIRE_TMP_UPLOAD_DIR"]
        else:
            assert False
    
    def save(self, path):
        print(self.filename, self.dirname)
        src = os.path.join(self.dirname, self.filename)
        path = os.path.join(self.flask_app.root_path, path)
        copyfile(src, path)
        return path

    def get_ext(self):
        if not '.' in self.filename:
            return ""
        return self.filename.split('.')[-1]

    def read(self):
        with open(os.path.join(self.dirname, self.filename)) as f:
            return f.read()

    def to_json(self):
        return f"{TMP_PREFIX}{self.filename}"