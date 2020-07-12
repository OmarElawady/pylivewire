from flask import render_template
import os
import json
from pylivewire import Component
import datetime

VIEWS_DIR = "views"


class Item(Component):
    listeners = ["toggle_all"]

    def __init__(self, id, **kwargs):
        super().__init__(id, **kwargs)
        self.toggled = False

    def remove_item(self):
        self.emit("remove_item", self.id)

    def toggle(self):
        self.toggled = not self.toggled
        self.emit("refresh_todolist")

    def toggle_all(self, val):
        self.toggled = val
        # self.emit("refresh_todolist")
        # print("Toggling to", self.toggled)
        # print(self.toggled)

    def print(self):
        print("------------------------------------------------------------------------------")
        print("id", self.id)
        print("toggled", self.toggled)
        print("text", self.text)
        print("------------------------------------------------------------------------------")

    def edit(self):
        self.editing = True

    def render(self, **kwargs):
        html = self.render_template("item_view.html")
        return html
