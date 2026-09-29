from flask import Blueprint

from ..controllers import event_controller as c
from ..utils.permissions import permission_required as perm

bp = Blueprint("events", __name__, url_prefix="/events")

bp.add_url_rule("", "index", perm("event.view")(c.index))
bp.add_url_rule("/create", "create", perm("event.create")(c.create), methods=["GET", "POST"])
bp.add_url_rule("/<int:event_id>", "show", perm("event.view")(c.show))
bp.add_url_rule("/<int:event_id>/stats", "stats", perm("event.view")(c.stats))
bp.add_url_rule("/<int:event_id>/edit", "edit", perm("event.edit")(c.edit), methods=["GET", "POST"])
bp.add_url_rule("/<int:event_id>/delete", "delete", perm("event.delete")(c.delete), methods=["POST"])
bp.add_url_rule("/<int:event_id>/rsvp", "rsvp", perm("rsvp.view")(c.rsvp))
bp.add_url_rule("/<int:event_id>/checkins", "checkins", perm("event.view")(c.checkins))
bp.add_url_rule("/<int:event_id>/checkins/live", "checkins_live", perm("event.view")(c.checkins_live))
