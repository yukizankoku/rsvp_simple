from datetime import date

from flask import render_template, url_for
from flask_login import current_user

from ..repositories import event_repository
from ..services import rsvp_service
from ._helpers import is_htmx


def _context():
    events = event_repository.list_for_user(current_user)
    event_ids = [e.id for e in events if e.status != "cancelled"]
    upcoming = sorted((e for e in events if e.event_date >= date.today() and e.status != "cancelled"),
                      key=lambda e: e.event_date)[:5]
    return {"stats": rsvp_service.dashboard(event_ids), "events": events, "upcoming": upcoming}


def index():
    return render_template("dashboard/index.html", **_context())


def stats():
    ctx = _context()
    return render_template("partials/stat_cards.html", stats=ctx["stats"],
                           poll_url=url_for("dashboard.stats"), partial=is_htmx())
