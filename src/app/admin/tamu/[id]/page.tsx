import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink } from "@/components/AdminWidgets";
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
      {!guest.plus_one_of && <CopyLink path={`/u/${guest.token}`} label="Link pribadi tamu ini" />}
      <GuestEditForm id={guest.id} name={guest.name} company={guest.company} attending={guest.attending}
        plusOneName={plusOne?.name} />
      {guest.attending && (
        <Link href={`/tiket/${guest.token}`} target="_blank" className="block text-center text-sm text-brand-600 hover:underline">
          Lihat halaman QR tamu ↗
        </Link>
      )}
    </div>
  );
}
