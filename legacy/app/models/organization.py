from ..extensions import db
from .base import TimestampMixin


class Organization(TimestampMixin, db.Model):
    __tablename__ = "organizations"

    STATUSES = ("active", "inactive")

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    logo = db.Column(db.String(255))
    email = db.Column(db.String(150))
    phone = db.Column(db.String(30))
    address = db.Column(db.Text)
    status = db.Column(db.String(20), nullable=False, default="active", server_default="active")

    users = db.relationship("User", back_populates="organization")
    events = db.relationship("Event", back_populates="organization")

    def __repr__(self):
        return f"<Organization {self.name}>"
