from flask import Flask, request 
app = Flask(__name__)

@app.route('/', methods=["POST"])
def hello_world_pos():
  print("omar" in request.files)
  return "123"


@app.route('/', methods=["GET"])
def hello_world():
    return '<html><body><form method="post" action="/" enctype="multipart/form-data"><input type="file" name="omar" /><input type="submit" value="submit" /></form></body></html>'
