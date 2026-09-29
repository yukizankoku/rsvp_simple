"""Organization, user and role management (super admin)."""
import logging

from ..extensions import db
from ..models import Organization, User
from ..repositories import event_repository, organization_repository, user_repository
from ..utils.uploads import delete_upload, save_image
from .result import ServiceResult

log = logging.getLogger("eo.admin")

ORG_FIELDS = ("name", "description", "email", "phone", "address", "status")


def save_organization(org, data, files, actor):
    is_new = org is None
    org = org or Organization()
    for field in ORG_FIELDS:
        if field in data:
            setattr(org, field, data[field])
    upload = files.get("logo") if files else None
    if upload and upload.filename:
        old = org.logo
        org.logo = save_image(upload, subfolder="organizations")
        delete_upload(old)
    if is_new:
        organization_repository.add(org)
    db.session.commit()
    log.info("Organization %s id=%s by user_id=%s", "created" if is_new else "updated", org.id, actor.id)
    return org


def delete_organization(org, actor):
    if organization_repository.event_count(org.id):
        return ServiceResult.fail("has_events", "Organisasi masih memiliki event. Hapus event terlebih dahulu.")
    logo, org_id = org.logo, org.id
    organization_repository.delete(org)
    db.session.commit()
    delete_upload(logo)
    log.info("Organization deleted id=%s by user_id=%s", org_id, actor.id)
    return ServiceResult.success("Organisasi dihapus.")


def save_user(user, data, actor):
    is_new = user is None
    if user_repository.email_taken(data["email"], exclude_id=None if is_new else user.id):
        return ServiceResult.fail("email_taken", "Email sudah digunakan pengguna lain.")

    user = user or User()
    user.name = data["name"]
    user.email = data["email"].strip().lower()
    user.role_id = data["role_id"]
    user.organization_id = data.get("organization_id") or None
    if user.id != actor.id:  # never let an admin lock themselves out
        user.active = bool(data.get("active", True))
    if data.get("password"):
        user.set_password(data["password"])
    user.events = [e for e in (event_repository.get(i) for i in data.get("event_ids", [])) if e]

    if is_new:
        user_repository.add(user)
    db.session.commit()
    log.info("User %s id=%s by user_id=%s", "created" if is_new else "updated", user.id, actor.id)
    return ServiceResult.success("Pengguna disimpan.", user=user)


def delete_user(user, actor):
    if user.id == actor.id:
        return ServiceResult.fail("self", "Anda tidak dapat menghapus akun sendiri.")
    user_id = user.id
    user_repository.delete(user)
    db.session.commit()
    log.info("User deleted id=%s by user_id=%s", user_id, actor.id)
    return ServiceResult.success("Pengguna dihapus.")


def update_role_permissions(role, permission_codes, actor):
    if role.name == "super_admin":
        return ServiceResult.fail("locked", "Hak akses Super Admin tidak dapat diubah.")
    role.permissions = [p for p in user_repository.list_permissions() if p.code in permission_codes]
    db.session.commit()
    log.info("Role permissions updated role=%s codes=%s by user_id=%s",
             role.name, sorted(permission_codes), actor.id)
    return ServiceResult.success("Hak akses diperbarui.")
