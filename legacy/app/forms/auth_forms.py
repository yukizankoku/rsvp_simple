from flask_wtf import FlaskForm
from wtforms import BooleanField, EmailField, PasswordField
from wtforms.validators import DataRequired, Email, Length


class LoginForm(FlaskForm):
    email = EmailField("Email", validators=[DataRequired(), Email(), Length(max=150)])
    password = PasswordField("Password", validators=[DataRequired(), Length(max=200)])
    remember = BooleanField("Ingat saya")
