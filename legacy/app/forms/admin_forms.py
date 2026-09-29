from flask_wtf import FlaskForm
from flask_wtf.file import FileAllowed, FileField
from wtforms import BooleanField, EmailField, PasswordField, SelectField, SelectMultipleField, StringField, TextAreaField
from wtforms.validators import DataRequired, Email, Length, Optional

from ..models import Organization


class OrganizationForm(FlaskForm):
    name = StringField("Nama", validators=[DataRequired(), Length(max=150)])
    description = TextAreaField("Deskripsi", validators=[Optional(), Length(max=2000)])
    email = EmailField("Email", validators=[Optional(), Email(), Length(max=150)])
    phone = StringField("Telepon", validators=[Optional(), Length(max=30)])
    address = TextAreaField("Alamat", validators=[Optional(), Length(max=1000)])
    status = SelectField("Status", choices=[(s, s.title()) for s in Organization.STATUSES])
    logo = FileField("Logo", validators=[FileAllowed(["png", "jpg", "jpeg", "webp", "gif"], "Hanya gambar.")])


class UserForm(FlaskForm):
    name = StringField("Nama", validators=[DataRequired(), Length(max=150)])
    email = EmailField("Email", validators=[DataRequired(), Email(), Length(max=150)])
    password = PasswordField("Password", validators=[Optional(), Length(min=8, max=200)])
    role_id = SelectField("Role", coerce=int, validators=[DataRequired()])
    organization_id = SelectField("Organisasi", coerce=int, validators=[Optional()])
    event_ids = SelectMultipleField("Event yang ditugaskan", coerce=int, validators=[Optional()])
    active = BooleanField("Aktif", default=True)
