from flask import make_response, render_template, request, session, url_for
from flask_login import current_user

from ..repositories import checkin_repository, event_repository, guest_repository
from ..services import checkin_service
from ..utils.permissions import can_access_event
from ._helpers import is_htmx, load_event

SESSION_KEY = "checkin_event_id"


def _selected_event():
    """Event chosen on the scanner page (request param, else remembered in session)."""
    requested = request.values.get("event_id", type=int)
    if requested:
        event = load_event(requested)  # 404/403 when missing or not accessible
    else:
        event = event_repository.get(session.get(SESSION_KEY) or 0)
        if event is None or not can_access_event(current_user, event):
            session.pop(SESSION_KEY, None)
            return None
    session[SESSION_KEY] = event.id
    return event


def _device_info():
    return (request.headers.get("User-Agent") or "")[:255]


def _result_partial(result, event):
    response = make_response(render_template("checkin/_result.html", result=result, event=event))
    if result.ok and result.data.get("checkin"):
        response.headers["HX-Trigger"] = "checkin-done"  # refreshes the recent list
    return response


def index():
    events = [e for e in event_repository.list_for_user(current_user) if e.status != "cancelled"]
    event = _selected_event()
    if event is None and len(events) == 1:
        event = events[0]
        session[SESSION_KEY] = event.id
    ctx = {"events": events, "event": event}
    if event:
        ctx["stats"] = checkin_service.stats(event)
        ctx["recent"] = checkin_repository.recent(event.id, limit=10)
    return render_template("checkin/index.html", **ctx)


def scan():
    event = _selected_event()
    code = request.form.get("code", "")
    guest = checkin_service.find_guest(code)
    event_id = event.id if event else None
    if request.form.get("auto_confirm"):
        result = checkin_service.confirm(guest, event_id, current_user, device_info=_device_info())
    else:
        result = checkin_service.verify(guest, event_id, current_user)
    return _result_partial(result, event)


def lookup_token(token):
    """Target of the QR URL when scanned with a phone's native camera."""
    event = _selected_event()
    guest = guest_repository.get_by_checkin_token(token)
    result = checkin_service.verify(guest, event.id if event else None, current_user)
    return render_template("checkin/verify.html", result=result, event=event or (guest.event if guest else None))


def confirm(token):
    event = _selected_event()
    guest = guest_repository.get_by_checkin_token(token)
    result = checkin_service.confirm(guest, event.id if event else None, current_user,
                                     device_info=_device_info(), notes=request.form.get("notes"))
    if is_htmx():
        return _result_partial(result, event)
    return render_template("checkin/verify.html", result=result, event=event or (guest.event if guest else None))


def recent():
    event = _selected_event()
    if event is None:
        return ""
    return render_template("checkin/_recent.html", event=event, stats=checkin_service.stats(event),
                           recent=checkin_repository.recent(event.id, limit=10),
                           poll_url=url_for("checkin.recent", event_id=event.id))
