from ..extensions import db
from .base import utcnow


class Rsvp(db.Model):
    __tablename__ = "rsvps"
    __table_args__ = (
        db.CheckConstraint("guest_count >= 0", name="guest_count_non_negative"),
    )

    STATUSES = ("pending", "attending", "not_attending")

    id = db.Column(db.Integer, primary_key=True)
    # Unique: one active RSVP per guest (updated in place on change).
    guest_id = db.Column(db.Integer, db.ForeignKey("guests.id", ondelete="CASCADE"),
                         nullable=False, unique=True, index=True)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default="pending")
    guest_count = db.Column(db.Integer, nullable=False, default=0)
    phone = db.Column(db.String(30))
    notes = db.Column(db.Text)
    confirmed_at = db.Column(db.DateTime(timezone=True))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    guest = db.relationship("Guest", back_populates="rsvp")
