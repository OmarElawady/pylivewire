from flask import Flask, render_template
import pylivewire

app = Flask(__name__)
pylivewire.init_pylivewire(app, "app")

@app.route("/")
def default_page():
    return render_template("index.html")