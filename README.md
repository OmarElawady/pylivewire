# Pylivewire

git clone repo

cd pylivewire

virtualenv venv

source ./venv/bin/activate

pip install -r requirements.txt

cd todo-on-steroids

PYTHONPATH="$PYTHONPATH:/repo/location/" FLASK_APP=todo flask run

goto localhost:5000
