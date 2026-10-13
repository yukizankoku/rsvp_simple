import Link from "next/link";
import { PublicShell } from "@/components/EventHeader";

export default function NotFound() {
  return (
    <PublicShell>
      <div className="card space-y-3 p-8 text-center">
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="text-sm text-zinc-600">The link may be wrong or no longer valid.</p>
        <Link href="/" className="btn btn-primary w-full">Go to the RSVP page</Link>
      </div>
    </PublicShell>
  );
}
