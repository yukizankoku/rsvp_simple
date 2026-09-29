from flask import Blueprint

from ..controllers import checkin_controller as c
from ..utils.permissions import permission_required as perm

bp = Blueprint("checkin", __name__, url_prefix="/checkin")

checkin = perm("checkin.perform")

bp.add_url_rule("", "index", checkin(c.index))
bp.add_url_rule("/scan", "scan", checkin(c.scan), methods=["POST"])
bp.add_url_rule("/recent", "recent", checkin(c.recent))
bp.add_url_rule("/<token>", "lookup_token", checkin(c.lookup_token))
bp.add_url_rule("/<token>/confirm", "confirm", checkin(c.confirm), methods=["POST"])
