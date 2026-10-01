# RSVP + QR Check-in

RSVP app for one event. Guests confirm attendance through a personal link (the admin adds them first) or the public link, and receive a QR code. A guest may bring one companion (+1), who gets a separate QR code. The admin monitors confirmations and scans QR codes at the entrance.

**Stack:** Next.js 15 (App Router) · Supabase (Postgres) · Tailwind CSS 4 · deploys to Vercel

## Pages

| URL | For | Purpose |
|---|---|---|
| `/` | Guest | Public RSVP form: name, company, attending / not attending, optional companion → QR code |
| `/u/<token>` | Guest | Personal link: name and company are already filled in by the admin. The guest confirms attendance and may add a companion. Also used to change an answer later |
| `/tiket` | Guest | Get the QR code again by entering the same name and company |
| `/tiket/<token>` | Guest | Ticket page: QR code (plus the companion's QR code) + PNG download, with a reminder to save it and show it at registration |
| `/login` | Admin | Login with `ADMIN_PASSWORD` |
| `/admin` | Admin | Add guests, copy personal links, stats (attending / not attending / not answered / checked in), search, filters, manual check-in, CSV export, public link |
| `/admin/tamu/<id>` | Admin | Edit or delete a guest, copy their personal link |
| `/admin/scan` | Admin | Camera scanner → confirm the guest's name → check in |

Notes:
- Name + company is the identity. Submitting the form again with the same name + company (case and spacing do not matter) **updates** that guest's attendance, and the QR code stays the same.
- A guest added by the admin is "Belum konfirmasi" until they answer through their personal link.
- A companion (+1) is stored as a guest of their own, under the same company, linked to the guest who brought them. Max one per guest. The companion is removed if the guest clears the name or changes to "not attending", and deleted together with the guest.
- The QR code contains only a random token, with no personal data.
- A guest who answered "not attending" but still comes can be checked in from the scanner with the **Tetap check-in** button.

## Setup

### 1. Supabase
1. Create a project at https://supabase.com.
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
   - If the table was created before personal links and companions were added, run [`supabase/migration_002_invites_plus_one.sql`](supabase/migration_002_invites_plus_one.sql) instead.
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
