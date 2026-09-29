from flask_wtf import FlaskForm
from flask_wtf.file import FileAllowed, FileField, FileRequired
from wtforms import EmailField, IntegerField, SelectField, StringField, TextAreaField
from wtforms.validators import DataRequired, Email, Length, NumberRange, Optional, Regexp

from ..models import Guest

PHONE = Regexp(r"^[0-9+\-\s()]+$", message="Nomor telepon tidak valid")


class GuestForm(FlaskForm):
    name = StringField("Nama", validators=[DataRequired(), Length(max=150)])
    phone = StringField("No. HP / WhatsApp", validators=[Optional(), Length(max=30), PHONE])
    email = EmailField("Email", validators=[Optional(), Email(), Length(max=150)])
    category = SelectField("Kategori", choices=[(c, c) for c in Guest.CATEGORIES], default="General")
    company = StringField("Perusahaan / Instansi", validators=[Optional(), Length(max=150)])
    group_name = StringField("Grup", validators=[Optional(), Length(max=100)])
    guest_code = StringField("Kode tamu (opsional, mis. no. meja)", validators=[Optional(), Length(max=50)])
    max_guest_count = IntegerField("Maks. jumlah orang", validators=[Optional(), NumberRange(1, 50)])
    notes = TextAreaField("Catatan internal", validators=[Optional(), Length(max=2000)])


class GuestImportForm(FlaskForm):
    file = FileField("File CSV", validators=[FileRequired(), FileAllowed(["csv"], "Hanya file .csv")])


class RsvpForm(FlaskForm):
    status = SelectField("Kehadiran", choices=[("attending", "Hadir"), ("not_attending", "Tidak hadir")],
                         validators=[DataRequired()])
    guest_count = IntegerField("Jumlah orang", validators=[Optional()])
    phone = StringField("No. HP", validators=[Optional(), Length(max=30), PHONE])
    notes = TextAreaField("Pesan / catatan", validators=[Optional(), Length(max=1000)])
