import logging
import re

from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import Checkin
from ..repositories import checkin_repository, guest_repository, rsvp_repository
from ..utils.permissions import can_access_event
from .result import ServiceResult

log = logging.getLogger("eo.checkin")

_CODE_RE = re.compile(r"^INV-[A-Z0-9]{4,12}$", re.IGNORECASE)


def find_guest(code):
    """Accepts a scanned check-in URL, a raw check-in token or an invitation code."""
    code = (code or "").strip()
    if not code:
        return None
    if "/checkin/" in code:
        code = code.rstrip("/").rsplit("/checkin/", 1)[-1].split("?")[0]
    if _CODE_RE.match(code):
        return guest_repository.get_by_invitation_code(code)
    return guest_repository.get_by_checkin_token(code)


def verify(guest, event_id, user):
    """Run check-in rules without writing anything."""
    if guest is None:
        return ServiceResult.fail("not_found", "QR / kode undangan tidak valid.")
    if not can_access_event(user, guest.event):
        return ServiceResult.fail("no_access", "Anda tidak memiliki akses ke event tamu ini.")
    if event_id is not None and guest.event_id != event_id:
        return ServiceResult.fail("wrong_event", "Undangan ini untuk event lain.", guest=guest)
    event = guest.event
    if event.status == "cancelled":
        return ServiceResult.fail("event_cancelled", "Event telah dibatalkan.", guest=guest)
    if guest.is_disabled:
        return ServiceResult.fail("disabled", "Undangan tamu ini dinonaktifkan.", guest=guest)

    existing = checkin_repository.get_by_guest(guest.id)
    if existing:
        return ServiceResult.fail("already_checked_in", "Tamu sudah check-in.", guest=guest, checkin=existing)

    rsvp = rsvp_repository.get_by_guest(guest.id)
    attending = rsvp is not None and rsvp.status == "attending"
    if not attending and not event.allow_walk_in:
        return ServiceResult.fail("not_attending", "Tamu belum mengonfirmasi kehadiran (RSVP).",
                                  guest=guest, rsvp=rsvp)

    guest_count = rsvp.guest_count if attending else 1
    return ServiceResult.success("Tamu valid, siap check-in.", guest=guest, rsvp=rsvp,
                                 guest_count=guest_count, walk_in=not attending)


def confirm(guest, event_id, user, device_info=None, notes=None):
    result = verify(guest, event_id, user)
    if not result.ok:
        return result

    checkin = checkin_repository.add(Checkin(
        event_id=guest.event_id,
        guest_id=guest.id,
        guest_count=result.data["guest_count"],
        checked_in_by=user.id,
        device_info=(device_info or "")[:255] or None,
        notes=("Walk-in" if result.data["walk_in"] else notes) or None,
    ))
    try:
        db.session.commit()
    except IntegrityError:
        # Unique constraint on guest_id: someone else checked this guest in first.
        db.session.rollback()
        existing = checkin_repository.get_by_guest(guest.id)
        return ServiceResult.fail("already_checked_in", "Tamu sudah check-in.", guest=guest, checkin=existing)

    log.info("Check-in guest_id=%s event_id=%s count=%s by user_id=%s",
             guest.id, guest.event_id, checkin.guest_count, user.id)
    return ServiceResult.success("Check-in berhasil.", guest=guest, checkin=checkin)


def stats(event):
    data = rsvp_repository.summary([event.id])
    data.update(checkin_repository.counts([event.id]))
    expected = data["expected_guests"]
    data["remaining"] = max(expected - data["checked_in_people"], 0)
    data["percentage"] = round(data["checked_in_people"] * 100 / expected) if expected else 0
    data["percentage"] = min(data["percentage"], 100)
    return data
