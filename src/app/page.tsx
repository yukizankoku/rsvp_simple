import Link from "next/link";
import { EventHeader, PublicShell } from "@/components/EventHeader";
import { RsvpForm } from "@/components/RsvpForm";

export default function HomePage() {
  return (
    <PublicShell>
      <EventHeader />
      <RsvpForm />
      <p className="text-center text-sm text-brand-100/80">
        Already confirmed?{" "}
        <Link href="/tiket" className="font-semibold text-white hover:underline">
          View your QR code
        </Link>
      </p>
    </PublicShell>
  );
}
