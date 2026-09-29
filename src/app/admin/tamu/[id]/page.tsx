import Link from "next/link";
import { notFound } from "next/navigation";
import { GuestEditForm } from "@/components/GuestEditForm";
import { formatDateTime } from "@/lib/format";
import { findById } from "@/lib/guests";

export default async function EditGuestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guest = await findById(id);
  if (!guest) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-900">← Kembali ke daftar tamu</Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight">Edit tamu</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Konfirmasi {formatDateTime(guest.created_at)}
          {guest.checked_in_at && <> · Check-in {formatDateTime(guest.checked_in_at)}</>}
        </p>
      </div>
      <GuestEditForm id={guest.id} name={guest.name} company={guest.company} attending={guest.attending} />
      <Link href={`/tiket/${guest.token}`} target="_blank" className="block text-center text-sm text-brand-600 hover:underline">
        Lihat halaman QR tamu ↗
      </Link>
    </div>
  );
}
