from flask import Blueprint
from flask_login import login_required

from ..controllers import dashboard_controller as c

bp = Blueprint("dashboard", __name__)

bp.add_url_rule("/dashboard", "index", login_required(c.index))
bp.add_url_rule("/dashboard/stats", "stats", login_required(c.stats))
