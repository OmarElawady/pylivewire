from flask import Flask, render_template, session
import pylivewire
from functools import partial


app = Flask(__name__)
app.secret_key = "any random string"

render_template = partial(render_template, app=app, pylivewire=pylivewire)


pylivewire.init_pylivewire(app, "todo")


@app.route("/")
def index():
    session["comps"] = dict()
    print("Session: ", session)
    return render_template("index.html")


if __name__ == "__main__":
    app.run()
