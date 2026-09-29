from flask import abort, flash, redirect, render_template, request, url_for
from flask_login import current_user

from ..forms import clean_data
from ..forms.event_forms import EventForm
from ..models import Event
from ..repositories import checkin_repository, event_repository, rsvp_repository
from ..services import checkin_service, event_service
from ..utils.uploads import UploadError
from ._helpers import load_event


def _prepare_form(form, event=None):
    orgs = event_service.organizations_for(current_user)
    if event and event.organization and event.organization not in orgs:
        orgs = [event.organization] + list(orgs)
    form.organization_id.choices = [(o.id, o.name) for o in orgs]
    org_id = form.organization_id.data or (orgs[0].id if orgs else None)
    templates = event_repository.list_templates(org_id)
    form.invitation_template_id.choices = [(0, "Default")] + [(t.id, t.name) for t in templates]
    if not orgs:
        flash("Belum ada organisasi. Minta Super Admin menambahkan organisasi terlebih dahulu.", "warning")


def _check_org_allowed(form):
    allowed = {c[0] for c in form.organization_id.choices}
    if form.organization_id.data not in allowed:
        abort(403)


def index():
    search = request.args.get("q", "").strip()
    status = request.args.get("status") or None
    if status not in Event.STATUSES:
        status = None
    events = event_repository.list_for_user(current_user, search=search, status=status)
    return render_template("events/index.html", events=events, search=search, status=status,
                           statuses=Event.STATUSES)


def create():
    form = EventForm()
    if request.method == "GET":
        form.timezone.data = "Asia/Jakarta"
        form.status.data = "draft"
    _prepare_form(form)
    if form.validate_on_submit():
        _check_org_allowed(form)
        try:
            event = event_service.create_event(clean_data(form), request.files, current_user)
        except UploadError as exc:
            flash(str(exc), "error")
        else:
            flash("Event berhasil dibuat.", "success")
            return redirect(url_for("events.show", event_id=event.id))
    return render_template("events/form.html", form=form, event=None)


def show(event_id):
    event = load_event(event_id)
    stats = checkin_service.stats(event)
    recent_rsvps = rsvp_repository.list_responses(event.id, limit=8)
    return render_template("events/show.html", event=event, stats=stats, recent_rsvps=recent_rsvps)


def stats(event_id):
    event = load_event(event_id)
    return render_template("partials/stat_cards.html", stats=checkin_service.stats(event),
                           poll_url=url_for("events.stats", event_id=event.id), partial=True)


def edit(event_id):
    event = load_event(event_id)
    form = EventForm(obj=event)
    if request.method == "GET":
        form.invitation_template_id.data = event.invitation_template_id or 0
    _prepare_form(form, event)
    if form.validate_on_submit():
        _check_org_allowed(form)
        try:
            event_service.update_event(event, clean_data(form), request.files, current_user)
        except UploadError as exc:
            flash(str(exc), "error")
        else:
            flash("Event berhasil diperbarui.", "success")
            return redirect(url_for("events.show", event_id=event.id))
    return render_template("events/form.html", form=form, event=event)


def delete(event_id):
    event = load_event(event_id)
    event_service.delete_event(event, current_user)
    flash("Event dihapus.", "success")
    return redirect(url_for("events.index"))


def rsvp(event_id):
    event = load_event(event_id)
    status = request.args.get("status") or None
    if status not in ("attending", "not_attending"):
        status = None
    responses = rsvp_repository.list_responses(event.id, status=status)
    return render_template("events/rsvp.html", event=event, stats=checkin_service.stats(event),
                           responses=responses, status=status)


def checkins(event_id):
    event = load_event(event_id)
    return render_template("events/checkins.html", event=event, **_checkin_live_context(event))


def checkins_live(event_id):
    event = load_event(event_id)
    return render_template("partials/checkin_live.html", event=event, **_checkin_live_context(event))


def _checkin_live_context(event):
    return {"stats": checkin_service.stats(event), "recent": checkin_repository.recent(event.id, limit=20)}
