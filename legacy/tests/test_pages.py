"""Smoke test: every admin page renders for a super admin."""
from app.services import rsvp_service


def test_admin_pages_render(admin_client, event, guest, admin):
    rsvp_service.submit_rsvp(guest.invitation_token, "attending", 2)
    urls = [
        "/dashboard", "/dashboard/stats", "/events", "/events/create", f"/events/{event.id}",
        f"/events/{event.id}/edit", f"/events/{event.id}/rsvp", f"/events/{event.id}/guests",
        f"/events/{event.id}/guests/create", f"/events/{event.id}/guests/import",
        f"/events/{event.id}/guests/import-template.csv", f"/guests/{guest.id}", f"/guests/{guest.id}/edit",
        f"/guests/{guest.id}/qr", "/checkin", f"/checkin?event_id={event.id}", f"/checkin/{guest.checkin_token}",
        "/admin/organizations", "/admin/organizations/create", f"/admin/organizations/{event.organization_id}/edit",
        "/admin/users", "/admin/users/create", f"/admin/users/{admin.id}/edit", "/admin/roles",
    ]
    for url in urls:
        resp = admin_client.get(url)
        assert resp.status_code == 200, url


def test_staff_cannot_open_admin_settings(staff_client):
    for url in ("/admin/organizations", "/admin/users", "/admin/roles"):
        assert staff_client.get(url).status_code == 403


def test_create_user_and_assign_event(admin_client, event, org, db):
    from app.models import Role, User

    role = db.session.scalar(db.select(Role).where(Role.name == "event_admin"))
    resp = admin_client.post("/admin/users/create", data={
        "name": "New Staff", "email": "new@example.com", "password": "longpassword", "role_id": role.id,
        "organization_id": org.id, "event_ids": [event.id], "active": "y"})
    assert resp.status_code == 302
    user = db.session.scalar(db.select(User).where(User.email == "new@example.com"))
    assert [e.id for e in user.events] == [event.id]


def test_revoking_permission_blocks_route(client, staff, event, db):
    from app.models import Role

    from .conftest import login

    role = db.session.scalar(db.select(Role).where(Role.name == "event_admin"))
    role.permissions = [p for p in role.permissions if p.code != "guest.manage"]
    db.session.commit()
    login(client, "staff@example.com")
    assert client.get(f"/events/{event.id}/guests").status_code == 403
