import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { EventHeader, PublicShell } from "@/components/EventHeader";
import { findByToken } from "@/lib/guests";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const guest = await findByToken(token);
  if (!guest) notFound();

  if (!guest.attending) {
    return (
      <PublicShell>
        <EventHeader />
        <div className="card space-y-3 p-8 text-center">
          <p className="text-4xl">🙏</p>
          <h2 className="text-lg font-semibold">Terima kasih, {guest.name}</h2>
          <p className="text-sm text-zinc-600">
            Konfirmasi Anda sudah kami terima: <strong>tidak hadir</strong>. Jika rencana berubah,
            isi ulang form dengan nama dan perusahaan yang sama.
          </p>
          <Link href="/" className="btn btn-ghost mt-2 w-full">Ubah konfirmasi</Link>
        </div>
      </PublicShell>
    );
  }

  // The QR only contains the random token, no personal data.
  const qrOptions = { margin: 1, width: 640, errorCorrectionLevel: "M" as const };
  const [svg, png] = await Promise.all([
    QRCode.toString(token, { ...qrOptions, type: "svg" }),
    QRCode.toDataURL(token, qrOptions),
  ]);
  const fileName = `qr-${guest.name.replace(/[^\w-]+/g, "-").toLowerCase()}.png`;

  return (
    <PublicShell>
      <EventHeader />
      <div className="card overflow-hidden">
        <div className="bg-brand-600 px-6 py-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white">
            ✓ Kehadiran terkonfirmasi
          </p>
        </div>
        <div className="space-y-5 p-6 text-center">
          <div
            className="mx-auto aspect-square w-full max-w-64 [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <div>
            <p className="text-xl font-bold">{guest.name}</p>
            <p className="text-sm text-zinc-600">{guest.company}</p>
          </div>
          {guest.checked_in_at && (
            <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
              ✓ Sudah check-in
            </p>
          )}
          <p className="text-sm text-zinc-600">
            Tunjukkan QR code ini kepada petugas saat tiba di lokasi acara.
          </p>
          <a href={png} download={fileName} className="btn btn-primary w-full">Unduh QR code</a>
        </div>
      </div>
      <p className="text-center text-xs text-zinc-500">
        QR code bisa dibuka lagi kapan saja lewat halaman{" "}
        <Link href="/tiket" className="font-medium text-brand-600 hover:underline">Lihat QR code</Link>{" "}
        dengan mengisi nama dan perusahaan Anda.
      </p>
    </PublicShell>
  );
}
