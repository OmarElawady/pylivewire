from pylivewire import Component, from_json, jsonify, load_component_object
from .item import Item
from flask import render_template


class TODOList(Component):
    listeners = ["remove_item", "refresh_todolist"]

    def __init__(self, id, **kwargs):
        super().__init__(id, **kwargs)
        self.items = []
        self.toadd = ""
        # self.toggled = []
        self.filter = None

    def add_item(self):
        # self.validate({"toadd": {"minlength": 5}})
        self.items.append(load_component_object("Item", text=self.toadd))
        # self.toggled.append(False)

    def find_item(self, item_id):
        for i, e in enumerate(self.items):
            if e.id == item_id:
                return i
        return -1

    def remove_item(self, item_id):
        idx = self.find_item(item_id)
        del self.items[idx]

    def print(self):
        print("------------------------------------------------------------------------------")
        print("TODOList")
        print("id", self.id)
        print("items:")
        for item in self.items:
            print(item.id, item.text, item.toggled)
        print("filter", self.filter)
        print("toadd", self.toadd)
        print("------------------------------------------------------------------------------")

    def toggle_all(self):
        all_toggled = True
        for t in self.items:
            all_toggled = all_toggled and t.toggled
            # print(t.toggled)
        to_set = False if all_toggled else True
        # print("to_set", to_set)
        self.emit("toggle_all", to_set)
        self.emit("refresh_todolist")

    def refresh_todolist(self):
        pass

    # def toggle(self, item_id):
    #     idx = self.find_item(item_id)
    #     self.items[idx].toggle()

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
        self.items = [e for e in self.items if not e.toggled]

    def count_left(self):
        res = len(self.items)
        for e in self.items:
            if e.toggled:
                res -= 1
        return res

    def render(self, **kwargs):
        # items = self.items
        # toggled = self.toggled
        # if self.filter is not None:
        #     items = [e for i, e in enumerate(items) if toggled[i] == self.filter]
        #     toggled = [e for i, e in enumerate(toggled) if toggled[i] == self.filter]
        empty = len(self.items) == 0
        return self.render_template("list_view.html", count=self.count_left(), empty=empty)
