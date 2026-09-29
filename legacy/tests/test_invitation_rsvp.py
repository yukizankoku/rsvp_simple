from app.models import Rsvp
from app.services import rsvp_service


def test_public_invitation_personalized(client, guest):
    resp = client.get(f"/i/{guest.invitation_token}")
    html = resp.get_data(as_text=True)
    assert resp.status_code == 200
    assert "Andi" in html and guest.event.name in html


def test_public_invitation_hides_internal_data(client, guest, db):
    guest.notes = "SECRET-ADMIN-NOTE"
    db.session.commit()
    html = client.get(f"/i/{guest.invitation_token}").get_data(as_text=True)
    assert "SECRET-ADMIN-NOTE" not in html
    assert f"/guests/{guest.id}" not in html


def test_invitation_marks_opened_but_not_for_bots(client, guest, db):
    client.get(f"/i/{guest.invitation_token}", headers={"User-Agent": "WhatsApp/2.23"})
    db.session.refresh(guest)
    assert guest.invitation_status == "draft"
    client.get(f"/i/{guest.invitation_token}", headers={"User-Agent": "Mozilla/5.0 (iPhone)"})
    db.session.refresh(guest)
    assert guest.invitation_status == "opened"


def test_invalid_token(client):
    resp = client.get("/i/does-not-exist")
    assert resp.status_code == 404
    assert "tidak tersedia" in resp.get_data(as_text=True)
    assert rsvp_service.submit_rsvp("does-not-exist", "attending", 1).code == "not_found"


def test_cancelled_event(client, guest, db):
    guest.event.status = "cancelled"
    db.session.commit()
    resp = client.get(f"/i/{guest.invitation_token}")
    assert resp.status_code == 404
    assert "dibatalkan" in resp.get_data(as_text=True)


def test_rsvp_attending(client, guest, db):
    resp = client.post(f"/i/{guest.invitation_token}/rsvp",
                       data={"status": "attending", "guest_count": "2", "phone": "0812"})
    assert resp.status_code == 200
    rsvp = db.session.scalar(db.select(Rsvp).where(Rsvp.guest_id == guest.id))
    assert rsvp.status == "attending" and rsvp.guest_count == 2 and rsvp.confirmed_at is not None
    db.session.refresh(guest)
    assert guest.invitation_status == "responded"


def test_rsvp_not_attending_forces_zero(client, guest, db):
    client.post(f"/i/{guest.invitation_token}/rsvp", data={"status": "not_attending", "guest_count": "5"})
    rsvp = db.session.scalar(db.select(Rsvp).where(Rsvp.guest_id == guest.id))
    assert rsvp.status == "not_attending" and rsvp.guest_count == 0


def test_rsvp_invalid_guest_count(guest):
    assert rsvp_service.submit_rsvp(guest.invitation_token, "attending", 0).code == "invalid"
    assert rsvp_service.submit_rsvp(guest.invitation_token, "attending", "abc").code == "invalid"
    # max_guest_count for this guest is 3
    result = rsvp_service.submit_rsvp(guest.invitation_token, "attending", 4)
    assert result.code == "invalid" and "maksimal 3" in result.message


def test_rsvp_invalid_status(guest):
    assert rsvp_service.submit_rsvp(guest.invitation_token, "maybe", 1).code == "invalid"


def test_rsvp_update_keeps_single_row(client, guest, db):
    client.post(f"/i/{guest.invitation_token}/rsvp", data={"status": "attending", "guest_count": "2"})
    client.post(f"/i/{guest.invitation_token}/rsvp", data={"status": "attending", "guest_count": "3"})
    client.post(f"/i/{guest.invitation_token}/rsvp", data={"status": "not_attending"})
    rows = db.session.scalars(db.select(Rsvp).where(Rsvp.guest_id == guest.id)).all()
    assert len(rows) == 1
    assert rows[0].status == "not_attending"


def test_rsvp_htmx_returns_partial(client, guest):
    resp = client.post(f"/i/{guest.invitation_token}/rsvp", data={"status": "attending", "guest_count": "1"},
                       headers={"HX-Request": "true"})
    html = resp.get_data(as_text=True)
    assert 'id="rsvp-section"' in html and "<html" not in html
    assert "Tampilkan QR" in html


def test_dashboard_totals(guest, event, admin):
    from app.services import guest_service

    budi = guest_service.create_guest(event, {"name": "Budi"}, admin)
    citra = guest_service.create_guest(event, {"name": "Citra"}, admin)
    guest_service.create_guest(event, {"name": "Dewi"}, admin)
    rsvp_service.submit_rsvp(guest.invitation_token, "attending", 2)
    rsvp_service.submit_rsvp(budi.invitation_token, "attending", 1)
    rsvp_service.submit_rsvp(citra.invitation_token, "not_attending")
    stats = rsvp_service.dashboard([event.id])
    assert stats == {"total": 4, "attending": 2, "not_attending": 1, "pending": 1, "expected_guests": 3,
                     "checked_in": 0, "checked_in_people": 0}


def test_guest_qr_requires_attending(client, guest):
    assert client.get(f"/i/{guest.invitation_token}/qr").status_code == 403
    rsvp_service.submit_rsvp(guest.invitation_token, "attending", 1)
    resp = client.get(f"/i/{guest.invitation_token}/qr")
    assert resp.status_code == 200 and "<svg" in resp.get_data(as_text=True)


def test_calendar_ics(client, guest):
    resp = client.get(f"/i/{guest.invitation_token}/calendar.ics")
    body = resp.get_data(as_text=True)
    assert resp.mimetype == "text/calendar"
    assert "BEGIN:VEVENT" in body and "DTSTART:" in body
