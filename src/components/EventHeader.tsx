import { eventInfo } from "@/lib/event";

export function EventHeader() {
  const event = eventInfo();
  return (
    <header className="text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Undangan</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-balance sm:text-4xl">{event.name}</h1>
      {(event.date || event.location) && (
        <div className="mt-3 space-y-1 text-sm text-zinc-600">
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-brand-100/70 to-transparent"
      />
      {children}
    </main>
  );
}
