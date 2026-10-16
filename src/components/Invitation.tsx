import Image from "next/image";
import poster from "@/assets/poster.jpg";
import { eventInfo } from "@/lib/event";

/**
 * Top of the guest RSVP pages: the event poster, the invitation letter and the event details.
 * `guestName` personalizes the greeting on a personal invitation link.
 */
export function Invitation({ guestName }: { guestName?: string }) {
  const event = eventInfo();
  const mapsUrl = event.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`
    : "";

  return (
    <>
      <h1 className="sr-only">{event.name}</h1>
      <Image src={poster} priority placeholder="blur" sizes="(max-width: 480px) 100vw, 448px"
        alt="AMRO System product launch by BUMITEC, Central Data Technology and Akamai: 11 November 2026, 09:00 - 14:00, Ashley Jakarta - Wahid Hasyim"
        className="h-auto w-full rounded-3xl border border-white/10 shadow-2xl shadow-black/40" />

      <section className="card-glass space-y-4 p-6 text-[15px] leading-relaxed text-brand-50/90">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">You&apos;re invited</p>
        <p className="text-lg font-semibold text-white">Dear {guestName ?? "Valued Partner"},</p>
        <p>
          BUMITEC, together with Central Data Technology (a member of CTI Group) and Akamai, cordially invites
          you to the launch of the <strong className="text-white">AMRO System</strong>.
        </p>
        <p>
          One system for any fleet: precision Maintenance, Repair, and Overhaul tailored for airlines, transit
          systems, and industrial fleets. Join us to discover how AMRO System keeps every fleet ready to run.
        </p>
        <p>We would be honoured by your presence. Kindly confirm your attendance using the form below.</p>
        <p>
          Warm regards,
          <br />
          <span className="font-semibold text-white">BUMITEC</span>
        </p>
      </section>

      {(event.date || event.location) && (
        <section className="card-glass p-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Event details</h2>
          <dl className="mt-4 space-y-4">
            {event.date && (
              <Detail icon={<CalendarIcon />} label="Date & time">{event.date}</Detail>
            )}
            {event.location && (
              <Detail icon={<PinIcon />} label="Venue">
                {event.location}
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-1 block text-sm font-medium text-brand-300 hover:text-white hover:underline">
                  Open in Google Maps ↗
                </a>
              </Detail>
            )}
          </dl>
        </section>
      )}

      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight text-white">Confirm your attendance</h2>
        <p className="mt-1 text-sm text-brand-100/80">Your QR code for registration will be sent to your email.</p>
      </div>
    </>
  );
}

function Detail({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-200">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-brand-100/70">{label}</dt>
        <dd className="font-medium break-words text-white">{children}</dd>
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
