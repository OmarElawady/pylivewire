from pylivewire import Component
from todo.models import User
from todo import db
from flask_login import login_user


class Login(Component):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.email = ""
        self.password = ""
        self.login_message = ""

    def login(self):
        query = db.session.query(User).filter(User.email == self.email, User.password == self.password)
        if query.count() == 0:
            self.login_message = "Invalid username or password"
        else:
            self.login_message = "Logined Successfully!"
            login_user(query.first())
            return "/todos"

    def render(self):
        return self.render_template("login_view.html")
