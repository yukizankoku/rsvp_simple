import logging

from werkzeug.security import check_password_hash, generate_password_hash

from ..extensions import db
from ..models.base import utcnow
from ..repositories import user_repository

log = logging.getLogger("eo.auth")

# Used to spend the same hashing time when the email does not exist,
# so response timing does not reveal which emails are registered.
_DUMMY_HASH = generate_password_hash("dummy-password-for-timing")


def authenticate(email, password, ip=None):
    user = user_repository.get_by_email(email)
    if user is None:
        check_password_hash(_DUMMY_HASH, password or "")
        log.warning("Login failed (unknown email) ip=%s", ip)
        return None
    if not user.check_password(password or ""):
        log.warning("Login failed (bad password) user_id=%s ip=%s", user.id, ip)
        return None
    if not user.is_active:
        log.warning("Login failed (inactive) user_id=%s ip=%s", user.id, ip)
        return None

    user.last_login_at = utcnow()
    db.session.commit()
    log.info("Login success user_id=%s ip=%s", user.id, ip)
    return user
