from app.models import User

from .conftest import login


def test_login_success(client, admin):
    resp = login(client)
    assert resp.status_code == 302
    assert resp.headers["Location"].endswith("/dashboard")
    assert client.get("/dashboard").status_code == 200


def test_login_failure(client, admin):
    resp = login(client, password="wrong-password")
    assert resp.status_code == 200
    assert "Email atau password salah" in resp.get_data(as_text=True)
    assert client.get("/dashboard").status_code == 302


def test_login_unknown_email(client, admin):
    resp = login(client, email="nobody@example.com")
    assert "Email atau password salah" in resp.get_data(as_text=True)


def test_inactive_user_cannot_login(client, admin, db):
    admin.active = False
    db.session.commit()
    login(client)
    assert client.get("/dashboard").status_code == 302


def test_protected_route_redirects_to_login(client):
    resp = client.get("/events")
    assert resp.status_code == 302
    assert "/login" in resp.headers["Location"]


def test_logout(admin_client):
    resp = admin_client.post("/logout")
    assert resp.status_code == 302
    assert admin_client.get("/dashboard").status_code == 302


def test_password_is_hashed(admin):
    assert admin.password_hash != "password123"
    assert admin.check_password("password123")


def test_open_redirect_blocked(client, admin):
    resp = client.post("/login?next=https://evil.example.com", data={"email": "admin@example.com",
                                                                     "password": "password123"})
    assert resp.headers["Location"].endswith("/dashboard")


def test_email_lookup_case_insensitive(client, admin):
    resp = login(client, email="ADMIN@example.com")
    assert resp.status_code == 302
    assert isinstance(admin, User)
