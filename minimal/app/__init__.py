from flask import Flask
import pylivewire

app = Flask(__name__)
pylivewire.init_pylivewire(app, "app")