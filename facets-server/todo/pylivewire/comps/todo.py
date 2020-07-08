from pylivewire import Component, from_json, jsonify, load_component_object
from .item import Item
from flask import render_template


class TODOList(Component):
    def __init__(self, id, **kwargs):
        super().__init__(id, **kwargs)
        self.items = []
        self.toadd = ""
        self.toggled = []
        self.filter = None

    def add_item(self):
        self.validate({"toadd": {"minlength": 2}})
        self.items.append(load_component_object("Item", text=self.toadd, parent=self))
        self.toggled.append(False)

    def find_item(self, item_id):
        for i, e in enumerate(self.items):
            if e.id == item_id:
                return i
        return -1

    def remove_item(self, item_id):
        idx = self.find_item(item_id)
        del self.items[idx]
        del self.toggled[idx]

    def toggle_all(self):
        all_toggled = True
        for t in self.toggled:
            all_toggled = all_toggled and t
        to_set = False if all_toggled else True
        for i in range(len(self.toggled)):
            self.toggled[i] = to_set

    def toggle(self, item_id):
        idx = self.find_item(item_id)
        self.toggled[idx] = not self.toggled[idx]

    def edit(self, item_id):
        idx = self.find_item(item_id)
        self.items[idx].edit()

    def filter_all(self):
        self.filter = None

    def filter_active(self):
        self.filter = False

    def filter_completed(self):
        self.filter = True

    def clear_completed(self):
        self.items = [e for i, e in enumerate(self.items) if not self.toggled[i]]
        self.toggled = [e for i, e in enumerate(self.toggled) if not self.toggled[i]]

    def count_left(self):
        res = len(self.toggled)
        for e in self.toggled:
            if e:
                res -= 1
        return res

    def render(self, **kwargs):
        items = self.items
        toggled = self.toggled
        if self.filter is not None:
            items = [e for i, e in enumerate(items) if toggled[i] == self.filter]
            toggled = [e for i, e in enumerate(toggled) if toggled[i] == self.filter]
        empty = len(self.items) == 0
        return self.render_template("list_view.html", count=self.count_left(), empty=empty)
