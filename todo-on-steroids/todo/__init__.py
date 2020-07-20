import os
from flask import Flask, render_template, render_template_string, request, redirect, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_required, logout_user, current_user
from .database import init_db
from .config import ConfigClass
import pylivewire
from flask_turbolinks import turbolinks
# Create Flask app load app.config
app = Flask(__name__)
app.config.from_object(__name__ + ".ConfigClass")
turbolinks(app)

# Initialize Flask-SQLAlchemy
db = SQLAlchemy(app)

from todo.models import User, Todo

# Create all database tables
db.create_all()


login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login_page"
pylivewire.init_pylivewire(app, "todo")


def create_users():
    if db.session.query(User).count() != 0:
        return
    users = [
        ("Omar", "Khaled"),
        ("Ahmed", "Thabet"),
        ("Said", "Saad"),
        ("John", "Q"),
        ("Brad", "Pitt"),
        ("Ahmed", "Saad"),
        ("Sara", "Saad"),
    ]
    for user in users:
        new_user = User(
            email=f"{user[0]}.{user[1]}@gmail.com", password="123456", first_name=user[0], last_name=user[1]
        )
        db.session.add(new_user)
    admin = User(email=f"admin@gmail.com", password="123456", first_name="Omar", last_name="Elawady", is_admin=True)
    db.session.add(admin)

    db.session.commit()


create_users()


@login_manager.user_loader
def load_user(user_id):
    return User.query.filter(User.id == user_id).first()


# The Home page is accessible to anyone
@app.route("/")
def home_page():
    return redirect("/todos", code=302)


# The login page is accessible to anyone
@app.route("/login")
def login_page():
    return render_template("login.html")


# The login page is accessible to anyone
@app.route("/logout")
def logout():
    logout_user()
    return redirect("/login")

# The register page is accessible to anyone
@app.route("/register")
def register_page():
    return render_template("register.html")


# The register page is accessible to anyone
@app.route("/admin")
@login_required  # User must be authenticated
def admin_page():
    if not current_user.is_admin:
        return redirect("/login", code=302)
    return render_template("admin.html")


# The todos page is only accessible to authenticated users via the @login_required decorator
@app.route("/todos")
@login_required  # User must be authenticated
def member_page():
    return render_template("todos.html", first_name=current_user.first_name, last_name=current_user.last_name)


@app.route("/test")
def test():
    return render_template("test.html")

@app.route('/photos/<path:path>')
def send_photos(path):
    return send_from_directory('photos', path)

# Start development web server
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
