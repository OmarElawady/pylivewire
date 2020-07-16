# -*- coding: utf-8 -*-
import re

from jinja2.exceptions import TemplateSyntaxError
from jinja2.ext import Extension
from jinja2.lexer import count_newlines
from jinja2.lexer import Token

# import jinja2.ext.do


_outside_re = re.compile(r"\\?(gettext|_)\(")
_inside_re = re.compile(r"\\?[()]")


class PreprocessPylivewireCalls(Extension):
    """This extension implements support for inline gettext blocks::

        <h1>_(Welcome)</h1>
        <p>_(This is a paragraph)</p>

    Requires the i18n extension to be loaded and configured.
    Finite automota:
    inside_jinja
    
    """

    LIVEWIRENAME = "pylivewirecaller"

    def filter_stream(self, stream):
        inside_jinja = False
        token_count = 0
        for token in stream:
            # print(token.type, token.value)
            lineno = token.lineno
            token_count += 1
            if token.type == "variable_begin":
                inside_jinja = True
                yield token
            elif token.type == "variable_end":
                inside_jinja = False
                yield token
            elif inside_jinja:
                if token.type == "name" and token.value == self.LIVEWIRENAME:
                    yield token
                    yield Token(lineno, "lparen", "(")
                    yield Token(lineno, "name", "key")
                    yield Token(lineno, "assign", "=")
                    yield Token(lineno, "string", f"wire:{lineno}")
                    yield Token(lineno, "comma", ",")
                    yield Token(lineno, "name", "_livewire_parent_component")
                    yield Token(lineno, "assign", "=")
                    yield Token(lineno, "name", "obj")
                    yield Token(lineno, "rparen", ")")
                else:
                    yield token
            else:
                yield token
