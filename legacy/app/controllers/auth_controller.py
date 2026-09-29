from flask import flash, redirect, render_template, request, session, url_for
from flask_login import current_user, login_user, logout_user

from ..forms.auth_forms import LoginForm
from ..services import auth_service
from ._helpers import safe_next


def index():
    return redirect(url_for("dashboard.index" if current_user.is_authenticated else "auth.login"))


def login():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard.index"))

    form = LoginForm()
    if form.validate_on_submit():
        user = auth_service.authenticate(form.email.data, form.password.data, ip=request.remote_addr)
        if user:
            session.clear()  # prevent session fixation
            login_user(user, remember=form.remember.data)
            session.permanent = True
            return redirect(safe_next(request.args.get("next"), url_for("dashboard.index")))
        flash("Email atau password salah.", "error")
    return render_template("auth/login.html", form=form)


def logout():
    logout_user()
    session.clear()
    flash("Anda telah logout.", "success")
    return redirect(url_for("auth.login"))
