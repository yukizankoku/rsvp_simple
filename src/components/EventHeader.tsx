import { eventInfo } from "@/lib/event";

export function EventHeader() {
  const event = eventInfo();
  return (
    <header className="text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Invitation</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-balance text-white sm:text-4xl">{event.name}</h1>
      {(event.date || event.location) && (
        <div className="mt-3 space-y-1 text-sm text-brand-100/80">
          {event.date && <p>📅 {event.date}</p>}
          {event.location && <p>📍 {event.location}</p>}
        </div>
      )}
    </header>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative isolate mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-4 py-10 sm:py-16">
      {/* Fixed so the background fills the screen however long the page scrolls. */}
      <div aria-hidden className="bg-aurora pointer-events-none fixed inset-0 -z-10" />
      {children}
    </main>
  );
}
