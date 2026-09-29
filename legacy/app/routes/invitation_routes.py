from flask import Blueprint

from ..controllers import invitation_controller as c
from ..utils.rate_limit import rate_limit

bp = Blueprint("invitation", __name__, url_prefix="/i")

bp.add_url_rule("/<token>", "show", rate_limit(120, 60, scope="invitation")(c.show))
bp.add_url_rule("/<token>/rsvp", "rsvp", rate_limit(10, 60, scope="rsvp")(c.submit_rsvp), methods=["POST"])
bp.add_url_rule("/<token>/qr", "qr", rate_limit(60, 60, scope="invitation_qr")(c.qr))
bp.add_url_rule("/<token>/calendar.ics", "calendar", rate_limit(30, 60, scope="invitation_ics")(c.calendar_ics))
