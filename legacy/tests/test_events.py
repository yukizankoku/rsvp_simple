from app.models import Event, Guest

from .conftest import make_event


def _event_form(org, **overrides):
    data = {"organization_id": org.id, "name": "Product Launch", "event_type": "Product Launch",
            "status": "published", "event_date": "2026-12-01", "start_time": "19:00", "end_time": "21:00",
            "timezone": "Asia/Jakarta", "venue_name": "JCC", "invitation_template_id": 0}
    data.update(overrides)
    return data


def test_create_event(admin_client, org, db):
    resp = admin_client.post("/events/create", data=_event_form(org))
    assert resp.status_code == 302
    event = db.session.scalar(db.select(Event).where(Event.name == "Product Launch"))
    assert event is not None
    assert event.slug == "product-launch"


def test_create_event_unique_slug(admin_client, org, db):
    admin_client.post("/events/create", data=_event_form(org))
    admin_client.post("/events/create", data=_event_form(org))
    slugs = sorted(db.session.scalars(db.select(Event.slug)).all())
    assert slugs == ["product-launch", "product-launch-2"]


def test_create_event_validation(admin_client, org, db):
    resp = admin_client.post("/events/create", data=_event_form(org, start_time="20:00", end_time="19:00"))
    assert resp.status_code == 200
    assert "Jam selesai harus setelah jam mulai" in resp.get_data(as_text=True)
    assert db.session.scalar(db.select(Event)) is None


def test_edit_event(admin_client, event, org, db):
    resp = admin_client.post(f"/events/{event.id}/edit", data=_event_form(org, name="Renamed", slug=event.slug))
    assert resp.status_code == 302
    db.session.refresh(event)
    assert event.name == "Renamed"


def test_delete_event_cascades_guests(admin_client, event, guest, db):
    resp = admin_client.post(f"/events/{event.id}/delete")
    assert resp.status_code == 302
    assert db.session.get(Event, event.id) is None
    assert db.session.scalar(db.select(Guest)) is None


def test_staff_cannot_create_or_delete_event(staff_client, org, event):
    assert staff_client.get("/events/create").status_code == 403
    assert staff_client.post(f"/events/{event.id}/delete").status_code == 403


def test_staff_only_sees_assigned_events(staff_client, org, event):
    other = make_event(org, name="Secret Event")
    assert staff_client.get(f"/events/{event.id}").status_code == 200
    assert staff_client.get(f"/events/{other.id}").status_code == 403
    assert staff_client.get(f"/events/{other.id}/guests").status_code == 403
    assert "Secret Event" not in staff_client.get("/events").get_data(as_text=True)


def test_event_dashboard_stats_partial(admin_client, event, attending_guest):
    resp = admin_client.get(f"/events/{event.id}/stats", headers={"HX-Request": "true"})
    assert resp.status_code == 200
    assert 'id="stat-cards"' in resp.get_data(as_text=True)
