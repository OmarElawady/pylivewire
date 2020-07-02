from todo.app import app
import os
import pylivewire

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run("0.0.0.0", port=port)
