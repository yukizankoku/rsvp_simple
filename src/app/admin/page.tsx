import Link from "next/link";
import { AddGuestForm, AutoRefresh, CopyButton, CopyLink } from "@/components/AdminWidgets";
import { formatDateTime } from "@/lib/format";
import { listGuests, type Guest } from "@/lib/guests";
import { cancelCheckIn, manualCheckIn } from "./actions";

const FILTERS = {
  all: { label: "Semua", match: () => true },
  pending: { label: "Belum konfirmasi", match: (g: Guest) => g.attending === null },
  yes: { label: "Hadir", match: (g: Guest) => g.attending === true },
  no: { label: "Tidak hadir", match: (g: Guest) => g.attending === false },
  in: { label: "Sudah check-in", match: (g: Guest) => !!g.checked_in_at },
  waiting: { label: "Belum check-in", match: (g: Guest) => g.attending === true && !g.checked_in_at },
} as const;
type FilterKey = keyof typeof FILTERS;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; f?: string }>;
}) {
  const { q = "", f = "all" } = await searchParams;
  const filter: FilterKey = f in FILTERS ? (f as FilterKey) : "all";
  const guests = await listGuests();

  // Companions (+1) are guests too, so they are included in every count.
  const attending = guests.filter((g) => g.attending === true).length;
  const pending = guests.filter((g) => g.attending === null).length;
  const checkedIn = guests.filter((g) => g.checked_in_at).length;
  const stats = [
    { label: "Konfirmasi hadir", value: attending, accent: true },
    { label: "Tidak hadir", value: guests.length - attending - pending },
    { label: "Belum konfirmasi", value: pending },
    { label: "Sudah check-in", value: checkedIn, sub: attending ? `${Math.round((checkedIn / attending) * 100)}% dari yang hadir` : undefined },
  ];

  const byId = new Map(guests.map((g) => [g.id, g]));
  const plusOneOf = new Map(guests.filter((g) => g.plus_one_of).map((g) => [g.plus_one_of, g]));

  const needle = q.trim().toLowerCase();
  const rows = guests.filter(
    (g) =>
      FILTERS[filter].match(g) &&
      (!needle || g.name.toLowerCase().includes(needle) || g.company.toLowerCase().includes(needle)),
  );

  const filterHref = (key: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (key !== "all") params.set("f", key);
    const s = params.toString();
    return s ? `/admin?${s}` : "/admin";
  };

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <AddGuestForm />
      <CopyLink label="Link umum: tamu mengisi nama dan perusahaannya sendiri" />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`card p-4 sm:p-5 ${s.accent ? "border-brand-600 bg-brand-600 text-white" : ""}`}>
            <p className={`text-sm ${s.accent ? "text-brand-100" : "text-zinc-500"}`}>{s.label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{s.value}</p>
            {s.sub && <p className="mt-1 text-xs text-zinc-500">{s.sub}</p>}
          </div>
        ))}
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 sm:flex-row sm:items-center">
          <form className="flex-1">
            {filter !== "all" && <input type="hidden" name="f" value={filter} />}
            <input name="q" defaultValue={q} placeholder="Cari nama atau perusahaan…"
              className="input" type="search" />
          </form>
          <a href="/admin/export" className="btn btn-ghost w-full sm:w-auto">Export CSV</a>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-zinc-200 px-4 py-3">
          {Object.entries(FILTERS).map(([key, { label }]) => (
            <Link key={key} href={filterHref(key)}
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition ${
                key === filter ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}>
              {label}
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-zinc-500">
            {guests.length === 0 ? "Belum ada tamu. Tambahkan tamu di atas atau bagikan link umum." : "Tidak ada tamu yang cocok."}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {rows.map((g) => (
              // Mobile: name on top, status + action on a second row. sm+: everything on one row.
              <li key={g.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium break-words sm:truncate">{g.name}</p>
                  <p className="text-sm break-words text-zinc-500 sm:truncate">{g.company}</p>
                  {g.plus_one_of && (
                    <p className="text-xs break-words text-zinc-400 sm:truncate">
                      Pendamping dari {byId.get(g.plus_one_of)?.name ?? "tamu"}
                    </p>
                  )}
                  {plusOneOf.has(g.id) && (
                    <p className="text-xs break-words text-zinc-400 sm:truncate">
                      +1: {plusOneOf.get(g.id)!.name}
                    </p>
                  )}
                </div>
                <div className="flex min-h-10 items-center justify-between gap-3 sm:justify-end">
                  <GuestStatus guest={g} />
                  <div className="flex shrink-0 items-center justify-end gap-1 sm:w-48">
                    <Link href={`/admin/tamu/${g.id}`}
                      className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
                      Edit
                    </Link>
                    {g.checked_in_at ? (
                      <form action={cancelCheckIn}>
                        <input type="hidden" name="id" value={g.id} />
                        <button className="min-h-10 rounded-lg px-3 text-sm text-zinc-500 hover:bg-red-50 hover:text-red-600">
                          Batalkan
                        </button>
                      </form>
                    ) : g.attending === null ? (
                      <CopyButton path={`/u/${g.token}`} />
                    ) : g.attending ? (
                      <form action={manualCheckIn}>
                        <input type="hidden" name="token" value={g.token} />
                        <button className="min-h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-50">
                          Check-in
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-400">
          Menampilkan {rows.length} dari {guests.length} tamu
        </p>
      </section>
    </div>
  );
}

function GuestStatus({ guest }: { guest: Guest }) {
  if (guest.checked_in_at) {
    return (
      <span className="flex min-w-0 flex-col items-start gap-0.5 sm:items-end">
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          Check-in
        </span>
        <span className="text-xs text-zinc-400">{formatDateTime(guest.checked_in_at)}</span>
      </span>
    );
  }
  if (guest.attending === null) {
    return (
      <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        Belum konfirmasi
      </span>
    );
  }
  return guest.attending ? (
    <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">Hadir</span>
  ) : (
    <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500">Tidak hadir</span>
  );
}
