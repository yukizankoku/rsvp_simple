import io

from app.models import Guest
from app.services import guest_service

from .conftest import make_event


def test_create_guest(admin_client, event, db):
    resp = admin_client.post(f"/events/{event.id}/guests/create",
                             data={"name": "Budi", "phone": "0812 1111", "category": "VIP"})
    assert resp.status_code == 302
    guest = db.session.scalar(db.select(Guest).where(Guest.name == "Budi"))
    assert guest.category == "VIP"
    assert guest.invitation_code.startswith("INV-")
    assert guest.invitation_status == "draft"


def test_edit_guest(admin_client, guest, db):
    resp = admin_client.post(f"/guests/{guest.id}/edit", data={"name": "Andi Wijaya", "category": "Family"})
    assert resp.status_code == 302
    db.session.refresh(guest)
    assert guest.name == "Andi Wijaya"


def test_delete_guest(admin_client, guest, db):
    guest_id = guest.id
    assert admin_client.post(f"/guests/{guest_id}/delete").status_code == 302
    assert db.session.get(Guest, guest_id) is None


def test_unique_invitation_tokens(event, admin):
    guests = [guest_service.create_guest(event, {"name": f"G{i}"}, admin) for i in range(50)]
    tokens = {g.invitation_token for g in guests} | {g.checkin_token for g in guests}
    codes = {g.invitation_code for g in guests}
    assert len(tokens) == 100
    assert len(codes) == 50
    assert all(len(g.invitation_token) >= 32 for g in guests)
    assert all(str(g.id) != g.invitation_token for g in guests)


def test_regenerate_token_invalidates_old_link(admin_client, client, guest, db):
    old = guest.invitation_token
    admin_client.post(f"/guests/{guest.id}/regenerate")
    db.session.refresh(guest)
    assert guest.invitation_token != old
    assert client.get(f"/i/{old}").status_code == 404
    assert client.get(f"/i/{guest.invitation_token}").status_code == 200


def test_disable_invitation(admin_client, client, guest, db):
    admin_client.post(f"/guests/{guest.id}/toggle")
    db.session.refresh(guest)
    assert guest.invitation_status == "disabled"
    assert client.get(f"/i/{guest.invitation_token}").status_code == 404


def test_search_guests(admin_client, event, admin):
    guest_service.create_guest(event, {"name": "Citra", "phone": "0811"}, admin)
    guest_service.create_guest(event, {"name": "Dewi", "phone": "0822"}, admin)
    html = admin_client.get(f"/events/{event.id}/guests?q=citr",
                            headers={"HX-Request": "true", "HX-Target": "guest-table"}).get_data(as_text=True)
    assert "Citra" in html and "Dewi" not in html
    assert "<html" not in html  # HTMX partial


def test_filter_by_rsvp_status(admin_client, event, attending_guest, admin):
    guest_service.create_guest(event, {"name": "Pending Person"}, admin)
    html = admin_client.get(f"/events/{event.id}/guests?rsvp_status=pending").get_data(as_text=True)
    assert "Pending Person" in html and "Andi" not in html


def test_guest_of_other_event_forbidden_for_staff(staff_client, org, admin):
    other = make_event(org, name="Other")
    g = guest_service.create_guest(other, {"name": "Hidden"}, admin)
    assert staff_client.get(f"/guests/{g.id}").status_code == 403
    assert staff_client.post(f"/guests/{g.id}/delete").status_code == 403


def test_import_csv(admin_client, event, db):
    csv_data = "name,phone,category,max_guest_count\nEka,0811,vip,2\n,0000,,\nFajar,0812,Unknown,abc\nGita,,,\n"
    resp = admin_client.post(f"/events/{event.id}/guests/import",
                             data={"file": (io.BytesIO(csv_data.encode()), "guests.csv")},
                             content_type="multipart/form-data")
    assert resp.status_code == 302
    names = set(db.session.scalars(db.select(Guest.name)).all())
    assert names == {"Eka", "Gita"}
    eka = db.session.scalar(db.select(Guest).where(Guest.name == "Eka"))
    assert eka.category == "VIP" and eka.max_guest_count == 2


def test_export_csv(admin_client, event, guest):
    resp = admin_client.get(f"/events/{event.id}/guests/export.csv")
    body = resp.get_data(as_text=True)
    assert resp.mimetype == "text/csv"
    assert guest.invitation_token in body


def test_whatsapp_marks_sent(admin_client, guest, db):
    resp = admin_client.post(f"/guests/{guest.id}/whatsapp")
    assert resp.status_code == 302
    assert resp.headers["Location"].startswith("https://wa.me/628123456789?text=")
    db.session.refresh(guest)
    assert guest.invitation_status == "sent"


def test_qr_svg(admin_client, guest):
    resp = admin_client.get(f"/guests/{guest.id}/qr.svg")
    assert resp.mimetype == "image/svg+xml"
    assert b"<svg" in resp.data
