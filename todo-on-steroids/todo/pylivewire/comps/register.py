from pylivewire import Component
from todo.models import User
from todo import db
import re


def validate_email(field, email, error):
    pattern = "^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    if re.search(pattern, email) is None:
        error(field, "Enter a valid email address")
    elif db.session.query(User).filter(User.email == email).count() != 0:
        error(field, "Already registered")


class Register(Component):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.email = ""
        self.first_name = ""
        self.last_name = ""
        self.password = ""

    def register(self):
        self.validate({"email": {"check_with": validate_email}, "password": {"minlength": 6}})
        new_user = User(email=self.email, password=self.password, first_name=self.first_name, last_name=self.last_name)
        db.session.add(new_user)
        db.session.commit()
        return "/login"

    def render(self):
        return self.render_template("register_view.html")
