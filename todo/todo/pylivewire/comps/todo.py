from pylivewire import Component, from_json, jsonify, load_component_object
from .item import Item
from flask import render_template


class TODOList(Component):
    listeners = ["remove_item", "refresh_todolist", "set_item_toggle"]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.toadd = ""
        self.items = []
        self.toggled = []
        self.filter = None
        self.displayed = []

    def add_item(self):
        self.validate({"toadd": {"minlength": 5}})
        self.items.append(self.toadd.upper())
        self.toggled.append(False)
        self.displayed.append(self.filter is None or self.filter == False)

    def find_item(self, item_key):
        for i, e in enumerate(self.items):
            if e + str(self.displayed[i]) == item_key:
                return i
        assert False
        return -1

    def remove_item(self, item_key):
        item = self.find_item(item_key)
        del self.items[item]
        del self.toggled[item]
        del self.displayed[item]

    def set_item_toggle(self, item_key, val):
        item = self.find_item(item_key)
        self.toggled[item] = val
        self.displayed[item] = self.filter is None or self.filter == val

    def toggle_all(self):
        all_toggled = True
        for t in self.toggled:
            all_toggled = all_toggled and t
        to_set = False if all_toggled else True
        self.toggled = [to_set for i in self.toggled]
        self.emit("toggle_all", to_set)

    def refresh_todolist(self):
        pass

    def filter_all(self):
        self.filter = None
        self.adjust_visibility()

    def filter_active(self):
        self.filter = False
        self.adjust_visibility()

    def filter_completed(self):
        self.filter = True
        self.adjust_visibility()

    def adjust_visibility(self):
        for i, e in enumerate(self.items):
            if self.toggled[i] != self.filter and self.filter != None:
                self.displayed[i] = False
            else:
                self.displayed[i] = True

    def clear_completed(self):
        self.items = [e for i, e in enumerate(self.items) if not self.toggled[i]]
        self.displayed = [e for i, e in enumerate(self.displayed) if not self.toggled[i]]
        self.toggled = [e for i, e in enumerate(self.toggled) if not self.toggled[i]]

    def count_left(self):
        res = len(self.items)
        for e in self.toggled:
            if e:
                res -= 1
        return res

    def render(self, **kwargs):
        empty = len(self.items) == 0
        return self.render_template("list_view.html", count=self.count_left(), empty=empty)
