import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EventHeader, PublicShell } from "@/components/EventHeader";
import { TicketCard } from "@/components/TicketCard";
import { findById, findByToken, findPlusOne } from "@/lib/guests";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const guest = await findByToken(token);
  if (!guest) notFound();

  // Added by the admin but not answered yet: send them to the confirmation form.
  if (guest.attending === null) redirect(`/u/${token}`);

  if (!guest.attending) {
    return (
      <PublicShell>
        <EventHeader />
        <div className="card space-y-3 p-8 text-center">
          <p className="text-4xl">🙏</p>
          <h2 className="text-lg font-semibold">Terima kasih, {guest.name}</h2>
          <p className="text-sm text-zinc-600">
            Konfirmasi Anda sudah kami terima: <strong>tidak hadir</strong>. Jika rencana berubah,
            Anda masih bisa mengubah konfirmasi.
          </p>
          <Link href={`/u/${token}`} className="btn btn-ghost mt-2 w-full">Ubah konfirmasi</Link>
        </div>
      </PublicShell>
    );
  }

  // A guest sees their companion's QR too. A companion sees only their own.
  const [plusOne, host] = await Promise.all([
    guest.plus_one_of ? null : findPlusOne(guest.id),
    guest.plus_one_of ? findById(guest.plus_one_of) : null,
  ]);

  return (
    <PublicShell>
      <EventHeader />

      <div role="alert" className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
        <span aria-hidden className="text-xl leading-6">⚠️</span>
        <div className="text-sm">
          <p className="font-semibold">Simpan QR code {plusOne ? "di bawah ini" : "ini"}</p>
          <p className="mt-0.5">
            Unduh atau screenshot QR code, lalu <strong>tunjukkan kepada petugas saat registrasi acara</strong>.
            {plusOne && " Setiap orang memakai QR code masing-masing."}
          </p>
        </div>
      </div>

      <TicketCard guest={guest} label={host ? `Pendamping dari ${host.name}` : "✓ Kehadiran terkonfirmasi"} />
      {plusOne && <TicketCard guest={plusOne} label="Pendamping (+1)" />}

      <div className="space-y-2 text-center text-xs text-zinc-500">
        {!guest.plus_one_of && (
          <p>
            Perlu mengubah kehadiran atau pendamping?{" "}
            <Link href={`/u/${token}`} className="font-medium text-brand-600 hover:underline">Ubah konfirmasi</Link>
          </p>
        )}
        <p>
          QR code bisa dibuka lagi lewat halaman{" "}
          <Link href="/tiket" className="font-medium text-brand-600 hover:underline">Lihat QR code</Link>{" "}
          dengan mengisi nama dan perusahaan Anda.
        </p>
      </div>
    </PublicShell>
  );
}
