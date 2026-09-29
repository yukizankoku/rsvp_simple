from ..extensions import db
from .base import TimestampMixin
from .user import event_staff


class Event(TimestampMixin, db.Model):
    __tablename__ = "events"

    TYPES = ("Wedding", "Birthday", "Gathering", "Corporate", "Seminar",
             "Workshop", "Concert", "Product Launch", "Other")
    STATUSES = ("draft", "published", "completed", "cancelled")

    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey("organizations.id", ondelete="CASCADE"),
                                nullable=False, index=True)
    invitation_template_id = db.Column(db.Integer, db.ForeignKey("invitation_templates.id", ondelete="SET NULL"))
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(220), nullable=False, unique=True, index=True)
    description = db.Column(db.Text)
    event_type = db.Column(db.String(50), nullable=False, default="Other")
    event_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time)
    end_time = db.Column(db.Time)
    timezone = db.Column(db.String(50), nullable=False, default="Asia/Jakarta")
    venue_name = db.Column(db.String(200))
    venue_address = db.Column(db.Text)
    latitude = db.Column(db.Numeric(9, 6))
    longitude = db.Column(db.Numeric(9, 6))
    cover_image = db.Column(db.String(255))
    logo = db.Column(db.String(255))
    contact_name = db.Column(db.String(150))
    contact_phone = db.Column(db.String(30))
    dress_code = db.Column(db.String(150))
    invitation_message = db.Column(db.Text)
    allow_walk_in = db.Column(db.Boolean, nullable=False, default=False, server_default=db.false())
    status = db.Column(db.String(20), nullable=False, default="draft", server_default="draft")

    organization = db.relationship("Organization", back_populates="events")
    invitation_template = db.relationship("InvitationTemplate")
    guests = db.relationship("Guest", back_populates="event", cascade="all, delete-orphan", passive_deletes=True)
    staff = db.relationship("User", secondary=event_staff, back_populates="events")

    @property
    def is_cancelled(self):
        return self.status == "cancelled"

    def __repr__(self):
        return f"<Event {self.slug}>"
