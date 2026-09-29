from ..extensions import db
from .base import TimestampMixin


class Guest(TimestampMixin, db.Model):
    __tablename__ = "guests"
    __table_args__ = (
        db.Index("ix_guests_event_id_name", "event_id", "name"),
    )

    CATEGORIES = ("VIP", "Family", "Friend", "Client", "Vendor", "Employee", "General", "Other")
    INVITATION_STATUSES = ("draft", "sent", "opened", "responded", "disabled")

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    name = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(30), index=True)
    email = db.Column(db.String(150))
    category = db.Column(db.String(30), nullable=False, default="General")
    company = db.Column(db.String(150))
    group_name = db.Column(db.String(100))
    guest_code = db.Column(db.String(50))
    # Human-friendly code (e.g. INV-8F3K29), also usable for manual check-in lookup.
    invitation_code = db.Column(db.String(20), nullable=False, unique=True, index=True)
    # Opaque random tokens used in public URLs; the numeric id is never exposed.
    invitation_token = db.Column(db.String(64), nullable=False, unique=True, index=True)
    checkin_token = db.Column(db.String(64), nullable=False, unique=True, index=True)
    invitation_status = db.Column(db.String(20), nullable=False, default="draft", server_default="draft")
    max_guest_count = db.Column(db.Integer)
    notes = db.Column(db.Text)
    sent_at = db.Column(db.DateTime(timezone=True))
    opened_at = db.Column(db.DateTime(timezone=True))
    token_regenerated_at = db.Column(db.DateTime(timezone=True))

    event = db.relationship("Event", back_populates="guests")
    rsvp = db.relationship("Rsvp", back_populates="guest", uselist=False,
                           cascade="all, delete-orphan", passive_deletes=True)
    checkin = db.relationship("Checkin", back_populates="guest", uselist=False,
                              cascade="all, delete-orphan", passive_deletes=True)

    @property
    def is_disabled(self):
        return self.invitation_status == "disabled"

    @property
    def rsvp_status(self):
        return self.rsvp.status if self.rsvp else "pending"

    @property
    def is_checked_in(self):
        return self.checkin is not None

    def __repr__(self):
        return f"<Guest {self.invitation_code}>"
