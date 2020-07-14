from todo import db


class Todo(db.Model):
    __tablename__ = "todos"
    id = db.Column(db.Integer(), primary_key=True)
    content = db.Column(db.String(50))
    done = db.Column(db.Boolean())
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
