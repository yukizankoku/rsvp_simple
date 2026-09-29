import csv
import io
import logging
from urllib.parse import quote

from flask import current_app

from ..extensions import db
from ..models import Guest
from ..models.base import utcnow
from ..repositories import guest_repository
from ..utils.formatting import format_date_id, normalize_phone
from ..utils.tokens import generate_invitation_code, generate_token
from .result import ServiceResult

log = logging.getLogger("eo.guest")

GUEST_FIELDS = ("name", "phone", "email", "category", "company", "group_name",
                "guest_code", "max_guest_count", "notes")
IMPORT_COLUMNS = ("name", "phone", "email", "category", "company", "group_name", "max_guest_count", "notes")


def _unique_code():
    for _ in range(20):
        code = generate_invitation_code()
        if not guest_repository.invitation_code_exists(code):
            return code
    raise RuntimeError("Could not generate a unique invitation code")


def _unique_token():
    for _ in range(20):
        token = generate_token()
        if not guest_repository.token_exists(token):
            return token
    raise RuntimeError("Could not generate a unique token")


def _new_guest(event, data):
    guest = Guest(event_id=event.id,
                  invitation_code=_unique_code(),
                  invitation_token=_unique_token(),
                  checkin_token=_unique_token())
    for field in GUEST_FIELDS:
        if field in data:
            setattr(guest, field, data[field])
    guest.category = guest.category or "General"
    return guest


def create_guest(event, data, user):
    guest = guest_repository.add(_new_guest(event, data))
    db.session.commit()
    log.info("Guest created id=%s event_id=%s by user_id=%s", guest.id, event.id, user.id)
    return guest


def update_guest(guest, data, user):
    for field in GUEST_FIELDS:
        if field in data:
            setattr(guest, field, data[field])
    db.session.commit()
    log.info("Guest updated id=%s by user_id=%s", guest.id, user.id)
    return guest


def delete_guest(guest, user):
    guest_id = guest.id
    guest_repository.delete(guest)
    db.session.commit()
    log.info("Guest deleted id=%s by user_id=%s", guest_id, user.id)


def regenerate_tokens(guest, user):
    """Issue new invitation + check-in tokens; old links and QR codes stop working."""
    guest.invitation_token = _unique_token()
    guest.checkin_token = _unique_token()
    guest.token_regenerated_at = utcnow()
    db.session.commit()
    log.info("Invitation token regenerated guest_id=%s by user_id=%s", guest.id, user.id)
    return guest


def _restored_status(guest):
    if guest.rsvp and guest.rsvp.status != "pending":
        return "responded"
    if guest.opened_at:
        return "opened"
    return "sent" if guest.sent_at else "draft"


def set_disabled(guest, disabled, user):
    guest.invitation_status = "disabled" if disabled else _restored_status(guest)
    db.session.commit()
    log.info("Invitation %s guest_id=%s by user_id=%s", "disabled" if disabled else "enabled", guest.id, user.id)
    return guest


def mark_sent(guest, user):
    guest.sent_at = utcnow()
    if guest.invitation_status == "draft":
        guest.invitation_status = "sent"
    db.session.commit()
    log.info("Invitation marked sent guest_id=%s by user_id=%s", guest.id, user.id)


def whatsapp_message(guest, url):
    event = guest.event
    return (
        f"Halo {guest.name} 👋\n\n"
        f"Kami mengundang Anda untuk menghadiri\n{event.name}\n"
        f"pada {format_date_id(event.event_date)}.\n\n"
        f"Detail undangan:\n{url}\n\n"
        "Mohon konfirmasi kehadiran melalui link tersebut.\n\n"
        "Terima kasih 🙏"
    )


def whatsapp_url(guest, url):
    phone = normalize_phone(guest.phone)
    text = quote(whatsapp_message(guest, url))
    return f"https://wa.me/{phone}?text={text}" if phone else f"https://wa.me/?text={text}"


def _parse_import_row(row):
    data = {k: (row.get(k) or "").strip() for k in IMPORT_COLUMNS}
    if not data["name"]:
        raise ValueError("kolom name kosong")
    if len(data["name"]) > 150:
        raise ValueError("nama terlalu panjang")
    if data["category"] and data["category"] not in Guest.CATEGORIES:
        matches = [c for c in Guest.CATEGORIES if c.lower() == data["category"].lower()]
        data["category"] = matches[0] if matches else "Other"
    data["category"] = data["category"] or "General"
    if data["max_guest_count"]:
        try:
            data["max_guest_count"] = int(data["max_guest_count"])
        except ValueError:
            raise ValueError("max_guest_count harus angka")
        if not 1 <= data["max_guest_count"] <= 50:
            raise ValueError("max_guest_count harus 1–50")
    else:
        data["max_guest_count"] = None
    for key in ("phone", "email", "company", "group_name", "notes"):
        data[key] = data[key] or None
    return data


def import_csv(event, stream, user):
    """Import guests from a UTF-8 CSV with a header row (see IMPORT_COLUMNS)."""
    raw = stream.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        return ServiceResult.fail("encoding", "File harus berformat CSV UTF-8.")

    sample = text[:2048]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel
    reader = csv.DictReader(io.StringIO(text), dialect=dialect)
    if not reader.fieldnames or "name" not in [f.strip().lower() for f in reader.fieldnames]:
        return ServiceResult.fail("header", "Header CSV wajib memiliki kolom 'name'.")
    reader.fieldnames = [f.strip().lower() for f in reader.fieldnames]

    created, errors = 0, []
    max_rows = current_app.config["GUEST_IMPORT_MAX_ROWS"]
    for line_no, row in enumerate(reader, start=2):
        if line_no - 1 > max_rows:
            errors.append(f"Dibatasi {max_rows} baris; sisanya diabaikan.")
            break
        if not any((v or "").strip() for v in row.values() if isinstance(v, str)):
            continue
        try:
            data = _parse_import_row(row)
        except ValueError as exc:
            errors.append(f"Baris {line_no}: {exc}")
            continue
        guest_repository.add(_new_guest(event, data))
        db.session.flush()
        created += 1

    db.session.commit()
    log.info("Guests imported event_id=%s created=%s errors=%s by user_id=%s",
             event.id, created, len(errors), user.id)
    return ServiceResult.success(f"{created} tamu berhasil diimpor.", created=created, errors=errors)


def export_csv(event, url_builder):
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["name", "phone", "email", "category", "company", "group_name", "invitation_code",
                     "invitation_status", "rsvp_status", "guest_count", "checked_in", "invitation_link"])
    for g in guest_repository.list_for_event(event.id):
        writer.writerow([
            g.name, g.phone or "", g.email or "", g.category, g.company or "", g.group_name or "",
            g.invitation_code, g.invitation_status, g.rsvp_status,
            g.rsvp.guest_count if g.rsvp else "", "yes" if g.is_checked_in else "no", url_builder(g),
        ])
    return "﻿" + out.getvalue()
