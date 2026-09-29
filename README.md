# RSVP + QR Check-in

RSVP app for one event. Guests confirm attendance through a public link and receive a QR code. The admin monitors confirmations and scans QR codes at the entrance.

**Stack:** Next.js 15 (App Router) · Supabase (Postgres) · Tailwind CSS 4 · deploys to Vercel

## Pages

| URL | For | Purpose |
|---|---|---|
| `/` | Guest | RSVP form: name, company, attending / not attending → QR code |
| `/tiket` | Guest | Get the QR code again by entering the same name and company |
| `/tiket/<token>` | Guest | Ticket page: QR code + PNG download |
| `/login` | Admin | Login with `ADMIN_PASSWORD` |
| `/admin` | Admin | Stats (attending / not attending / checked in), search, filters, manual check-in, CSV export, public link |
| `/admin/scan` | Admin | Camera scanner → confirm the guest's name → check in |

Notes:
- Name + company is the identity. Submitting the form again with the same name + company (case and spacing do not matter) **updates** that guest's attendance, and the QR code stays the same.
- The QR code contains only a random token, with no personal data.
- A guest who answered "not attending" but still comes can be checked in from the scanner with the **Tetap check-in** button.

## Setup

### 1. Supabase
1. Create a project at https://supabase.com.
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
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
| `EVENT_NAME`, `EVENT_DATE`, `EVENT_LOCATION` | Event details shown on the public pages |

## Security
- The `guests` table has RLS enabled with no policies, so the Supabase anon key cannot access it. The app accesses the table only from the server with the secret key.
- The admin session is an HttpOnly cookie signed with HMAC and valid for 7 days.
- Anyone who knows a guest's name + company can open that guest's QR code. This follows the requested flow; the QR code is still useful only at the entrance.

## Legacy
The old Flask app (guest list + personal invitation links) was moved to [`legacy/`](legacy/). It is not used and not deployed (see `.vercelignore`). Delete it once it is no longer needed.
