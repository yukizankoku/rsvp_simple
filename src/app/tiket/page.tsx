import Link from "next/link";
import { EventHeader, PublicShell } from "@/components/EventHeader";
import { LookupForm } from "@/components/LookupForm";

export default function LookupPage() {
  return (
    <PublicShell>
      <EventHeader />
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white">Get your QR code</h2>
        <p className="mt-1 text-sm text-brand-100/80">
          Enter the same name and company you used when you confirmed.
        </p>
      </div>
      <LookupForm />
      <p className="text-center text-sm text-brand-100/80">
        Not confirmed yet?{" "}
        <Link href="/" className="font-semibold text-white hover:underline">RSVP now</Link>
      </p>
    </PublicShell>
  );
}
