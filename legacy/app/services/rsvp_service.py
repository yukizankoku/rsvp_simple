import logging

from flask import current_app
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import Rsvp
from ..models.base import utcnow
from ..repositories import checkin_repository, rsvp_repository
from ..utils.tokens import mask
from . import invitation_service
from .result import ServiceResult

log = logging.getLogger("eo.rsvp")

VALID_RESPONSES = ("attending", "not_attending")


def max_guest_count(guest):
    return guest.max_guest_count or current_app.config["DEFAULT_MAX_GUEST_COUNT"]


def _validate(guest, status, guest_count):
    if status not in VALID_RESPONSES:
        return None, "Pilih status kehadiran."
    if status == "not_attending":
        return 0, None
    try:
        count = int(guest_count)
    except (TypeError, ValueError):
        return None, "Jumlah tamu harus berupa angka."
    if count < 1:
        return None, "Jumlah tamu minimal 1 orang."
    limit = max_guest_count(guest)
    if count > limit:
        return None, f"Jumlah tamu maksimal {limit} orang."
    return count, None


def submit_rsvp(token, status, guest_count=None, phone=None, notes=None, _retry=True):
    # 1-3. Validate token, find guest, confirm invitation is active.
    resolved = invitation_service.resolve(token)
    if not resolved.ok:
        return resolved
    guest = resolved.data["guest"]

    if checkin_repository.get_by_guest(guest.id):
        return ServiceResult.fail("checked_in", "Anda sudah melakukan check-in; RSVP tidak dapat diubah lagi.")

    # 4-5. Validate response + guest count.
    count, error = _validate(guest, status, guest_count)
    if error:
        return ServiceResult.fail("invalid", error, guest=guest)

    # 6-7. Create or update the single RSVP row for this guest.
    rsvp = rsvp_repository.get_by_guest(guest.id)
    is_update = rsvp is not None
    if rsvp is None:
        rsvp = rsvp_repository.add(Rsvp(guest_id=guest.id, event_id=guest.event_id))
    rsvp.status = status
    rsvp.guest_count = count
    rsvp.phone = (phone or "").strip()[:30] or None
    rsvp.notes = (notes or "").strip()[:1000] or None
    rsvp.confirmed_at = utcnow()
    if not guest.is_disabled:
        guest.invitation_status = "responded"

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        if not _retry:
            raise
        # A concurrent submission created the row first; apply this one as an update.
        return submit_rsvp(token, status, guest_count, phone, notes, _retry=False)

    log.info("RSVP %s guest_id=%s status=%s count=%s token=%s",
             "updated" if is_update else "submitted", guest.id, status, count, mask(token))
    # 8. Success.
    return ServiceResult.success("Terima kasih, konfirmasi Anda telah tersimpan.",
                                 guest=guest, rsvp=rsvp, updated=is_update)


def dashboard(event_ids):
    stats = rsvp_repository.summary(event_ids)
    stats.update(checkin_repository.counts(event_ids))
    return stats
