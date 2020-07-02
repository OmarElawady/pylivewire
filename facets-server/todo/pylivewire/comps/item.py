from flask import render_template
import os
import json
from pylivewire import Component

VIEWS_DIR = "views"


class Item(Component):
    text = ""

    def render(self, **kwargs):
        html = render_template("item_view.html", text=self.text)
        pos = -1
        for i, c in enumerate(html):
            if c not in "<-._" and not c.isalnum():
                pos = i
                break
        result = html[0:pos] + f' wire:id="{self.id}" ' + html[pos:]
        print(result)
        return result
