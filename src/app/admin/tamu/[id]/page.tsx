import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink, SendEmailButton } from "@/components/AdminWidgets";
import { GuestEditForm } from "@/components/GuestEditForm";
import { formatDateTime } from "@/lib/format";
import { findById, findPlusOne } from "@/lib/guests";

export default async function EditGuestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guest = await findById(id);
  if (!guest) notFound();
  const [plusOne, host] = await Promise.all([
    guest.plus_one_of ? null : findPlusOne(guest.id),
    guest.plus_one_of ? findById(guest.plus_one_of) : null,
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-900">← Kembali ke daftar tamu</Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight">Edit tamu</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ditambahkan {formatDateTime(guest.created_at)}
          {guest.checked_in_at && <> · Check-in {formatDateTime(guest.checked_in_at)}</>}
        </p>
        {host && (
          <p className="mt-1 text-sm text-zinc-500">
            Pendamping dari{" "}
            <Link href={`/admin/tamu/${host.id}`} className="font-medium text-brand-600 hover:underline">{host.name}</Link>
          </p>
        )}
        {plusOne && (
          <p className="mt-1 text-sm text-zinc-500">
            Pendamping (+1):{" "}
            <Link href={`/admin/tamu/${plusOne.id}`} className="font-medium text-brand-600 hover:underline">{plusOne.name}</Link>
          </p>
        )}
      </div>
      {!guest.plus_one_of && <CopyLink path={`/i/${guest.short_code}`} label="Link pribadi tamu ini" />}
      {!guest.plus_one_of && guest.email && (
        <div className="card space-y-3 p-4">
          <div>
            <p className="font-medium">Kirim email ke {guest.email}</p>
            <p className="text-sm text-zinc-500">
              {guest.invited_at ? `Undangan terakhir dikirim ${formatDateTime(guest.invited_at)}.` : "Undangan belum pernah dikirim."}
              {guest.attending && " QR code dikirim otomatis saat tamu konfirmasi hadir."}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <SendEmailButton id={guest.id} label={guest.invited_at ? "Kirim ulang undangan" : "Kirim undangan"} />
            {guest.attending && <SendEmailButton id={guest.id} kind="ticket" label="Kirim ulang QR code" />}
          </div>
        </div>
      )}
      <GuestEditForm id={guest.id} name={guest.name} company={guest.company} email={guest.email} phone={guest.phone}
        attending={guest.attending}
        plusOneName={plusOne?.name} isPlusOne={!!guest.plus_one_of} />
      {guest.attending && (
        <Link href={`/tiket/${guest.token}`} target="_blank" className="block text-center text-sm text-brand-600 hover:underline">
          Lihat halaman QR tamu ↗
        </Link>
      )}
    </div>
  );
}
