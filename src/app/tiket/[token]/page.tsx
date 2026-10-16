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
          <h2 className="text-lg font-semibold">Thank you, {guest.name}</h2>
          <p className="text-sm text-zinc-600">
            We have received your response: <strong>not attending</strong>. If your plans change,
            you can still update your response.
          </p>
          <Link href={`/u/${token}`} className="btn btn-ghost mt-2 w-full">Update response</Link>
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
          <p className="font-semibold">Save {plusOne ? "the QR codes below" : "this QR code"}</p>
          <p className="mt-0.5">
            Download it or take a screenshot, then <strong>show it to the staff at event registration</strong>.
            {plusOne && " Each person uses their own QR code."}
          </p>
        </div>
      </div>

      <TicketCard guest={guest} label={host ? `Companion of ${host.name}` : "✓ Attendance confirmed"} />
      {plusOne && <TicketCard guest={plusOne} label="Companion (+1)" />}

      <div className="space-y-2 text-center text-xs text-brand-100/70">
        {!guest.plus_one_of && (
          <p>
            Need to change your attendance or companion?{" "}
            <Link href={`/u/${token}`} className="font-medium text-white hover:underline">Update response</Link>
          </p>
        )}
        <p>
          You can open your QR code again on the{" "}
          <Link href="/tiket" className="font-medium text-white hover:underline">View QR code</Link>{" "}
          page by entering the email used to confirm.
        </p>
      </div>
    </PublicShell>
  );
}
