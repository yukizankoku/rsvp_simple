import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from .tokens import mask

DAYS_ID = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli",
             "Agustus", "September", "Oktober", "November", "Desember"]
TZ_LABELS = {"Asia/Jakarta": "WIB", "Asia/Makassar": "WITA", "Asia/Jayapura": "WIT"}

TIMEZONE_CHOICES = [
    ("Asia/Jakarta", "WIB (Asia/Jakarta)"),
    ("Asia/Makassar", "WITA (Asia/Makassar)"),
    ("Asia/Jayapura", "WIT (Asia/Jayapura)"),
    ("Asia/Singapore", "Asia/Singapore"),
    ("UTC", "UTC"),
]


def get_zone(name):
    try:
        return ZoneInfo(name or "UTC")
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo("UTC")


def tz_label(name):
    return TZ_LABELS.get(name, name)


def format_date_id(value, with_day=True):
    if not value:
        return ""
    text = f"{value.day} {MONTHS_ID[value.month - 1]} {value.year}"
    return f"{DAYS_ID[value.weekday()]}, {text}" if with_day else text


def format_time(value):
    return value.strftime("%H:%M") if value else ""


def to_local(dt, tz_name="Asia/Jakarta"):
    if dt is None:
        return None
    if dt.tzinfo is None:  # SQLite returns naive values; they are stored as UTC.
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(get_zone(tz_name))


def format_datetime_local(dt, tz_name="Asia/Jakarta", fmt="%d/%m/%Y %H:%M"):
    local = to_local(dt, tz_name)
    return local.strftime(fmt) if local else ""


def mask_token(token):
    return mask(token)


def normalize_phone(phone):
    """Normalize Indonesian numbers to international digits (0812.. -> 62812..)."""
    if not phone:
        return ""
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("0"):
        digits = "62" + digits[1:]
    elif digits.startswith("8"):
        digits = "62" + digits
    return digits


def event_start_datetime(event):
    tz = get_zone(event.timezone)
    start = event.start_time or datetime.min.time()
    return datetime.combine(event.event_date, start, tzinfo=tz)


def event_end_datetime(event):
    tz = get_zone(event.timezone)
    if event.end_time:
        end = datetime.combine(event.event_date, event.end_time, tzinfo=tz)
        if end > event_start_datetime(event):
            return end
    return event_start_datetime(event) + timedelta(hours=3)
