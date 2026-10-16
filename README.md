# RSVP + QR Check-in

RSVP app for one event. Guests confirm attendance through a personal link (the admin adds them first and can email the invitation) or the public link, and receive a QR code on screen and by email. A guest may bring one companion (+1), who gets a separate QR code. The admin monitors confirmations and scans QR codes at the entrance.

**Stack:** Next.js 15 (App Router) · Supabase (Postgres) · Tailwind CSS 4 · deploys to Vercel

## Pages

| URL | For | Purpose |
|---|---|---|
| `/` | Guest | Public RSVP form: name, company, email, phone (optional), attending / not attending, optional companion → QR code (also emailed). Submitting again with the same email updates the answer |
| `/i/<code>` | Guest | Short personal link sent to the guest. Opens the confirmation form, or the QR page once the guest has confirmed |
| `/u/<token>` | Guest | Personal link: name and company are already filled in by the admin. The guest confirms attendance and may add a companion. Also used to change an answer later |
| `/tiket` | Guest | Get the QR code again by entering the same email |
| `/tiket/<token>` | Guest | Ticket page: QR code (plus the companion's QR code) + PNG download, with a reminder to save it and show it at registration |
| `/login` | Admin | Login with `ADMIN_PASSWORD` |
| `/admin` | Admin | Add guests (with optional email and phone), import guests from Excel (with a downloadable template), send the invitation email to one guest or to all at once, copy personal links, stats (attending / not attending / not answered / checked in), search, filters, manual check-in, delete, Excel (.xlsx) export, public link |
| `/admin/tamu/<id>` | Admin | Edit or delete a guest, copy their personal link, send the invitation or the QR code again by email |
| `/admin/scan` | Admin | Camera scanner → confirm the guest's name → check in |

Notes:
- Email is the identity on the public form and on `/tiket`, and is unique per guest. Submitting the public form again with the same email **updates** that guest's attendance, and the QR code stays the same (the name and company on record are kept). Name + company is not unique: two different people may share both.
- A guest added by the admin is "Belum konfirmasi" until they answer through their personal link.
- A companion (+1) is stored as a guest of their own, without an email, under the same company, linked to the guest who brought them. Max one per guest. When the admin changes the guest's company, the companion moves with them. The companion's QR code is shown and emailed together with the guest's. The companion is removed if the guest clears the name or changes to "not attending", and deleted together with the guest.
- The QR code contains only a random token, with no personal data. It uses error correction level H with the BUMITEC logo ([`src/assets/qr-logo.png`](src/assets/qr-logo.png)) in the middle.
- After a guest confirms "Hadir", the QR code (plus the companion's) is emailed automatically. The email is sent after the page responds, so a slow mail server doesn't delay the guest.
- A guest who answered "not attending" but still comes can be checked in from the scanner with the **Tetap check-in** button.
- **Import:** download the template from the import card on `/admin`, fill in the "Tamu" sheet (Nama and Perusahaan required, Email and Telepon optional), and upload it (.xlsx, max 4 MB / 2000 rows). Rows with an email that is already used, or without an email and with a name + company already on the list, are skipped and listed after the import.
- **Mass invitation:** sends the invitation to guests with an email who have not answered, either only those never invited or all of them (a reminder). The browser sends small batches one after another, so keep the page open until it finishes. Mind your SMTP provider's daily limit (Gmail: about 500 per day, Google Workspace: 2000).

## Setup

### 1. Supabase
1. Create a project at https://supabase.com.
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
   - If the table already exists, run the migrations you have not run yet instead, in order: [`migration_002_invites_plus_one.sql`](supabase/migration_002_invites_plus_one.sql) (personal links and companions), [`migration_003_email_short_link.sql`](supabase/migration_003_email_short_link.sql) (email and short links), [`migration_004_email_identity.sql`](supabase/migration_004_email_identity.sql) (email as the guest's identity; read the comments in the file if some guests share an email), [`migration_005_phone.sql`](supabase/migration_005_phone.sql) (phone number).
3. In **Project Settings → API Keys**, copy the **Secret key** (`sb_secret_...`), not the publishable key. The Project URL is `https://<project-ref>.supabase.co`.

### 2. Run locally
```bash
npm install
copy .env.example .env.local   # then fill in the values
npm run dev                    # http://localhost:3000
```

### 3. Deploy to Vercel
1. Push this folder to GitHub, then **Import Project** in Vercel (the Next.js framework is detected automatically).
2. In **Settings → Environment Variables**, add every variable from `.env.example`.
3. Deploy. Send the domain link (e.g. `https://rsvp-acara.vercel.app/`) to your guests.

> If you change `EVENT_NAME` / `EVENT_DATE` / `EVENT_LOCATION`, **redeploy** so the public pages update.

## Environment variables

| Name | Description |
|---|---|
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_...`). Used only on the server. The legacy `SUPABASE_SERVICE_ROLE_KEY` also works |
| `ADMIN_PASSWORD` | Password for `/login`. Changing it logs out every admin session |
| `EVENT_NAME`, `EVENT_DATE`, `EVENT_LOCATION` | Event details shown on the public pages and in emails |
| `APP_URL` | Public URL used for links in emails. Optional: defaults to the domain of the current request |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | SMTP server for email. Port 465 = TLS, 587 = STARTTLS. For Gmail use an [App Password](https://myaccount.google.com/apppasswords). Without these, no email is sent |
| `MAIL_FROM` | Sender name and address, e.g. `BUMITEC <noreply@bumitec.co.id>`. Defaults to `SMTP_USER` |

## Security
- The `guests` table has RLS enabled with no policies, so the Supabase anon key cannot access it. The app accesses the table only from the server with the secret key.
- The admin session is an HttpOnly cookie signed with HMAC and valid for 7 days.
- Anyone who knows a guest's email can open that guest's QR code. This follows the requested flow; the QR code is still useful only at the entrance.

## Legacy
The old Flask app (guest list + personal invitation links) was moved to [`legacy/`](legacy/). It is not used and not deployed (see `.vercelignore`). Delete it once it is no longer needed.
