from . import app, db
from .models import User
from flask_user import login_required
from flask import render_template_string
from flask_user import UserManager

# The Home page is accessible to anyone
@app.route("/")
def home_page():
    # String-based templates
    return render_template_string(
        """
            1
        """
    )


user_manager = UserManager(app, db, models.User)

# The Members page is only accessible to authenticated users via the @login_required decorator
@app.route("/members")
@login_required  # User must be authenticated
def member_page():
    # String-based templates
    return render_template_string(
        """
        2
        """
    )
