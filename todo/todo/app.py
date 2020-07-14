from flask import Flask, render_template, session
import pylivewire
from functools import partial
from flask_session import Session

app = Flask(__name__)
app.secret_key = b'_5#y2L"F4Q8z\n\xec]/'
app.config.from_object("config.Config")
sess = Session()
sess.init_app(app)
# render_template = partial(render_template, app=app, pylivewire=pylivewire, pylivewirecaller=pylivewire.pylivewirecaller)


pylivewire.init_pylivewire(app, "todo")


@app.context_processor
def inject_user():
    return dict(pylivewirecaller=pylivewire.pylivewirecaller, app=app, pylivewire=pylivewire)


@app.route("/")
def index():
    session.clear()
    return render_template("index.html")


if __name__ == "__main__":
    app.run()
