from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from ..extensions import db
from ..models import Checkin, Guest, Rsvp


def get(guest_id):
    return db.session.get(Guest, guest_id)


def get_by_invitation_token(token):
    if not token:
        return None
    return db.session.scalar(select(Guest).where(Guest.invitation_token == token))


def get_by_checkin_token(token):
    if not token:
        return None
    return db.session.scalar(select(Guest).where(Guest.checkin_token == token))


def get_by_invitation_code(code):
    if not code:
        return None
    return db.session.scalar(select(Guest).where(Guest.invitation_code == code.strip().upper()))


def invitation_code_exists(code):
    return db.session.scalar(select(Guest.id).where(Guest.invitation_code == code)) is not None


def token_exists(token):
    stmt = select(Guest.id).where(or_(Guest.invitation_token == token, Guest.checkin_token == token))
    return db.session.scalar(stmt) is not None


def search(event_id, filters=None, page=1, per_page=50):
    """Filtered, paginated guest list for the admin table."""
    filters = filters or {}
    stmt = (select(Guest)
            .where(Guest.event_id == event_id)
            .outerjoin(Rsvp, Rsvp.guest_id == Guest.id)
            .outerjoin(Checkin, Checkin.guest_id == Guest.id)
            .options(selectinload(Guest.rsvp), selectinload(Guest.checkin)))

    q = (filters.get("q") or "").strip()
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Guest.name.ilike(like), Guest.phone.ilike(like),
                              Guest.invitation_code.ilike(like), Guest.company.ilike(like),
                              Guest.group_name.ilike(like)))
    if filters.get("category"):
        stmt = stmt.where(Guest.category == filters["category"])
    if filters.get("invitation_status"):
        stmt = stmt.where(Guest.invitation_status == filters["invitation_status"])

    rsvp_status = filters.get("rsvp_status")
    if rsvp_status == "pending":
        stmt = stmt.where(or_(Rsvp.id.is_(None), Rsvp.status == "pending"))
    elif rsvp_status:
        stmt = stmt.where(Rsvp.status == rsvp_status)

    checkin_status = filters.get("checkin_status")
    if checkin_status == "checked_in":
        stmt = stmt.where(Checkin.id.is_not(None))
    elif checkin_status == "not_checked_in":
        stmt = stmt.where(Checkin.id.is_(None))

    total = db.session.scalar(select(func.count()).select_from(stmt.order_by(None).subquery()))
    rows = db.session.scalars(stmt.order_by(Guest.name).limit(per_page).offset((page - 1) * per_page)).all()
    return rows, total


def list_for_event(event_id):
    stmt = (select(Guest).where(Guest.event_id == event_id)
            .options(selectinload(Guest.rsvp), selectinload(Guest.checkin))
            .order_by(Guest.name))
    return db.session.scalars(stmt).all()


def add(guest):
    db.session.add(guest)
    return guest


def delete(guest):
    db.session.delete(guest)
