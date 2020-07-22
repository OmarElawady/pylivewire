from pylivewire import Component
from todo.models import User
from todo import db

class Monitor(Component):
    last_add_user_id = 0

    def mount(self):
        self.last_add_user_id = db.session.query(User).order_by(User.id.desc()).first().id

    def refresh(self):
        users_added = db.session.query(User).filter(User.id > self.last_add_user_id)
        for user in users_added:
            self.emit("notify", f"Added user {user.first_name} {user.last_name}")
            self.emit("user_added")
            self.last_add_user_id = max(self.last_add_user_id, user.id)

    def render(self):
        return self.render_template("monitor_view.html")
