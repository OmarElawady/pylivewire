from todo import db
from flask_login import UserMixin


class User(db.Model, UserMixin):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)

    # User authentication information. The collation='NOCASE' is required
    # to search case insensitively when USER_IFIND_MODE is 'nocase_collation'.
    email = db.Column(db.String(255, collation="NOCASE"), nullable=False, unique=True)
    password = db.Column(db.String(255), nullable=False, server_default="")

    # User information
    first_name = db.Column(db.String(100, collation="NOCASE"), nullable=False, server_default="")
    last_name = db.Column(db.String(100, collation="NOCASE"), nullable=False, server_default="")

    is_admin = db.Column(db.Boolean(), nullable=False, default=False)
