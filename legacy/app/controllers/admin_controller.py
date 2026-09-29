"""Super admin screens: organizations, users, role permissions."""
from flask import abort, flash, redirect, render_template, request, send_from_directory, current_app, url_for
from flask_login import current_user

from ..forms import clean_data
from ..forms.admin_forms import OrganizationForm, UserForm
from ..repositories import event_repository, organization_repository, user_repository
from ..services import admin_service
from ..utils.permissions import PERMISSIONS, ROLE_LABELS
from ..utils.uploads import UploadError


# ---- Organizations -------------------------------------------------------

def organizations():
    orgs = organization_repository.list_all()
    return render_template("admin/organizations.html", organizations=orgs,
                           event_count=organization_repository.event_count)


def organization_form(org_id=None):
    org = organization_repository.get(org_id) if org_id else None
    if org_id and org is None:
        abort(404)
    form = OrganizationForm(obj=org)
    if form.validate_on_submit():
        try:
            admin_service.save_organization(org, clean_data(form), request.files, current_user)
        except UploadError as exc:
            flash(str(exc), "error")
        else:
            flash("Organisasi disimpan.", "success")
            return redirect(url_for("admin.organizations"))
    return render_template("admin/organization_form.html", form=form, org=org)


def organization_delete(org_id):
    org = organization_repository.get(org_id) or abort(404)
    result = admin_service.delete_organization(org, current_user)
    flash(result.message, "success" if result.ok else "error")
    return redirect(url_for("admin.organizations"))


# ---- Users ---------------------------------------------------------------

def users():
    return render_template("admin/users.html", users=user_repository.list_all())


def user_form(user_id=None):
    user = user_repository.get(user_id) if user_id else None
    if user_id and user is None:
        abort(404)
    form = UserForm(obj=user)
    form.role_id.choices = [(r.id, r.label) for r in user_repository.list_roles()]
    form.organization_id.choices = [(0, "— Tidak ada —")] + [
        (o.id, o.name) for o in organization_repository.list_all()]
    form.event_ids.choices = [(e.id, f"{e.name} ({e.organization.name})") for e in event_repository.list_all()]
    if request.method == "GET" and user:
        form.event_ids.data = [e.id for e in user.events]
        form.organization_id.data = user.organization_id or 0

    if form.validate_on_submit():
        if user is None and not form.password.data:
            form.password.errors.append("Password wajib diisi untuk pengguna baru.")
        else:
            result = admin_service.save_user(user, clean_data(form), current_user)
            if result.ok:
                flash(result.message, "success")
                return redirect(url_for("admin.users"))
            flash(result.message, "error")
    return render_template("admin/user_form.html", form=form, user=user)


def user_delete(user_id):
    user = user_repository.get(user_id) or abort(404)
    result = admin_service.delete_user(user, current_user)
    flash(result.message, "success" if result.ok else "error")
    return redirect(url_for("admin.users"))


# ---- Roles ---------------------------------------------------------------

def roles():
    all_roles = user_repository.list_roles()
    if request.method == "POST":
        role = user_repository.get_role(request.form.get("role_id", type=int)) or abort(404)
        codes = set(request.form.getlist("permissions")) & set(PERMISSIONS)
        result = admin_service.update_role_permissions(role, codes, current_user)
        flash(result.message, "success" if result.ok else "error")
        return redirect(url_for("admin.roles"))
    return render_template("admin/roles.html", roles=all_roles, permissions=PERMISSIONS, role_labels=ROLE_LABELS)


# ---- Uploaded files ------------------------------------------------------

def uploaded_file(filename):
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename, max_age=60 * 60 * 24)
