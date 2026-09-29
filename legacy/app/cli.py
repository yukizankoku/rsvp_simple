"""Flask CLI commands: `flask seed-roles`, `flask create-admin`, `flask seed-demo`."""
from datetime import date, time, timedelta

import click

from .extensions import db
from .models import Event, InvitationTemplate, Organization, Permission, Role, Rsvp, User
from .models.base import utcnow
from .repositories import user_repository
from .services import guest_service
from .utils.permissions import DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, ROLE_LABELS


def seed_roles_and_permissions():
    """Idempotently create permissions, roles and the default template."""
    perms = {}
    for code, desc in PERMISSIONS.items():
        perm = user_repository.get_permission_by_code(code) or Permission(code=code)
        perm.description = desc
        db.session.add(perm)
        perms[code] = perm
    db.session.flush()

    for name, codes in DEFAULT_ROLE_PERMISSIONS.items():
        role = user_repository.get_role_by_name(name)
        if role is None:
            role = Role(name=name, label=ROLE_LABELS[name])
            role.permissions = [perms[c] for c in codes]
            db.session.add(role)
        elif name == Role.SUPER_ADMIN:
            role.permissions = list(perms.values())

    if not db.session.scalar(db.select(InvitationTemplate).where(InvitationTemplate.template_key == "classic")):
        db.session.add(InvitationTemplate(name="Classic", template_key="classic",
                                          description="Template default, mobile-first."))
    db.session.commit()


def _create_user(email, name, password, role_name, organization=None):
    user = user_repository.get_by_email(email)
    if user:
        return user, False
    user = User(email=email.lower(), name=name, role=user_repository.get_role_by_name(role_name),
                organization=organization)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return user, True


def register_cli(app):
    @app.cli.command("seed-roles")
    def seed_roles():
        """Create/refresh roles, permissions and the default invitation template."""
        seed_roles_and_permissions()
        click.echo("Roles, permissions and templates are ready.")

    @app.cli.command("create-admin")
    @click.option("--email", prompt=True)
    @click.option("--name", prompt=True, default="Super Admin")
    @click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True)
    def create_admin(email, name, password):
        """Create a super admin user."""
        if len(password) < 8:
            raise click.BadParameter("Password minimal 8 karakter.")
        seed_roles_and_permissions()
        user, created = _create_user(email, name, password, Role.SUPER_ADMIN)
        click.echo(f"Super admin {'created' if created else 'already exists'}: {user.email}")

    @app.cli.command("seed-demo")
    @click.option("--password", default="password123", show_default=True, help="Password for demo users.")
    def seed_demo(password):
        """Create demo organization, event, guests and RSVP states (development only)."""
        seed_roles_and_permissions()
        org = db.session.scalar(db.select(Organization).where(Organization.name == "BumiTech Demo EO"))
        if org is None:
            org = Organization(name="BumiTech Demo EO", email="hello@bumitech.example", phone="02150001234",
                               address="Jakarta, Indonesia")
            db.session.add(org)
            db.session.commit()

        admin, _ = _create_user("admin@example.com", "Super Admin", password, Role.SUPER_ADMIN, org)
        staff, _ = _create_user("staff@example.com", "Staff Check-in", password, Role.EVENT_ADMIN, org)

        event = db.session.scalar(db.select(Event).where(Event.slug == "bumitech-annual-gathering-2026"))
        if event is None:
            event = Event(
                organization=org, name="BumiTech Annual Gathering 2026", slug="bumitech-annual-gathering-2026",
                event_type="Gathering", event_date=date.today() + timedelta(days=15),
                start_time=time(19, 0), end_time=time(22, 0), timezone="Asia/Jakarta",
                venue_name="Jakarta Convention Center",
                venue_address="Jl. Gatot Subroto, Senayan, Jakarta Pusat",
                latitude=-6.214620, longitude=106.807460,
                description="Malam apresiasi tahunan untuk seluruh keluarga besar BumiTech.",
                invitation_message="Kehadiran Anda adalah kehormatan bagi kami.",
                dress_code="Smart casual", contact_name="Panitia BumiTech", contact_phone="081234567890",
                status="published",
            )
            db.session.add(event)
            db.session.commit()
            samples = [("Andi", "081200000001", "VIP", "attending", 2),
                       ("Budi", "081200000002", "Client", "attending", 1),
                       ("Citra", "081200000003", "Friend", "not_attending", 0),
                       ("Dewi", "081200000004", "Family", None, None)]
            for name, phone, category, status, count in samples:
                guest = guest_service.create_guest(event, {"name": name, "phone": phone, "category": category,
                                                           "max_guest_count": 4}, admin)
                if status:
                    db.session.add(Rsvp(guest_id=guest.id, event_id=event.id, status=status,
                                        guest_count=count, confirmed_at=utcnow()))
                    guest.invitation_status = "responded"
            db.session.commit()

        if event not in staff.events:
            staff.events.append(event)
            db.session.commit()

        click.echo("Demo data ready.")
        click.echo(f"  Super admin : admin@example.com / {password}")
        click.echo(f"  Staff       : staff@example.com / {password}")
        click.echo(f"  Event       : {event.name} (id={event.id})")
