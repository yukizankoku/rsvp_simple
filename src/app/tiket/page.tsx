import Link from "next/link";
import { EventHeader, PublicShell } from "@/components/EventHeader";
import { LookupForm } from "@/components/LookupForm";

export default function LookupPage() {
  return (
    <PublicShell>
      <EventHeader />
      <div className="text-center">
        <h2 className="text-lg font-semibold">Ambil QR code Anda</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Isi nama dan perusahaan yang sama seperti saat konfirmasi.
        </p>
      </div>
      <LookupForm />
      <p className="text-center text-sm text-zinc-600">
        Belum konfirmasi?{" "}
        <Link href="/" className="font-semibold text-brand-600 hover:underline">Isi RSVP</Link>
      </p>
    </PublicShell>
  );
}
