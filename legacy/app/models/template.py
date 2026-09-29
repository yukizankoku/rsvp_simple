from ..extensions import db
from .base import TimestampMixin


class InvitationTemplate(TimestampMixin, db.Model):
    __tablename__ = "invitation_templates"

    id = db.Column(db.Integer, primary_key=True)
    # NULL organization = global template available to every organization.
    organization_id = db.Column(db.Integer, db.ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))
    # Maps to templates/invitation/themes/<template_key>.html
    template_key = db.Column(db.String(50), nullable=False)
    thumbnail = db.Column(db.String(255))
    status = db.Column(db.String(20), nullable=False, default="active", server_default="active")
