import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/EventHeader";
import { Invitation } from "@/components/Invitation";
import { RsvpForm } from "@/components/RsvpForm";
import { findByToken, findPlusOne } from "@/lib/guests";

export const dynamic = "force-dynamic";

/** Personal invitation link: name and company were filled in by the admin. */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const guest = await findByToken(token);
  if (!guest) notFound();

  const isPlusOne = !!guest.plus_one_of;
  const plusOne = isPlusOne ? null : await findPlusOne(guest.id);
  const answered = guest.attending !== null;

  return (
    <PublicShell>
      <Invitation guestName={guest.name} />
      <RsvpForm
        invite={{
          token,
          name: guest.name,
          company: guest.company,
          email: guest.email ?? undefined,
          phone: guest.phone ?? undefined,
          attending: answered ? (guest.attending ? "yes" : "no") : undefined,
          plusOne: plusOne?.name,
          canBringPlusOne: !isPlusOne,
        }}
      />
      {guest.attending && (
        <p className="text-center text-sm text-brand-100/80">
          <Link href={`/tiket/${token}`} className="font-semibold text-white hover:underline">
            View your QR code
          </Link>
        </p>
      )}
    </PublicShell>
  );
}
