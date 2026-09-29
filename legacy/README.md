# EO Event Management & Digital Invitation

SaaS for event organizers: events, guest lists, personal invitation links, RSVP, and QR check-in.

**Stack:** Flask 3 · PostgreSQL · SQLAlchemy 2 + Flask-Migrate (Alembic) · Jinja2 + HTMX + Tailwind CSS · Flask-Login (session) · Flask-WTF (CSRF) · qrcode (SVG)

## Features (MVP Phase 1)

- **Auth**: login/logout, password hashing, roles (`super_admin`, `event_admin`) with per-role permissions that are configurable from *Settings → Role & Akses*
- **Organizations/clients** and **users**. Staff can only access the events assigned to them
- **Events**: CRUD, automatic slug, cover/logo upload (validated), walk-in setting
- **Guests**: CRUD, HTMX search and filters, CSV import/export, copy link, send via WhatsApp (click-to-chat), regenerate link + QR, disable invitation
- **Public invitation** `/i/<token>`: mobile-first, personalized, countdown, Google Maps, Google Calendar + `.ics`, contact the organizer
- **RSVP** without an account: attending / not attending, guest count (with a limit), editable, one row per guest
- **QR**: encodes `/checkin/<checkin_token>` (a separate token from the invitation link) with no personal data
- **Check-in**: camera scanner (html5-qrcode) or manual code entry, verify → confirm, duplicate check-in prevention (unique constraint), event validation, live dashboard (HTMX polling)
- **Dashboards**: Total, Attending, Not Attending, Pending, Expected Guests, Checked In, progress

## Setup

Requirements: Python 3.11+, PostgreSQL 13+. Node.js is only needed if you change the CSS.

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows  (Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt

copy .env.example .env          # Linux/macOS: cp .env.example .env
# Edit .env: SECRET_KEY (random), DATABASE_URL
#   python -c "import secrets; print(secrets.token_hex(32))"

createdb eo_management          # or: CREATE DATABASE eo_management;
flask db upgrade                # create all tables through migrations
flask seed-roles                # roles, permissions, default template

# Choose one:
flask create-admin              # create a super admin (interactive)
flask seed-demo                 # demo data: admin@example.com / staff@example.com (password123)

flask run                       # http://127.0.0.1:5000
```

### Demo data (`flask seed-demo`)

| Guest | RSVP | Count |
|---|---|---|
| Andi | attending | 2 |
| Budi | attending | 1 |
| Citra | not_attending | 0 |
| Dewi | pending | – |

## Tests

```bash
pytest                                            # SQLite in-memory (fast)
set TEST_DATABASE_URL=postgresql://.../eo_test    # optional: test against PostgreSQL
pytest
```

## Frontend (Tailwind)

The compiled CSS (`app/static/css/app.css`) and vendor JS (`htmx`, `html5-qrcode`) are already included, so no CDN is needed. To change styles:

```bash
npm install
npm run build:css     # or: npm run watch:css
npm run vendor        # copy htmx / html5-qrcode from node_modules
```

## Architecture

```
app/
  models/         SQLAlchemy models
  repositories/   Database access (queries)
  services/       Business rules (RSVP, check-in, invitation, guest, QR, admin)
  controllers/    HTTP handlers (thin; call services)
  routes/         Blueprints: URL → controller + permission guard
  forms/          WTForms (validation + CSRF)
  templates/      Jinja2 (admin, invitation/themes/<template_key>.html, checkin)
  utils/          permissions, tokens, rate limit, upload, formatting
migrations/       Alembic
tests/            pytest
```

Adding an invitation template: create `app/templates/invitation/themes/<key>.html`, then add an `invitation_templates` row with `template_key=<key>`. It can then be selected in the event form.

## Security

- Passwords are hashed with werkzeug (scrypt/pbkdf2), with a timing-safe login
- CSRF on every form, including HTMX (`X-CSRFToken` header)
- Tokens are `secrets.token_urlsafe(24)`. Public URLs never expose database IDs. Invitation and check-in tokens are separate
- Every admin route has a permission check, and every event/guest is checked against the user's assignments
- Rate limits on login and public RSVP (in-memory; for multiple workers, replace it with Redis/Flask-Limiter)
- Uploads: extension whitelist + magic-byte check, random file names, `MAX_CONTENT_LENGTH`
- Secure/HttpOnly/SameSite session cookies (`SESSION_COOKIE_SECURE=1` on HTTPS)
- Logs never contain passwords, and tokens are masked

## Production notes

- `FLASK_ENV=production`, use a WSGI server (e.g. `gunicorn "run:app"` / `waitress-serve --call run:app` on Windows) behind HTTPS
- Set `APP_BASE_URL` so links/QR codes use the public domain
- The camera scanner needs **HTTPS** (or localhost). Without HTTPS, staff can scan the QR with the phone's own camera, and the link opens the verification page (login required)

## Next phases (not built yet)

Event agenda, gallery, extra invitation templates, reminders/bulk WhatsApp (Business API), reporting/export PDF, forgot password.
