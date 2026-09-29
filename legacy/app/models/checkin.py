from ..extensions import db
from .base import utcnow


class Checkin(db.Model):
    __tablename__ = "checkins"

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    # Unique: a guest can only be checked in once.
    guest_id = db.Column(db.Integer, db.ForeignKey("guests.id", ondelete="CASCADE"),
                         nullable=False, unique=True, index=True)
    guest_count = db.Column(db.Integer, nullable=False, default=1)
    checked_in_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    checked_in_by = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"))
    device_info = db.Column(db.String(255))
    notes = db.Column(db.Text)

    guest = db.relationship("Guest", back_populates="checkin")
    staff = db.relationship("User")
