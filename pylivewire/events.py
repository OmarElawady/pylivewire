to_be_triggered = []


def add_event(event, *args):
    print(args)
    to_be_triggered.append({"event": event, "args": args})


def get_events():
    return to_be_triggered


def clear_events():
    global to_be_triggered
    to_be_triggered = []
