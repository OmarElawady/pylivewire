from pylivewire import Component
from todo.models import Todo
from todo import db


class Item(Component):
    listeners = ["toggle_all", "filter_todo"]
    toggled = False
    display = True
    filter = "all"

    def hydrate(self):
        self.filter_todo(self.filter)

    def remove_item(self):
        self.emit("remove_item", self._key)

    def set_toggle(self, val):
        item = db.session.query(Todo).filter(Todo.id == self.key).first()
        item.done = val
        self.toggled = val
        db.session.commit()

    def toggle(self):
        self.set_toggle(not self.toggled)
        self.emit("set_item_toggle", self._key, self.toggled)

    def toggle_all(self, val):
        self.set_toggle(val)

    def filter_todo(self, filter):
        self.display = (
            filter == "all" or filter == "completed" and self.toggled or filter == "active" and not self.toggled
        )

    def hide(self, item_key):
        if self._key == item_key:
            self.display = False

    def show(self, item_key):
        if self._key == item_key:
            self.display = True

    def render(self, **kwargs):
        html = self.render_template("item_view.html")
        return html
