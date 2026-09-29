from sqlalchemy import select

from ..extensions import db
from ..models import Event, InvitationTemplate, event_staff


def get(event_id):
    return db.session.get(Event, event_id)


def get_by_slug(slug):
    return db.session.scalar(select(Event).where(Event.slug == slug))


def slug_exists(slug, exclude_id=None):
    stmt = select(Event.id).where(Event.slug == slug)
    if exclude_id:
        stmt = stmt.where(Event.id != exclude_id)
    return db.session.scalar(stmt) is not None


def accessible_query(user):
    """Base query of events the given user may access."""
    stmt = select(Event)
    if not user.is_super_admin:
        stmt = stmt.join(event_staff, event_staff.c.event_id == Event.id).where(event_staff.c.user_id == user.id)
    return stmt


def list_for_user(user, search=None, status=None):
    stmt = accessible_query(user)
    if search:
        stmt = stmt.where(Event.name.ilike(f"%{search.strip()}%"))
    if status:
        stmt = stmt.where(Event.status == status)
    stmt = stmt.order_by(Event.event_date.desc(), Event.id.desc())
    return db.session.scalars(stmt).all()


def list_all():
    return db.session.scalars(select(Event).order_by(Event.event_date.desc())).all()


def add(event):
    db.session.add(event)
    return event


def delete(event):
    db.session.delete(event)


def list_templates(organization_id=None):
    stmt = select(InvitationTemplate).where(InvitationTemplate.status == "active")
    if organization_id:
        stmt = stmt.where((InvitationTemplate.organization_id.is_(None))
                          | (InvitationTemplate.organization_id == organization_id))
    else:
        stmt = stmt.where(InvitationTemplate.organization_id.is_(None))
    return db.session.scalars(stmt.order_by(InvitationTemplate.name)).all()


def get_template(template_id):
    return db.session.get(InvitationTemplate, template_id)
