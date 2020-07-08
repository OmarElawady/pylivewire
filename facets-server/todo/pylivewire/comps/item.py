from flask import render_template
import os
import json
from pylivewire import Component
import datetime

VIEWS_DIR = "views"


class Item(Component):
    def __init__(self, id, **kwargs):
        super().__init__(id, **kwargs)
        self.toggled = False

    def remove_item(self):
        self.parent.remove_item(self.id)

    def toggle(self):
        self.toggled = not self.toggled
        self.parent.toggle(self.id)

    def edit(self):
        self.editing = True

    def render(self, **kwargs):
        html = self.render_template("item_view.html")
        return html
