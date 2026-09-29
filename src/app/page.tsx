import Link from "next/link";
import { EventHeader, PublicShell } from "@/components/EventHeader";
import { RsvpForm } from "@/components/RsvpForm";

export default function HomePage() {
  return (
    <PublicShell>
      <EventHeader />
      <RsvpForm />
      <p className="text-center text-sm text-zinc-600">
        Sudah konfirmasi?{" "}
        <Link href="/tiket" className="font-semibold text-brand-600 hover:underline">
          Lihat QR code Anda
        </Link>
      </p>
    </PublicShell>
  );
}
