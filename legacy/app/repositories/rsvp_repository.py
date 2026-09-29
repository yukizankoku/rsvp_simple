from sqlalchemy import case, func, select

from ..extensions import db
from ..models import Guest, Rsvp


def get_by_guest(guest_id):
    return db.session.scalar(select(Rsvp).where(Rsvp.guest_id == guest_id))


def add(rsvp):
    db.session.add(rsvp)
    return rsvp


def summary(event_ids):
    """RSVP totals for one or more events."""
    if not event_ids:
        return {"total": 0, "attending": 0, "not_attending": 0, "pending": 0, "expected_guests": 0}

    total = db.session.scalar(select(func.count(Guest.id)).where(Guest.event_id.in_(event_ids))) or 0
    row = db.session.execute(
        select(
            func.coalesce(func.sum(case((Rsvp.status == "attending", 1), else_=0)), 0),
            func.coalesce(func.sum(case((Rsvp.status == "not_attending", 1), else_=0)), 0),
            func.coalesce(func.sum(case((Rsvp.status == "attending", Rsvp.guest_count), else_=0)), 0),
        ).where(Rsvp.event_id.in_(event_ids))
    ).one()
    attending, not_attending, expected = (int(v) for v in row)
    return {
        "total": total,
        "attending": attending,
        "not_attending": not_attending,
        "pending": max(total - attending - not_attending, 0),
        "expected_guests": expected,
    }


def list_responses(event_id, status=None, limit=None):
    stmt = select(Rsvp).where(Rsvp.event_id == event_id)
    if status:
        stmt = stmt.where(Rsvp.status == status)
    stmt = stmt.order_by(Rsvp.updated_at.desc())
    if limit:
        stmt = stmt.limit(limit)
    return db.session.scalars(stmt).all()
