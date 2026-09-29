from app.models import Checkin
from app.services import checkin_service, guest_service, rsvp_service

from .conftest import make_event


def _scan(client, code, event_id, auto=False):
    data = {"code": code, "event_id": event_id}
    if auto:
        data["auto_confirm"] = "1"
    return client.post("/checkin/scan", data=data, headers={"HX-Request": "true"})


def test_valid_qr_verify_then_confirm(staff_client, attending_guest, event, db):
    resp = _scan(staff_client, f"http://testserver/checkin/{attending_guest.checkin_token}", event.id)
    assert "Konfirmasi check-in" in resp.get_data(as_text=True)
    assert db.session.scalar(db.select(Checkin)) is None  # verify does not write

    resp = staff_client.post(f"/checkin/{attending_guest.checkin_token}/confirm", data={"event_id": event.id},
                             headers={"HX-Request": "true"})
    assert "Check-in berhasil" in resp.get_data(as_text=True)
    assert resp.headers.get("HX-Trigger") == "checkin-done"
    checkin = db.session.scalar(db.select(Checkin))
    assert checkin.guest_id == attending_guest.id and checkin.guest_count == 2


def test_checkin_by_invitation_code(staff_client, attending_guest, event):
    resp = _scan(staff_client, attending_guest.invitation_code.lower(), event.id, auto=True)
    assert "Check-in berhasil" in resp.get_data(as_text=True)


def test_invalid_token(staff_client, event):
    resp = _scan(staff_client, "not-a-real-token", event.id)
    assert "tidak valid" in resp.get_data(as_text=True)


def test_already_checked_in(staff_client, attending_guest, event, db):
    _scan(staff_client, attending_guest.checkin_token, event.id, auto=True)
    resp = _scan(staff_client, attending_guest.checkin_token, event.id, auto=True)
    assert "sudah check-in" in resp.get_data(as_text=True)
    assert len(db.session.scalars(db.select(Checkin)).all()) == 1


def test_wrong_event(staff_client, staff, attending_guest, org, db):
    other = make_event(org, name="Other Event")
    staff.events.append(other)
    db.session.commit()
    resp = _scan(staff_client, attending_guest.checkin_token, other.id, auto=True)
    assert "event lain" in resp.get_data(as_text=True)
    assert db.session.scalar(db.select(Checkin)) is None


def test_unassigned_staff_cannot_checkin(client, org, admin, db):
    from .conftest import login, make_user

    other = make_event(org, name="Other Event")
    g = guest_service.create_guest(other, {"name": "X"}, admin)
    rsvp_service.submit_rsvp(g.invitation_token, "attending", 1)
    make_user("s2@example.com", "event_admin", org)
    login(client, "s2@example.com")
    resp = client.post(f"/checkin/{g.checkin_token}/confirm", headers={"HX-Request": "true"})
    assert "tidak memiliki akses" in resp.get_data(as_text=True)
    assert db.session.scalar(db.select(Checkin)) is None


def test_not_attending_rejected_unless_walk_in(staff_client, guest, event, db):
    resp = _scan(staff_client, guest.checkin_token, event.id, auto=True)
    assert "belum mengonfirmasi" in resp.get_data(as_text=True)
    event.allow_walk_in = True
    db.session.commit()
    resp = _scan(staff_client, guest.checkin_token, event.id, auto=True)
    assert "Check-in berhasil" in resp.get_data(as_text=True)
    assert db.session.scalar(db.select(Checkin)).notes == "Walk-in"


def test_checkin_requires_login(client, attending_guest):
    resp = client.get(f"/checkin/{attending_guest.checkin_token}")
    assert resp.status_code == 302 and "/login" in resp.headers["Location"]


def test_invitation_token_is_not_a_checkin_token(staff_client, attending_guest, event):
    resp = _scan(staff_client, attending_guest.invitation_token, event.id, auto=True)
    assert "tidak valid" in resp.get_data(as_text=True)


def test_rsvp_locked_after_checkin(attending_guest, event, staff):
    checkin_service.confirm(attending_guest, event.id, staff)
    assert rsvp_service.submit_rsvp(attending_guest.invitation_token, "not_attending").code == "checked_in"


def test_checkin_stats(attending_guest, event, staff):
    checkin_service.confirm(attending_guest, event.id, staff)
    stats = checkin_service.stats(event)
    assert stats["expected_guests"] == 2
    assert stats["checked_in_people"] == 2
    assert stats["remaining"] == 0 and stats["percentage"] == 100


def test_checkin_dashboard_pages(staff_client, attending_guest, event):
    assert staff_client.get("/checkin").status_code == 200
    assert staff_client.get(f"/events/{event.id}/checkins").status_code == 200
    assert staff_client.get(f"/events/{event.id}/checkins/live").status_code == 200
    assert staff_client.get(f"/checkin/recent?event_id={event.id}").status_code == 200
