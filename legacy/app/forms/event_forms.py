from flask_wtf import FlaskForm
from flask_wtf.file import FileAllowed, FileField
from wtforms import (BooleanField, DateField, DecimalField, SelectField, StringField, TextAreaField,
                     TimeField)
from wtforms.validators import DataRequired, Length, NumberRange, Optional, Regexp, ValidationError

from ..models import Event
from ..utils.formatting import TIMEZONE_CHOICES

IMAGE_TYPES = ["png", "jpg", "jpeg", "webp", "gif"]


class EventForm(FlaskForm):
    organization_id = SelectField("Organisasi / Klien", coerce=int, validators=[DataRequired()])
    name = StringField("Nama event", validators=[DataRequired(), Length(max=200)])
    slug = StringField("Slug URL", validators=[Optional(), Length(max=200),
                                               Regexp(r"^[a-zA-Z0-9-]+$", message="Hanya huruf, angka dan tanda -")])
    event_type = SelectField("Jenis event", choices=[(t, t) for t in Event.TYPES])
    status = SelectField("Status", choices=[(s, s.title()) for s in Event.STATUSES])
    description = TextAreaField("Deskripsi", validators=[Optional(), Length(max=5000)])
    invitation_message = TextAreaField("Pesan undangan", validators=[Optional(), Length(max=2000)])

    event_date = DateField("Tanggal", validators=[DataRequired()])
    start_time = TimeField("Jam mulai", validators=[Optional()])
    end_time = TimeField("Jam selesai", validators=[Optional()])
    timezone = SelectField("Zona waktu", choices=TIMEZONE_CHOICES)

    venue_name = StringField("Nama venue", validators=[Optional(), Length(max=200)])
    venue_address = TextAreaField("Alamat venue", validators=[Optional(), Length(max=1000)])
    latitude = DecimalField("Latitude", places=6, validators=[Optional(), NumberRange(-90, 90)])
    longitude = DecimalField("Longitude", places=6, validators=[Optional(), NumberRange(-180, 180)])

    contact_name = StringField("Nama kontak", validators=[Optional(), Length(max=150)])
    contact_phone = StringField("No. WhatsApp kontak", validators=[
        Optional(), Length(max=30), Regexp(r"^[0-9+\-\s()]+$", message="Nomor telepon tidak valid")])
    dress_code = StringField("Dress code", validators=[Optional(), Length(max=150)])

    invitation_template_id = SelectField("Template undangan", coerce=int, validators=[Optional()])
    allow_walk_in = BooleanField("Izinkan check-in tamu yang belum RSVP (walk-in)")

    cover_image = FileField("Cover image", validators=[FileAllowed(IMAGE_TYPES, "Hanya file gambar.")])
    logo = FileField("Logo", validators=[FileAllowed(IMAGE_TYPES, "Hanya file gambar.")])
    remove_cover_image = BooleanField("Hapus cover")
    remove_logo = BooleanField("Hapus logo")

    def validate_end_time(self, field):
        if field.data and self.start_time.data and field.data <= self.start_time.data:
            raise ValidationError("Jam selesai harus setelah jam mulai.")

    def validate_longitude(self, field):
        if (field.data is None) != (self.latitude.data is None):
            raise ValidationError("Isi latitude dan longitude bersamaan.")
