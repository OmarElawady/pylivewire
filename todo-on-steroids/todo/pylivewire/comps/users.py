from pylivewire import Component
from todo.models import User
from todo import db


class UserList(Component):
    selected_user = 0
    current_page = 1

    def select_user(self, user_id):
        self.selected_user = user_id
        self.emit("select_user", user_id)

    def delete(self, user_id):
        db.session.query(User).filter(User.id == user_id).delete()
        db.session.commit()

        self.users = [v for v in self.users if v["id"] != user_id]

    def select_page(self, page):
        self.current_page = page

    def render(self):
        users = db.session.query(User).paginate(per_page=5, page=self.current_page, error_out=True)
        cnt = db.session.query(User).count()
        return self.render_template("users_view.html", users=users, cnt=cnt)
