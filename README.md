# Pylivewire

git clone repo

cd pylivewire

virtualenv venv

source ./venv/bin/activate

pip install -r requirements.txt

cd todo-on-steroids

PYTHONPATH="$PYTHONPATH:/repo/location/" FLASK_APP=todo flask run

goto localhost:5000


## Docs

### Components:

The whole project revolves around the idea of a component. The component is a python object of a class that inherits the Component class.

Example:

```python
from pylivewire import Component # assume this's included in all subsequent examples.

class UserComponent(Component):

  def render(self): # assume that this method is provided as this when ommited.
    return self.render_template("user_view.html")

```


#### Fields:

The component fields are any property found under self. You can specify the default value for fields by declaring them as class properties. They are copied for each component, so you don't need to worry about references.

Example:

```python
class UserComponent(Component):
  # default values for the fields
  username = ""
  password = ""
  is_admin = false
  friends = ["khaled"]
  
  def render(self):
    self.friends_count = len(friends) # adding fields dynamically at any point is also allowed
    return self.render_template("user_view.html")
```

#### Events:

The compoent specefies the events it listens on by declaring a class property `listeners`. Currently, the listeners is the same for the objects of the same component and it can't be changed.

Firing events is done using methods. The first is to call `$emit('event_name', ..args)` in the frontend. The second is to call `self.emit("event_name", *args)` in the component object at the backend.

Example:

```python
class UserComponent(Component):
  is_admin = False
  listeners = ["change_user_type"]

  def change_user_type(self, user_type): # False for normal, True for admin
    self.is_admin = True
```

#### Rendering:

Each component must provide a mehtod called `render` that returns a string that will represent it in the html page. This string can't be arbitrary since there're some annotations that must be added to it to allow the working of pylivewire.

The `render` method must call `self.render_template("comp_view.html")` (note: not the same as jinja's render_template). This mehtod annotates the root element with the appropriate properties.

The view of the component is declared in the app's templates directory as a normal jinja template. It must consist only of a single root element.

The view has access by default to the component fields and a special object `errors` to facilitate access to validation errors (more on that later). Also you can provide additional variables just like any other jinja template.

#### Nesting elements and components' interaction:

The component's root element must have "wire:id" property that is unique across the whole page, it's set by default by pylivewire so the user doesn't need to worry about it.

The components can be nested, but each component is responsible only for its rendereding and its data.

When the page is loaded or a new child component is added, the parent renders it and initializes a new component object. For subsequent renderings of the parent component, the child component is ignored. Therefore, to rerender an component a request must come out of it (whether it's a syncing, method call, or event request).

The component keeps track of its rendered child using their "wire:key" property. This property must be unique inside the component (not necessarily unique across its descendents). It's set by default based on its line number in the template but can be overriden by the user. That's why when there's a possibility of multiple elements being rendered on the same position (in the template), for example in a for loop or a multi stage form, a unique key must be provided to distinguish it.

When anything interesting happens in a component (later on what's interesting), a request is sent to the server with the appropriate payload. The server processes the request and reponds with the data along with some other meta data used to update the component.


### Interaction between client and server:

Currently, there're three interesting actions that triggers a request from a component:

1. A wired element is changed, a syncing payload is sent to the server with the updated value.

2. A method is called as a result of an event (e.g. click, mouseover, ...), a method payload is sent with its arguments.

3. An event is fired that the component listens on, an event firing payload is sent with the arguemnts specified by the event emmiter.

The only method to pass data between components is events.

#### Request payload:

The request payload is a json object consisting of the following fields:

1. name: The name of the class of the component.
2. oldData: The values of the component's current data fields.
3. type: The type of the payload. One of: updateData, callMethod, fireEvent.
4. rendered_children: List of the keys of the direct children rendered components (Those are not rerendered).
5. json: The actual data of the payload. Depends on the type.

##### json payload information:

updateData: {

  field_name: field_value

}

callMethod: {

  methodName: method_name,
  args: [] // list of args, not implemented!

}

fireEvent: {

  event: event_name,
  args = []

}

##### Response payload:

A JSON object consisting of the following fields:

1. dom: The new dom generated by the component.

2. dispatchEvents: A list of events to be dispatched.

3. newData: The new fields' data of the component.

4. name: The component class name.

5. rendered_children: List of rendered child components.

6. redirect: If not empty the link to follow.

7. dirtyInputs: The diff between old and new data. (Why not in the frontend?)


