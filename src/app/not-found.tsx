import Link from "next/link";
import { PublicShell } from "@/components/EventHeader";

export default function NotFound() {
  return (
    <PublicShell>
      <div className="card space-y-3 p-8 text-center">
        <h1 className="text-lg font-semibold">Halaman tidak ditemukan</h1>
        <p className="text-sm text-zinc-600">Link mungkin salah atau sudah tidak berlaku.</p>
        <Link href="/" className="btn btn-primary w-full">Ke halaman RSVP</Link>
      </div>
    </PublicShell>
  );
}
