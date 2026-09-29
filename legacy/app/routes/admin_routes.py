from flask import Blueprint

from ..controllers import admin_controller as c
from ..utils.permissions import permission_required as perm

bp = Blueprint("admin", __name__, url_prefix="/admin")

orgs = perm("organization.manage")
users = perm("user.manage")

bp.add_url_rule("/organizations", "organizations", orgs(c.organizations))
bp.add_url_rule("/organizations/create", "organization_create", orgs(c.organization_form), methods=["GET", "POST"])
bp.add_url_rule("/organizations/<int:org_id>/edit", "organization_edit", orgs(c.organization_form),
                methods=["GET", "POST"])
bp.add_url_rule("/organizations/<int:org_id>/delete", "organization_delete", orgs(c.organization_delete),
                methods=["POST"])

bp.add_url_rule("/users", "users", users(c.users))
bp.add_url_rule("/users/create", "user_create", users(c.user_form), methods=["GET", "POST"])
bp.add_url_rule("/users/<int:user_id>/edit", "user_edit", users(c.user_form), methods=["GET", "POST"])
bp.add_url_rule("/users/<int:user_id>/delete", "user_delete", users(c.user_delete), methods=["POST"])

bp.add_url_rule("/roles", "roles", perm("role.manage")(c.roles), methods=["GET", "POST"])

# Uploaded images (event covers/logos) must be reachable from the public invitation page.
public_bp = Blueprint("uploads", __name__)
public_bp.add_url_rule("/uploads/<path:filename>", "file", c.uploaded_file)
