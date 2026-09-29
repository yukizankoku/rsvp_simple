from urllib.parse import urlparse

from flask import abort, request
from flask_login import current_user

from ..repositories import event_repository, guest_repository
from ..utils.permissions import can_access_event


def is_htmx():
    return request.headers.get("HX-Request") == "true"


def load_event(event_id):
    """Fetch an event and enforce that the current user may access it."""
    event = event_repository.get(event_id)
    if event is None:
        abort(404)
    if not can_access_event(current_user, event):
        abort(403)
    return event


def load_guest(guest_id):
    guest = guest_repository.get(guest_id)
    if guest is None:
        abort(404)
    if not can_access_event(current_user, guest.event):
        abort(403)
    return guest


def safe_next(target, fallback):
    """Only allow relative redirects to this site."""
    if not target:
        return fallback
    parsed = urlparse(target)
    if parsed.scheme or parsed.netloc or not target.startswith("/") or target.startswith("//"):
        return fallback
    return target
