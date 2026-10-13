import { notFound, redirect } from "next/navigation";
import { findByShortCode } from "@/lib/guests";

export const dynamic = "force-dynamic";

/** Short link sent to guests. Goes to the QR page once they confirmed, otherwise to the RSVP form. */
export default async function ShortLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const guest = await findByShortCode(code);
  if (!guest) notFound();
  redirect(guest.attending ? `/tiket/${guest.token}` : `/u/${guest.token}`);
}
