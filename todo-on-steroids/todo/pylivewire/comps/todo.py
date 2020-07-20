from pylivewire import Component
from todo.models import Todo, User
from flask_login import current_user
from todo import db
from time import time

def fancy_validate_toadd(field, toadd, error):
    l = len(toadd)
    if l < 4:
        error(field, f"The todo must be larger than 4, {l} is not.")


class TODOList(Component):
    listeners = ["remove_item", "refresh_todolist", "set_item_toggle", "select_user"]
    toadd = ""
    filter = "all"
    items = []
    items_id = []
    toggled = []
    user_id = -1
    photo = ""
    avatarURL = "https://gravatar.com/avatar/2c6e37e56828d59b5716a91eea7c8d77?s=200&d=robohash&r=x"
    
    def mount(self, *args, **kwargs):
        if self.user_id == -1:
            self.user_id = current_user.id
        self.populate_from_db()

    def updated_photo(self, **kwars):
        ext = self.photo.get_ext()
        path = f"photos/{self.user_id}.{ext}"
        self.photo.save(path)
        self.avatarURL = path
        user = db.session.query(User).filter(User.id == self.user_id).first()
        user.photo = path
        db.session.commit()
    
    def say(self):
        self.toadd = "Hello world"

    def updated_toadd(self, **kwargs):
        self.validate({"toadd": {"check_with": fancy_validate_toadd, "maxlength": 50}})

    def updated_filter(self, **kwargs):
        self.emit("filter_todo", self.filter)

    def populate_from_db(self):
        todos = db.session.query(Todo).filter(Todo.user_id == self.user_id)
        self.items = []
        self.items_id = []
        self.toggled = []
        self.avatarURL = db.session.query(User).filter(User.id == self.user_id).first().photo
        for todo in todos:
            self.items.append(todo.content)
            self.items_id.append(str(todo.id))
            self.toggled.append(todo.done)

    def add_item(self):
        self.validate({"toadd": {"check_with": fancy_validate_toadd, "maxlength": 50}})
        new_item = Todo(content=self.toadd, done=False, user_id=self.user_id)
        db.session.add(new_item)
        db.session.commit()
        self.items.append(self.toadd)
        self.items_id.append(str(new_item.id))
        self.toggled.append(False)
        self.toadd = ""

    def select_user(self, user_id):
        self.user_id = user_id
        self.populate_from_db()

    def find_item(self, item_key):
        for i, e in enumerate(self.items):
            if self.items_id[i] == item_key:
                return i
        # assert False
        return -1

    def remove_item(self, item_key):
        item = self.find_item(item_key)
        if item == -1:
            return
        entry = db.session.query(Todo).filter(Todo.id == self.items_id[item]).first()
        db.session.delete(entry)
        db.session.commit()
        del self.items[item]
        del self.toggled[item]
        del self.items_id[item]

    def set_item_toggle(self, item_key, val):
        item = self.find_item(item_key)
        self.toggled[item] = val

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
        self.filter = "all"
        self.adjust_visibility()

    def filter_active(self):
        self.filter = "active"
        self.adjust_visibility()

    def filter_completed(self):
        self.filter = "completed"
        self.adjust_visibility()

    def adjust_visibility(self):
        self.emit("filter_todo", self.filter)

    def clear_completed(self):
        self.items = [e for i, e in enumerate(self.items) if not self.toggled[i]]
        self.items_id = [e for i, e in enumerate(self.items_id) if not self.toggled[i]]
        self.toggled = [e for i, e in enumerate(self.toggled) if not self.toggled[i]]

    def count_left(self):
        res = len(self.items)
        for e in self.toggled:
            if e:
                res -= 1
        return res

    def render(self, **kwargs):
        empty = len(self.items) == 0
        return self.render_template(
            "todos_view.html",
            count=self.count_left(),
            empty=empty,
            first_name=current_user.first_name,
            last_name=current_user.last_name,
            now=time
        )
