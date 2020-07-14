from flask import render_template
import os
import json
from pylivewire import Component
import datetime

VIEWS_DIR = "views"


class Item(Component):
    listeners = ["toggle_all"]
    # toggled = False

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if "toggled" not in kwargs:
            self.toggled = False
        if "display" not in kwargs:
            self.display = True

    def remove_item(self):
        self.emit("remove_item", self._key)

    def toggle(self):
        self.toggled = not self.toggled
        self.emit("set_item_toggle", self._key, self.toggled)

    def toggle_all(self, val):
        self.toggled = val

    def hide(self, item_key):
        if self._key == item_key:
            self.display = False

    def show(self, item_key):
        if self._key == item_key:
            self.display = True

    def render(self, **kwargs):
        html = self.render_template("item_view.html")
        # print(self.toggled)
        return html
