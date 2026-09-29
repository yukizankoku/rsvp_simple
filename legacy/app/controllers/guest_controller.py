from flask import Response, flash, redirect, render_template, request, url_for
from flask_login import current_user

from ..forms import clean_data
from ..forms.guest_forms import GuestForm, GuestImportForm
from ..models import Guest
from ..repositories import guest_repository
from ..services import checkin_service, guest_service, invitation_service, qr_service
from ..utils.tokens import slugify
from ._helpers import is_htmx, load_event, load_guest, safe_next

PER_PAGE = 50
FILTER_KEYS = ("q", "category", "invitation_status", "rsvp_status", "checkin_status")


def _filters():
    return {k: request.args.get(k, "").strip() for k in FILTER_KEYS}


def _back_to_list(guest):
    return safe_next(request.form.get("next") or request.args.get("next"),
                     url_for("guests.index", event_id=guest.event_id))


def index(event_id):
    event = load_event(event_id)
    filters = _filters()
    page = max(request.args.get("page", 1, type=int), 1)
    guests, total = guest_repository.search(event.id, filters, page=page, per_page=PER_PAGE)
    ctx = {
        "event": event, "guests": guests, "total": total, "filters": filters, "page": page,
        "pages": max((total + PER_PAGE - 1) // PER_PAGE, 1),
        "categories": Guest.CATEGORIES, "invitation_statuses": Guest.INVITATION_STATUSES,
        "invitation_url": invitation_service.invitation_url,
    }
    if is_htmx() and request.headers.get("HX-Target") == "guest-table":
        return render_template("guests/_table.html", **ctx)
    return render_template("guests/index.html", **ctx)


def create(event_id):
    event = load_event(event_id)
    form = GuestForm()
    if form.validate_on_submit():
        guest = guest_service.create_guest(event, clean_data(form), current_user)
        flash(f"Tamu {guest.name} ditambahkan.", "success")
        if request.form.get("add_another"):
            return redirect(url_for("guests.create", event_id=event.id))
        return redirect(url_for("guests.index", event_id=event.id))
    return render_template("guests/form.html", form=form, event=event, guest=None)


def show(guest_id):
    guest = load_guest(guest_id)
    link = invitation_service.invitation_url(guest)
    return render_template("guests/show.html", guest=guest, event=guest.event, invitation_link=link,
                           whatsapp_message=guest_service.whatsapp_message(guest, link),
                           qr_svg=qr_service.svg(invitation_service.checkin_url(guest), box_size=6))


def edit(guest_id):
    guest = load_guest(guest_id)
    form = GuestForm(obj=guest)
    if form.validate_on_submit():
        guest_service.update_guest(guest, clean_data(form), current_user)
        flash("Data tamu diperbarui.", "success")
        return redirect(url_for("guests.show", guest_id=guest.id))
    return render_template("guests/form.html", form=form, event=guest.event, guest=guest)


def delete(guest_id):
    guest = load_guest(guest_id)
    event_id = guest.event_id
    guest_service.delete_guest(guest, current_user)
    flash("Tamu dihapus.", "success")
    return redirect(url_for("guests.index", event_id=event_id))


def regenerate(guest_id):
    guest = load_guest(guest_id)
    guest_service.regenerate_tokens(guest, current_user)
    flash("Link undangan & QR baru telah dibuat. Link lama tidak berlaku lagi.", "success")
    return redirect(url_for("guests.show", guest_id=guest.id))


def toggle(guest_id):
    guest = load_guest(guest_id)
    guest_service.set_disabled(guest, not guest.is_disabled, current_user)
    flash("Undangan dinonaktifkan." if guest.is_disabled else "Undangan diaktifkan kembali.", "success")
    return redirect(_back_to_list(guest))


def send_whatsapp(guest_id):
    """Mark the invitation as sent, then hand off to WhatsApp click-to-chat."""
    guest = load_guest(guest_id)
    link = invitation_service.invitation_url(guest)
    guest_service.mark_sent(guest, current_user)
    return redirect(guest_service.whatsapp_url(guest, link))


def mark_sent(guest_id):
    guest = load_guest(guest_id)
    guest_service.mark_sent(guest, current_user)
    if is_htmx():
        return render_template("partials/invitation_badge.html", status=guest.invitation_status)
    return redirect(_back_to_list(guest))


def checkin(guest_id):
    guest = load_guest(guest_id)
    result = checkin_service.confirm(guest, guest.event_id, current_user,
                                     device_info="admin-panel", notes="Manual check-in dari admin")
    flash(result.message, "success" if result.ok else "error")
    return redirect(_back_to_list(guest))


def qr_svg(guest_id):
    guest = load_guest(guest_id)
    svg = qr_service.svg(invitation_service.checkin_url(guest))
    download = request.args.get("download")
    headers = {"Cache-Control": "no-store"}
    if download:
        headers["Content-Disposition"] = f'attachment; filename="qr-{guest.invitation_code}.svg"'
    return Response(svg, mimetype="image/svg+xml", headers=headers)


def qr_print(guest_id):
    guest = load_guest(guest_id)
    return render_template("guests/qr_print.html", guest=guest, event=guest.event,
                           qr_svg=qr_service.svg(invitation_service.checkin_url(guest)))


def import_guests(event_id):
    event = load_event(event_id)
    form = GuestImportForm()
    if form.validate_on_submit():
        result = guest_service.import_csv(event, form.file.data.stream, current_user)
        if result.ok:
            flash(result.message, "success")
            for err in result.data["errors"][:20]:
                flash(err, "warning")
            return redirect(url_for("guests.index", event_id=event.id))
        flash(result.message, "error")
    return render_template("guests/import.html", form=form, event=event)


def import_template(event_id):
    load_event(event_id)
    content = ("name,phone,email,category,company,group_name,max_guest_count,notes\n"
               "Andi,08123456789,andi@example.com,VIP,BumiTech,Keluarga,2,\n")
    return Response(content, mimetype="text/csv",
                    headers={"Content-Disposition": 'attachment; filename="guest-import-template.csv"'})


def export_guests(event_id):
    event = load_event(event_id)
    content = guest_service.export_csv(event, invitation_service.invitation_url)
    filename = f"guests-{slugify(event.name, 60)}.csv"
    return Response(content, mimetype="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})
