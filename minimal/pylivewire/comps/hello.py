from pylivewire import Component


class HelloWorld(Component):
    message = ""

    def render(self, **kwargs):
        capitalized = self.message.upper()
        html = self.render_template("hello_world_view.html", capitalized=capitalized)
        return html
