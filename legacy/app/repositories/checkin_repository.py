from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from ..extensions import db
from ..models import Checkin


def get_by_guest(guest_id):
    return db.session.scalar(select(Checkin).where(Checkin.guest_id == guest_id))


def add(checkin):
    db.session.add(checkin)
    return checkin


def counts(event_ids):
    if not event_ids:
        return {"checked_in": 0, "checked_in_people": 0}
    row = db.session.execute(
        select(func.count(Checkin.id), func.coalesce(func.sum(Checkin.guest_count), 0))
        .where(Checkin.event_id.in_(event_ids))
    ).one()
    return {"checked_in": int(row[0]), "checked_in_people": int(row[1])}


def recent(event_id, limit=15):
    stmt = (select(Checkin).where(Checkin.event_id == event_id)
            .options(selectinload(Checkin.guest))
            .order_by(Checkin.checked_in_at.desc()).limit(limit))
    return db.session.scalars(stmt).all()
