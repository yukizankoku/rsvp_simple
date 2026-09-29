from sqlalchemy import func, select

from ..extensions import db
from ..models import Permission, Role, User


def get(user_id):
    return db.session.get(User, user_id)


def get_by_email(email):
    if not email:
        return None
    return db.session.scalar(select(User).where(func.lower(User.email) == email.strip().lower()))


def email_taken(email, exclude_id=None):
    stmt = select(User.id).where(func.lower(User.email) == email.strip().lower())
    if exclude_id:
        stmt = stmt.where(User.id != exclude_id)
    return db.session.scalar(stmt) is not None


def list_all():
    return db.session.scalars(select(User).order_by(User.name)).all()


def add(user):
    db.session.add(user)
    return user


def delete(user):
    db.session.delete(user)


def list_roles():
    return db.session.scalars(select(Role).order_by(Role.id)).all()


def get_role(role_id):
    return db.session.get(Role, role_id)


def get_role_by_name(name):
    return db.session.scalar(select(Role).where(Role.name == name))


def list_permissions():
    return db.session.scalars(select(Permission).order_by(Permission.code)).all()


def get_permission_by_code(code):
    return db.session.scalar(select(Permission).where(Permission.code == code))
