import logging

from ..extensions import db
from ..models import Event
from ..repositories import event_repository, organization_repository
from ..utils.tokens import slugify
from ..utils.uploads import delete_upload, save_image

log = logging.getLogger("eo.event")

EDITABLE_FIELDS = (
    "name", "description", "event_type", "event_date", "start_time", "end_time", "timezone",
    "venue_name", "venue_address", "latitude", "longitude", "contact_name", "contact_phone",
    "dress_code", "invitation_message", "allow_walk_in", "status",
)


def organizations_for(user):
    if user.is_super_admin:
        return organization_repository.list_all(active_only=True)
    return [user.organization] if user.organization else []


def unique_slug(name, exclude_id=None):
    base = slugify(name)
    slug, n = base, 2
    while event_repository.slug_exists(slug, exclude_id=exclude_id):
        slug = f"{base}-{n}"
        n += 1
    return slug


def _apply(event, data, files):
    for field in EDITABLE_FIELDS:
        if field in data:
            setattr(event, field, data[field])
    event.invitation_template_id = data.get("invitation_template_id") or None

    for field in ("cover_image", "logo"):
        upload = files.get(field) if files else None
        if upload and upload.filename:
            old = getattr(event, field)
            setattr(event, field, save_image(upload, subfolder="events"))
            delete_upload(old)
        elif data.get(f"remove_{field}"):
            delete_upload(getattr(event, field))
            setattr(event, field, None)


def create_event(data, files, user):
    event = Event(organization_id=data["organization_id"])
    _apply(event, data, files)
    event.slug = unique_slug(data.get("slug") or data["name"])
    if not user.is_super_admin:
        event.staff.append(user)  # creator keeps access to their own event
    event_repository.add(event)
    db.session.commit()
    log.info("Event created id=%s by user_id=%s", event.id, user.id)
    return event


def update_event(event, data, files, user):
    _apply(event, data, files)
    if user.is_super_admin and data.get("organization_id"):
        event.organization_id = data["organization_id"]
    new_slug = data.get("slug")
    if new_slug and slugify(new_slug) != event.slug:
        event.slug = unique_slug(new_slug, exclude_id=event.id)
    db.session.commit()
    log.info("Event updated id=%s by user_id=%s", event.id, user.id)
    return event


def delete_event(event, user):
    images = (event.cover_image, event.logo)
    event_id = event.id
    event_repository.delete(event)
    db.session.commit()
    for path in images:
        delete_upload(path)
    log.info("Event deleted id=%s by user_id=%s", event_id, user.id)
