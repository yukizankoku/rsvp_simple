from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash

from ..extensions import db
from .base import TimestampMixin

role_permissions = db.Table(
    "role_permissions",
    db.Column("role_id", db.Integer, db.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    db.Column("permission_id", db.Integer, db.ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)

# Events a non-super-admin user is assigned to (and therefore allowed to access).
event_staff = db.Table(
    "event_staff",
    db.Column("user_id", db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    db.Column("event_id", db.Integer, db.ForeignKey("events.id", ondelete="CASCADE"), primary_key=True),
)


class Permission(db.Model):
    __tablename__ = "permissions"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(64), nullable=False, unique=True)
    description = db.Column(db.String(255))


class Role(db.Model):
    __tablename__ = "roles"

    SUPER_ADMIN = "super_admin"
    EVENT_ADMIN = "event_admin"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    label = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))

    permissions = db.relationship("Permission", secondary=role_permissions, lazy="selectin")

    def has_permission(self, code):
        return any(p.code == code for p in self.permissions)


class User(UserMixin, TimestampMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey("organizations.id", ondelete="SET NULL"), index=True)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False, index=True)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    active = db.Column("is_active", db.Boolean, nullable=False, default=True, server_default=db.true())
    last_login_at = db.Column(db.DateTime(timezone=True))

    organization = db.relationship("Organization", back_populates="users")
    role = db.relationship("Role", lazy="joined")
    events = db.relationship("Event", secondary=event_staff, back_populates="staff")

    @property
    def is_active(self):
        return bool(self.active)

    @property
    def is_super_admin(self):
        return self.role is not None and self.role.name == Role.SUPER_ADMIN

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def can(self, code):
        if self.is_super_admin:
            return True
        return self.role is not None and self.role.has_permission(code)

    def __repr__(self):
        return f"<User {self.email}>"
