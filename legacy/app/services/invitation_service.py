import logging
import re
from datetime import date, timezone
from urllib.parse import quote, urlencode

from flask import current_app, request, url_for
from jinja2 import TemplateNotFound

from ..extensions import db
from ..models.base import utcnow
from ..repositories import guest_repository
from ..utils.formatting import event_end_datetime, event_start_datetime, format_date_id, format_time, tz_label
from ..utils.tokens import mask
from .result import ServiceResult

log = logging.getLogger("eo.invitation")

DEFAULT_THEME = "classic"

# Link previews (WhatsApp, Telegram, Slack, ...) fetch URLs automatically;
# don't count them as "opened". Even so, "opened" is only an indication.
_BOT_UA = re.compile(r"bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|curl|wget",
                     re.IGNORECASE)


def base_url():
    configured = current_app.config.get("APP_BASE_URL")
    return configured or request.host_url.rstrip("/")


def invitation_url(guest):
    return base_url() + url_for("invitation.show", token=guest.invitation_token)


def checkin_url(guest):
    return base_url() + url_for("checkin.lookup_token", token=guest.checkin_token)


def resolve(token):
    """Validate a public invitation token and return the guest if it is usable."""
    guest = guest_repository.get_by_invitation_token(token)
    if guest is None:
        return ServiceResult.fail("not_found", "Undangan tidak ditemukan.")
    if guest.is_disabled:
        return ServiceResult.fail("disabled", "Undangan ini sudah tidak aktif.")
    event = guest.event
    if event.status == "cancelled":
        return ServiceResult.fail("cancelled", "Acara ini telah dibatalkan.")
    if event.status == "draft":
        return ServiceResult.fail("not_found", "Undangan belum tersedia.")
    if event.status == "completed":
        return ServiceResult.fail("expired", "Acara ini telah selesai.")
    return ServiceResult.success(guest=guest, event=event)


def mark_opened(guest, user_agent):
    if user_agent and _BOT_UA.search(user_agent):
        return
    if guest.opened_at is None:
        guest.opened_at = utcnow()
    if guest.invitation_status in ("draft", "sent"):
        guest.invitation_status = "opened"
    db.session.commit()


def theme_template(event):
    key = event.invitation_template.template_key if event.invitation_template else DEFAULT_THEME
    name = f"invitation/themes/{key}.html"
    try:
        current_app.jinja_env.get_template(name)
        return name
    except TemplateNotFound:
        log.warning("Invitation theme %r not found, using default", key)
        return f"invitation/themes/{DEFAULT_THEME}.html"


def maps_url(event):
    if event.latitude is not None and event.longitude is not None:
        query = f"{event.latitude},{event.longitude}"
    else:
        query = ", ".join(filter(None, [event.venue_name, event.venue_address]))
    if not query:
        return None
    return "https://www.google.com/maps/search/?" + urlencode({"api": 1, "query": query})


def _utc_stamp(dt):
    return dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def google_calendar_url(event):
    params = {
        "action": "TEMPLATE",
        "text": event.name,
        "dates": f"{_utc_stamp(event_start_datetime(event))}/{_utc_stamp(event_end_datetime(event))}",
        "details": (event.description or "")[:1000],
        "location": ", ".join(filter(None, [event.venue_name, event.venue_address])),
    }
    return "https://calendar.google.com/calendar/render?" + urlencode(params, quote_via=quote)


def _ics_escape(text):
    return (text or "").replace("\\", "\\\\").replace(";", r"\;").replace(",", r"\,").replace("\n", r"\n")


def ics_content(event, guest):
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//EO Event Management//ID",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{guest.invitation_code}@eo-event",
        f"DTSTAMP:{_utc_stamp(utcnow())}",
        f"DTSTART:{_utc_stamp(event_start_datetime(event))}",
        f"DTEND:{_utc_stamp(event_end_datetime(event))}",
        f"SUMMARY:{_ics_escape(event.name)}",
        f"DESCRIPTION:{_ics_escape(event.description)}",
        f"LOCATION:{_ics_escape(', '.join(filter(None, [event.venue_name, event.venue_address])))}",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    return "\r\n".join(lines) + "\r\n"


def is_event_upcoming(event):
    return event.event_date >= date.today()


def event_datetime_text(event):
    text = format_date_id(event.event_date)
    if event.start_time:
        text += f" · {format_time(event.start_time)}"
        if event.end_time:
            text += f" – {format_time(event.end_time)}"
        text += f" {tz_label(event.timezone)}"
    return text


def log_access(guest, action):
    log.info("Invitation %s guest_id=%s token=%s", action, guest.id, mask(guest.invitation_token))
