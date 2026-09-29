# EO Event Management & Digital Invitation System

## 1. Tujuan

Bangun aplikasi SaaS untuk event organizer (EO) yang dapat digunakan untuk membuat event, mengelola guest list, mengirim undangan digital melalui unique link, menerima RSVP, dan melakukan check-in tamu menggunakan QR Code.

Target stack:

- Backend: Python Flask
- Database: PostgreSQL
- Frontend: Jinja2 + HTMX + Tailwind CSS
- Architecture: MVC
- Authentication: session-based login
- Database migration: Flask-Migrate / Alembic
- QR Code: Python QR code library
- PDF: optional, jika diperlukan
- Responsive: desktop + mobile

Prioritas utama: aplikasi harus sederhana, modular, mudah dikembangkan, dan cocok dijadikan produk SaaS untuk banyak event/client.

---

# 2. Core Flow

```text
Admin login
    ↓
Create Event
    ↓
Event Information
    ↓
Create / Import Guest List
    ↓
Generate Unique Invitation Link
    ↓
Send invitation link via WhatsApp / other channels
    ↓
Guest opens invitation
    ↓
Guest views event details
    ↓
Guest confirms RSVP
    ↓
RSVP status stored
    ↓
Admin monitors RSVP Dashboard
    ↓
Event day
    ↓
Guest shows/scans QR
    ↓
System verifies invitation
    ↓
Guest checked in
    ↓
Dashboard updates
```

---

# 3. User Roles

## 3.1 Super Admin

Can:

- manage organizations/clients
- manage users
- create/edit/delete events
- manage guests
- view RSVP
- manage invitation templates
- view check-in
- access all dashboard data

## 3.2 Event Admin / Staff

Can:

- access assigned events
- manage guest list
- view RSVP
- check-in guests
- resend invitation link
- view event dashboard

Permissions must be configurable per role.

---

# 4. Main Modules

## 4.1 Authentication

Features:

- Login
- Logout
- Session management
- Password hashing
- Role-based authorization
- User management
- Optional forgot password later

Suggested tables:

```text
users
roles
permissions
role_permissions
```

---

# 5. Organization / Client

Because this is intended as a SaaS, one account can manage multiple clients or organizations.

Example:

```text
Organization A
    ├── Wedding Event
    ├── Birthday Event
    └── Corporate Gathering

Organization B
    ├── Product Launch
    └── Company Anniversary
```

Table:

```text
organizations
```

Fields:

```text
id
name
description
logo
email
phone
address
status
created_at
updated_at
```

---

# 6. Event Management

Admin can create events.

Required fields:

```text
event
-----
id
organization_id
name
slug
description
event_type
event_date
start_time
end_time
timezone
venue_name
venue_address
latitude
longitude
cover_image
logo
status
created_at
updated_at
```

Possible event types:

```text
Wedding
Birthday
Gathering
Corporate
Seminar
Workshop
Concert
Product Launch
Other
```

Event status:

```text
draft
published
completed
cancelled
```

Event URL example:

```text
/events/my-event
```

---

# 7. Guest Management

Admin can add guests manually or import from CSV/Excel.

Guest fields:

```text
guests
------
id
event_id
name
phone
email
category
company
group_name
guest_code
invitation_code
invitation_status
notes
created_at
updated_at
```

Example categories:

```text
VIP
Family
Friend
Client
Vendor
Employee
General
Other
```

Each guest must have a unique invitation code.

Example:

```text
INV-8F3K29
INV-92JDK1
INV-A72MX8
```

Do not expose sequential database IDs as public invitation identifiers.

---

# 8. Unique Invitation Link

Every guest receives a unique URL.

Example:

```text
https://example.com/invitation/INV-8F3K29
```

or preferably use a secure random token:

```text
https://example.com/i/a8f7c91e2d...
```

Requirements:

- token must be unpredictable
- token must be unique
- public URL must not expose internal database ID
- invitation can be disabled
- invitation can be regenerated
- old token can optionally be invalidated

Guest opens the link and sees their personalized invitation.

Example:

```text
Hello Andi,

You are invited to:

BumiTech Annual Gathering 2026

Saturday, 10 October 2026
19:00 WIB

Jakarta Convention Center

[ Confirm Attendance ]
```

---

# 9. Invitation Page

Invitation page should be mobile-first.

Sections:

```text
Hero
↓
Guest Name
↓
Event Information
↓
Date / Time
↓
Venue
↓
Map
↓
Description
↓
RSVP
↓
Contact
```

Possible buttons:

```text
[ CONFIRM ATTENDANCE ]
[ OPEN MAP ]
[ ADD TO CALENDAR ]
[ CONTACT ORGANIZER ]
```

Optional:

- photo gallery
- countdown
- dress code
- agenda
- gift information
- custom message
- social media
- background music
- custom theme

---

# 10. RSVP

Guest should not need to create an account.

RSVP options:

```text
Will you attend?

[ YES, I WILL ATTEND ]
[ SORRY, I CANNOT ATTEND ]
```

If attending:

```text
Name
Number of guests
Phone number
Notes
```

Example:

```text
Name: Andi
Attendance: attending
Guest count: 2
Phone: 08123456789
```

RSVP table:

```text
rsvps
-----
id
guest_id
event_id
status
guest_count
phone
notes
confirmed_at
updated_at
```

Status:

```text
pending
attending
not_attending
```

Rules:

- one active RSVP per guest
- guest can update RSVP
- RSVP changes should update dashboard immediately
- `confirmed_at` is stored when RSVP is submitted
- guest count must be validated
- optional maximum guest count can be configured per guest

---

# 11. RSVP Dashboard

Admin dashboard must show:

```text
Total Invitations
Confirmed Attendance
Not Attending
Pending
Expected Guests
Checked In
```

Example:

```text
┌──────────────────────────────────────┐
│ RSVP SUMMARY                         │
├──────────┬──────────┬───────────────┤
│ TOTAL    │ ATTENDING│ NOT ATTENDING │
│ 350      │ 276      │ 42            │
└──────────┴──────────┴───────────────┘

Pending: 32

Expected Guests: 318
Checked In: 0
```

Dashboard should update using HTMX without requiring a full page reload.

---

# 12. Guest List

Admin needs a searchable guest table.

Columns:

```text
Name
Phone
Category
Invitation
RSVP
Guest Count
Check-in
Actions
```

Filters:

```text
Search name
Search phone
Category
Invitation status
RSVP status
Check-in status
```

Actions:

```text
View
Edit
Copy Invitation Link
Send Invitation
Regenerate Token
Check-in
```

---

# 13. Invitation Status

Possible values:

```text
draft
sent
opened
responded
disabled
```

Important:

`opened` is optional and should not be treated as proof that the guest personally opened the page, because link previews and automated crawlers may also access URLs.

---

# 14. QR Code

Every guest should have a QR code associated with their invitation.

QR can encode:

```text
https://example.com/checkin/{secure_token}
```

or another signed/opaque token.

Do not put sensitive guest information directly inside the QR payload.

Admin can:

```text
View QR
Download QR
Print QR
```

Optional invitation page can show:

```text
[ SHOW MY QR ]
```

---

# 15. Check-in

Event staff can use a mobile device to scan QR codes.

Flow:

```text
Scan QR
   ↓
Find invitation
   ↓
Validate event
   ↓
Validate token
   ↓
Find guest
   ↓
Check whether already checked in
   ↓
Confirm check-in
```

Check-in table:

```text
checkins
--------
id
event_id
guest_id
checked_in_at
checked_in_by
device_info
notes
```

Check-in status:

```text
not_checked_in
checked_in
```

If already checked in, show:

```text
⚠ Guest already checked in

Name: Andi
Checked in: 18:42
```

Do not create duplicate check-in records for the same guest unless a future feature explicitly supports multiple entries.

---

# 16. Check-in Dashboard

Show:

```text
Expected Guests
Checked In
Remaining
Check-in Percentage
```

Example:

```text
Expected Guests: 318
Checked In: 124
Remaining: 194

Check-in Progress
██████████░░░░░░░░░░ 39%
```

Show recent check-ins:

```text
18:42  Andi        2 guests
18:40  Budi        1 guest
18:39  Citra       3 guests
```

Use HTMX polling or another lightweight approach for live updates.

---

# 17. WhatsApp Sharing

Initial version does not need official WhatsApp API integration.

Provide a button:

```text
[ COPY INVITATION LINK ]
[ OPEN WHATSAPP ]
```

Generate a WhatsApp message:

```text
Halo Andi 👋

Kami mengundang Anda untuk menghadiri
BumiTech Annual Gathering 2026.

Detail undangan:
https://example.com/i/a8f7c91e2d

Mohon konfirmasi kehadiran melalui link tersebut.

Terima kasih 🙏
```

For the first MVP, use WhatsApp click-to-chat/manual sharing.

Official WhatsApp Business API can be added later.

---

# 18. Invitation Template

System should eventually support multiple invitation templates.

Table:

```text
invitation_templates
--------------------
id
organization_id
name
description
template_key
thumbnail
status
created_at
updated_at
```

Event can select a template:

```text
events.invitation_template_id
```

MVP can start with one template.

Architecture should not make future templates difficult.

---

# 19. Event Agenda

Optional module.

Table:

```text
event_agendas
------------
id
event_id
title
description
start_time
end_time
sort_order
```

Example:

```text
19:00 Guest Arrival
19:30 Opening
20:00 Dinner
21:00 Entertainment
22:00 Closing
```

---

# 20. Event Gallery

Optional module.

Tables:

```text
event_galleries
--------------
id
event_id
title
description
sort_order

event_gallery_items
-------------------
id
gallery_id
image
caption
sort_order
```

Do not make gallery mandatory for MVP.

---

# 21. Venue / Map

Event should support:

```text
venue_name
venue_address
latitude
longitude
```

Invitation page should provide:

```text
[ OPEN GOOGLE MAPS ]
```

Generate the map URL dynamically.

---

# 22. Calendar Integration

Invitation page should optionally provide:

```text
[ ADD TO GOOGLE CALENDAR ]
[ DOWNLOAD .ICS ]
```

Generate calendar data from:

```text
event name
description
start date/time
end date/time
venue
```

---

# 23. Database Relationships

Basic relationship:

```text
Organization
    │
    ├── Users
    │
    └── Events
          │
          ├── Guests
          │     │
          │     ├── RSVP
          │     └── Check-in
          │
          ├── Agenda
          │
          ├── Gallery
          │
          └── Invitation Template
```

Foreign keys should use PostgreSQL constraints.

Use appropriate indexes for:

```text
events.slug
guests.event_id
guests.invitation_code
rsvps.guest_id
rsvps.event_id
checkins.guest_id
checkins.event_id
```

Unique constraints should be used where appropriate.

---

# 24. Suggested Flask Structure

Use MVC-style separation.

```text
project/
│
├── app/
│   ├── __init__.py
│   ├── config.py
│   │
│   ├── models/
│   │   ├── user.py
│   │   ├── organization.py
│   │   ├── event.py
│   │   ├── guest.py
│   │   ├── rsvp.py
│   │   └── checkin.py
│   │
│   ├── controllers/
│   │   ├── auth_controller.py
│   │   ├── event_controller.py
│   │   ├── guest_controller.py
│   │   ├── invitation_controller.py
│   │   ├── rsvp_controller.py
│   │   └── checkin_controller.py
│   │
│   ├── repositories/
│   │   ├── user_repository.py
│   │   ├── event_repository.py
│   │   ├── guest_repository.py
│   │   ├── rsvp_repository.py
│   │   └── checkin_repository.py
│   │
│   ├── services/
│   │   ├── invitation_service.py
│   │   ├── rsvp_service.py
│   │   ├── qr_service.py
│   │   └── checkin_service.py
│   │
│   ├── routes/
│   │   ├── auth_routes.py
│   │   ├── event_routes.py
│   │   ├── guest_routes.py
│   │   ├── invitation_routes.py
│   │   ├── rsvp_routes.py
│   │   └── checkin_routes.py
│   │
│   ├── templates/
│   │   ├── base.html
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── events/
│   │   ├── guests/
│   │   ├── invitation/
│   │   └── checkin/
│   │
│   └── static/
│       ├── css/
│       ├── js/
│       ├── images/
│       └── uploads/
│
├── migrations/
├── tests/
├── .env.example
├── requirements.txt
├── run.py
└── README.md
```

Adjust this structure if the existing project has a different convention, but preserve separation between routes/controllers, business logic, repositories, and templates.

---

# 25. Flask Routes

## Admin

```text
GET  /login
POST /login
POST /logout

GET  /dashboard

GET  /events
GET  /events/create
POST /events/create
GET  /events/<id>
GET  /events/<id>/edit
POST /events/<id>/edit
POST /events/<id>/delete

GET  /events/<id>/guests
GET  /events/<id>/guests/create
POST /events/<id>/guests/create
GET  /guests/<id>/edit
POST /guests/<id>/edit
POST /guests/<id>/delete

GET  /events/<id>/rsvp
GET  /events/<id>/checkins
```

## Public invitation

```text
GET  /i/<token>
POST /i/<token>/rsvp
GET  /i/<token>/qr
```

## Check-in

```text
GET  /checkin
POST /checkin/scan
GET  /checkin/<token>
POST /checkin/<token>/confirm
```

---

# 26. HTMX Usage

Use HTMX for:

- guest search
- guest filtering
- RSVP dashboard cards
- check-in result
- recent check-in list
- modal forms
- inline status updates
- pagination where appropriate

Example:

```html
<input
    type="text"
    name="search"
    hx-get="/events/{{ event.id }}/guests"
    hx-trigger="keyup changed delay:300ms"
    hx-target="#guest-table"
    hx-select="#guest-table"
>
```

Do not overuse HTMX. Normal navigation is acceptable where it makes the implementation simpler.

---

# 27. Tailwind UI

Use a clean SaaS dashboard style.

Main layout:

```text
Sidebar
    Dashboard
    Events
    Guests
    RSVP
    Check-in
    Settings

Topbar
    Organization
    User
```

Cards:

```text
Total Guests
Attending
Not Attending
Pending
Checked In
```

Use responsive design.

Guest invitation page must prioritize mobile UX.

---

# 28. Security Requirements

Important:

- hash passwords with a secure password hashing algorithm
- CSRF protection for admin forms
- validate all input
- parameterized SQL / ORM queries
- secure session configuration
- authorization checks on every protected route
- never trust event_id from client without checking access
- invitation tokens must be cryptographically random
- do not expose internal IDs unnecessarily
- rate-limit public RSVP endpoints if possible
- prevent duplicate RSVP submissions
- prevent unauthorized check-in
- validate that token belongs to the requested event
- sanitize uploaded files
- restrict upload file types
- limit upload file size

Never put passwords, database credentials, API keys, or secrets in source code.

---

# 29. MVP Scope

Build these FIRST:

### Phase 1

Authentication:

- Login
- Logout
- User role

Event:

- Create event
- Edit event
- Event list
- Event detail

Guest:

- Add guest
- Edit guest
- Delete guest
- Search guest
- Generate invitation token

Invitation:

- Public invitation page
- Personalized guest name
- Event information
- Unique invitation link

RSVP:

- Attending
- Not attending
- Guest count
- RSVP dashboard

QR:

- Generate QR
- Display QR

Check-in:

- Scan / enter token
- Verify guest
- Check-in
- Prevent duplicate check-in

Dashboard:

- Total guest
- Attending
- Not attending
- Pending
- Expected guest
- Checked in

---

# 30. Do NOT Build Yet

Do not implement these until MVP works:

- payment gateway
- subscription billing
- WhatsApp Business API
- complex drag-and-drop invitation builder
- advanced analytics
- email marketing
- multi-language
- custom domains
- AI features
- complicated permission matrix
- mobile native application

These can be added later.

---

# 31. Development Order

Claude should implement in this order:

```text
1. Project setup
2. Environment configuration
3. Database connection
4. Migration setup
5. Authentication
6. Organization
7. Event CRUD
8. Guest CRUD
9. Invitation token generation
10. Public invitation page
11. RSVP
12. RSVP dashboard
13. QR generation
14. Check-in
15. Check-in dashboard
16. Responsive UI improvements
17. Validation
18. Security hardening
19. Tests
20. README
```

Do not jump directly into advanced features.

---

# 32. Database Migration

Use migrations from the beginning.

Never ask the developer to manually create production tables.

Initial migration should create:

```text
organizations
users
roles
permissions
role_permissions
events
guests
rsvps
checkins
invitation_templates
```

Add indexes and foreign keys.

---

# 33. API / Service Separation

Business logic should not be placed directly inside route functions.

Bad:

```python
@app.post("/i/<token>/rsvp")
def rsvp(token):
    # 100 lines of database logic
```

Preferred:

```python
@app.post("/i/<token>/rsvp")
def rsvp(token):
    result = rsvp_service.submit_rsvp(...)
    return ...
```

Repositories handle database access.

Services handle business rules.

Controllers/routes handle HTTP concerns.

---

# 34. RSVP Business Rules

Implement:

```text
1. Validate invitation token
2. Find guest
3. Confirm invitation is active
4. Validate submitted RSVP
5. Validate guest_count
6. Create/update RSVP
7. Store confirmed_at
8. Return success response
```

If guest chooses `not_attending`:

```text
guest_count = 0
```

If guest chooses `attending`:

```text
guest_count >= 1
```

Optional future field:

```text
max_guest_count
```

If configured:

```text
guest_count <= max_guest_count
```

---

# 35. Check-in Business Rules

```text
1. Validate token
2. Find guest
3. Verify guest belongs to event
4. Verify RSVP / attendance policy
5. Check whether already checked in
6. Create check-in
7. Return guest information
```

Default policy:

Only guests with RSVP `attending` should be checked in.

However, admin should have a setting to allow walk-in guests.

Future setting:

```text
allow_walk_in
```

---

# 36. Public Invitation Security

Public invitation token should not expose:

```text
user ID
organization ID
database primary key
password
internal notes
```

Guest-facing data should be limited to information needed for the invitation.

For example, do not show:

```text
admin notes
guest category
internal CRM information
```

unless explicitly configured.

---

# 37. Expected UX

## Admin

```text
Login
 ↓
Dashboard
 ↓
Create Event
 ↓
Add Guests
 ↓
Copy invitation links
 ↓
Monitor RSVP
 ↓
Event Day
 ↓
Open Check-in
 ↓
Scan guest QR
```

## Guest

```text
Open link
 ↓
See personalized invitation
 ↓
Click RSVP
 ↓
Choose attendance
 ↓
Enter guest count
 ↓
Submit
 ↓
Show confirmation
 ↓
Optional: show QR
```

---

# 38. Error Handling

Public invitation errors:

```text
Invitation not found
Invitation expired
Invitation disabled
Event cancelled
```

Friendly messages should be displayed.

Example:

```text
Sorry, this invitation is no longer available.
Please contact the event organizer.
```

Admin errors should be logged.

Do not expose stack traces in production.

---

# 39. Logging

Implement basic application logging.

Log:

- login success/failure
- RSVP submission
- RSVP update
- check-in
- invitation token regeneration
- important admin actions
- application errors

Do not log:

- passwords
- sensitive tokens in full
- secrets
- unnecessary personal data

---

# 40. Testing

Minimum tests:

### Authentication

```text
login success
login failure
protected route
logout
```

### Event

```text
create event
edit event
delete event
authorization
```

### Guest

```text
create guest
edit guest
delete guest
unique invitation token
```

### RSVP

```text
attending
not attending
invalid token
invalid guest count
duplicate/update RSVP
```

### Check-in

```text
valid QR
invalid token
already checked in
wrong event
```

---

# 41. Seed Data

Create a development seed command.

Example:

```text
Organization:
BumiTech Demo EO

Event:
BumiTech Annual Gathering 2026

Guests:
Andi
Budi
Citra
Dewi
```

Create sample RSVP states:

```text
Andi   attending      2
Budi   attending      1
Citra  not_attending  0
Dewi   pending        -
```

This makes the dashboard immediately testable.

---

# 42. Environment Variables

Provide `.env.example`.

Example:

```env
FLASK_ENV=development
SECRET_KEY=change-me

DATABASE_URL=postgresql://postgres:password@localhost:5432/eo_management

UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=10485760
```

Never commit `.env`.

---

# 43. Definition of Done

MVP is considered complete when:

- admin can login
- admin can create an event
- admin can add guests
- every guest receives a unique invitation URL
- guest can open invitation without login
- guest can RSVP
- RSVP appears in admin dashboard
- guest can display QR
- staff can check in guest
- duplicate check-in is prevented
- dashboard shows correct totals
- application works on desktop
- invitation works well on mobile
- database is created through migrations
- basic tests pass
- README contains setup instructions

---

# 44. Instructions to Claude

You are the lead developer for this project.

Build the application incrementally.

Important instructions:

1. Do not implement every future feature at once.
2. Start with the MVP.
3. Before coding, inspect the existing repository if one is provided.
4. Preserve existing working code unless there is a clear reason to change it.
5. Use clean MVC separation.
6. Keep database access separated from HTTP routes.
7. Use PostgreSQL.
8. Use migrations.
9. Use HTMX where it simplifies partial updates.
10. Use Tailwind CSS for UI.
11. Make the invitation page mobile-first.
12. Use secure random invitation tokens.
13. Never expose internal database IDs in public invitation URLs.
14. Validate authorization for every admin action.
15. Do not hardcode secrets.
16. Add tests for core business rules.
17. Keep functions small and readable.
18. Avoid unnecessary dependencies.
19. Prefer simple solutions over premature abstraction.
20. After completing each major module, verify that the application still runs.

When generating code, provide complete files or clearly identified patches that can be applied directly.

At the end of each implementation phase, report:

```text
Implemented:
- ...

Files changed:
- ...

Database changes:
- ...

How to run:
- ...

Next recommended phase:
- ...
```

Start with Phase 1: project setup, configuration, PostgreSQL connection, migration system, and authentication.
