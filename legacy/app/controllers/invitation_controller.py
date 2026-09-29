"""Public, guest-facing invitation pages. No login required."""
from flask import Response, render_template, request

from ..forms.guest_forms import RsvpForm
from ..services import invitation_service, qr_service, rsvp_service
from ..utils.formatting import event_start_datetime


def _error_page(result, status=404):
    return render_template("invitation/error.html", code=result.code, message=result.message), status


def _can_show_qr(guest):
    return (guest.rsvp is not None and guest.rsvp.status == "attending") or guest.event.allow_walk_in


def _render(guest, form=None, result=None):
    event = guest.event
    if form is None:
        form = RsvpForm()
        if guest.rsvp:
            form.status.data = guest.rsvp.status if guest.rsvp.status != "pending" else None
            form.guest_count.data = guest.rsvp.guest_count or 1
            form.phone.data = guest.rsvp.phone
            form.notes.data = guest.rsvp.notes
        else:
            form.guest_count.data = 1
            form.phone.data = guest.phone
    return render_template(
        invitation_service.theme_template(event),
        guest=guest, event=event, form=form, result=result, rsvp=guest.rsvp,
        max_guest_count=rsvp_service.max_guest_count(guest),
        datetime_text=invitation_service.event_datetime_text(event),
        maps_url=invitation_service.maps_url(event),
        calendar_url=invitation_service.google_calendar_url(event),
        start_iso=event_start_datetime(event).isoformat(),
        can_show_qr=_can_show_qr(guest),
        is_checked_in=guest.is_checked_in,
    )


def show(token):
    result = invitation_service.resolve(token)
    if not result.ok:
        return _error_page(result)
    guest = result.data["guest"]
    invitation_service.mark_opened(guest, request.headers.get("User-Agent", ""))
    return _render(guest)


def submit_rsvp(token):
    resolved = invitation_service.resolve(token)
    if not resolved.ok:
        return _error_page(resolved)
    guest = resolved.data["guest"]

    form = RsvpForm()
    if not form.validate_on_submit():
        return _rsvp_response(guest, form, error="Periksa kembali isian Anda.")

    result = rsvp_service.submit_rsvp(token, form.status.data, form.guest_count.data,
                                      form.phone.data, form.notes.data)
    if result.ok:
        return _rsvp_response(guest, None, success=result.message)
    return _rsvp_response(guest, form, error=result.message)


def _rsvp_response(guest, form, success=None, error=None):
    if request.headers.get("HX-Request") == "true":
        if form is None:
            form = RsvpForm(status=guest.rsvp.status, guest_count=guest.rsvp.guest_count or 1,
                            phone=guest.rsvp.phone, notes=guest.rsvp.notes)
        return render_template("invitation/_rsvp.html", guest=guest, event=guest.event, form=form,
                               rsvp=guest.rsvp, success=success, error=error,
                               max_guest_count=rsvp_service.max_guest_count(guest),
                               can_show_qr=_can_show_qr(guest), is_checked_in=guest.is_checked_in)
    return _render(guest, form=form, result={"success": success, "error": error}), (200 if not error else 400)


def qr(token):
    result = invitation_service.resolve(token)
    if not result.ok:
        return _error_page(result)
    guest = result.data["guest"]
    if not _can_show_qr(guest):
        return render_template("invitation/error.html", code="rsvp_required",
                               message="Silakan konfirmasi kehadiran terlebih dahulu untuk menampilkan QR."), 403
    svg = qr_service.svg(invitation_service.checkin_url(guest))
    return render_template("invitation/qr.html", guest=guest, event=guest.event, qr_svg=svg,
                           datetime_text=invitation_service.event_datetime_text(guest.event))


def calendar_ics(token):
    result = invitation_service.resolve(token)
    if not result.ok:
        return _error_page(result)
    guest = result.data["guest"]
    return Response(invitation_service.ics_content(guest.event, guest), mimetype="text/calendar",
                    headers={"Content-Disposition": 'attachment; filename="event.ics"'})
