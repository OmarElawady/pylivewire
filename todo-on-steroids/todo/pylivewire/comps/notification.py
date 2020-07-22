from pylivewire import Component


class Notification(Component):
    listeners = ["notify"]
    messages = []
    messages_id = []

    def notify(self, message):
        self.messages.append(message)
        self.messages_id.append(str(self.generate_random_id()))

    def remove(self, id):
        idx = -1
        for i, e in enumerate(self.messages_id):
            if e == id:
                idx = i
                break
        assert idx != -1
        del self.messages[idx]
        del self.messages_id[idx]
    
    def render(self):
        return self.render_template("notification_view.html")
