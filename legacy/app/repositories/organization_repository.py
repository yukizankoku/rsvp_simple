from sqlalchemy import func, select

from ..extensions import db
from ..models import Event, Organization


def get(org_id):
    return db.session.get(Organization, org_id)


def list_all(active_only=False):
    stmt = select(Organization).order_by(Organization.name)
    if active_only:
        stmt = stmt.where(Organization.status == "active")
    return db.session.scalars(stmt).all()


def event_count(org_id):
    return db.session.scalar(select(func.count(Event.id)).where(Event.organization_id == org_id)) or 0


def add(org):
    db.session.add(org)
    return org


def delete(org):
    db.session.delete(org)
