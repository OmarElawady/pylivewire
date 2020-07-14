from pylivewire import Component


class Notification(Component):
    listeners = ["notify"]
    photo = ""

    def render(self):
        print(self.photo)
        return self.render_template("notification_view.html")
