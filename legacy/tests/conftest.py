from datetime import date, time, timedelta

import pytest

from app import create_app
from app.cli import seed_roles_and_permissions
from app.extensions import db as _db
from app.models import Event, Organization, Role, User
from app.services import guest_service, rsvp_service


@pytest.fixture()
def app():
    app = create_app("testing")
    with app.app_context():
        _db.create_all()
        seed_roles_and_permissions()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def db(app):
    return _db


def make_user(email, role_name, org=None, password="password123", events=()):
    role = _db.session.scalar(_db.select(Role).where(Role.name == role_name))
    user = User(email=email, name=email.split("@")[0].title(), role=role, organization=org)
    user.set_password(password)
    user.events = list(events)
    _db.session.add(user)
    _db.session.commit()
    return user


def make_event(org, name="Annual Gathering", status="published", **kwargs):
    event = Event(organization=org, name=name, slug=kwargs.pop("slug", name.lower().replace(" ", "-")),
                  event_date=kwargs.pop("event_date", date.today() + timedelta(days=10)),
                  start_time=time(19, 0), end_time=time(22, 0), timezone="Asia/Jakarta",
                  venue_name="Jakarta Convention Center", status=status, **kwargs)
    _db.session.add(event)
    _db.session.commit()
    return event


@pytest.fixture()
def org(app):
    org = Organization(name="Demo EO")
    _db.session.add(org)
    _db.session.commit()
    return org


@pytest.fixture()
def admin(app, org):
    return make_user("admin@example.com", Role.SUPER_ADMIN, org)


@pytest.fixture()
def event(app, org):
    return make_event(org)


@pytest.fixture()
def staff(app, org, event):
    return make_user("staff@example.com", Role.EVENT_ADMIN, org, events=[event])


@pytest.fixture()
def guest(app, event, admin):
    return guest_service.create_guest(event, {"name": "Andi", "phone": "08123456789", "max_guest_count": 3}, admin)


@pytest.fixture()
def attending_guest(guest):
    result = rsvp_service.submit_rsvp(guest.invitation_token, "attending", 2)
    assert result.ok
    return guest


def login(client, email="admin@example.com", password="password123"):
    return client.post("/login", data={"email": email, "password": password}, follow_redirects=False)


@pytest.fixture()
def admin_client(client, admin):
    login(client)
    return client


@pytest.fixture()
def staff_client(client, staff):
    login(client, "staff@example.com")
    return client
