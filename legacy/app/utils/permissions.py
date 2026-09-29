from functools import wraps

from flask import abort
from flask_login import current_user, login_required

# Permission catalog. Roles are linked to these via role_permissions and can be
# re-configured by a super admin (Settings > Roles).
PERMISSIONS = {
    "organization.manage": "Kelola organisasi / klien",
    "user.manage": "Kelola pengguna",
    "role.manage": "Kelola hak akses role",
    "event.create": "Buat event",
    "event.edit": "Ubah event",
    "event.delete": "Hapus event",
    "event.view": "Lihat event & dashboard",
    "guest.manage": "Kelola daftar tamu",
    "invitation.send": "Kirim / regenerasi undangan",
    "rsvp.view": "Lihat RSVP",
    "checkin.perform": "Melakukan check-in",
    "template.manage": "Kelola template undangan",
}

DEFAULT_ROLE_PERMISSIONS = {
    "super_admin": list(PERMISSIONS.keys()),
    "event_admin": ["event.view", "guest.manage", "invitation.send", "rsvp.view", "checkin.perform"],
}

ROLE_LABELS = {
    "super_admin": "Super Admin",
    "event_admin": "Event Admin / Staff",
}


def has_permission(code):
    return current_user.is_authenticated and current_user.can(code)


def permission_required(code):
    """Require login + a permission code on the current user's role."""

    def decorator(view):
        @wraps(view)
        @login_required
        def wrapped(*args, **kwargs):
            if not current_user.can(code):
                abort(403)
            return view(*args, **kwargs)

        return wrapped

    return decorator


def super_admin_required(view):
    @wraps(view)
    @login_required
    def wrapped(*args, **kwargs):
        if not current_user.is_super_admin:
            abort(403)
        return view(*args, **kwargs)

    return wrapped


def can_access_event(user, event):
    if event is None or not user.is_authenticated:
        return False
    if user.is_super_admin:
        return True
    return any(e.id == event.id for e in user.events)
