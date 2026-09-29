from flask import Blueprint
from flask_login import login_required

from ..controllers import auth_controller as c
from ..utils.rate_limit import rate_limit

bp = Blueprint("auth", __name__)

bp.add_url_rule("/", "index", c.index)
bp.add_url_rule("/login", "login", rate_limit(20, 60, scope="login")(c.login), methods=["GET", "POST"])
bp.add_url_rule("/logout", "logout", login_required(c.logout), methods=["POST"])
