import QRCode from "qrcode";
import type { Guest } from "@/lib/guests";

/** One QR ticket. The QR only contains the random token, no personal data. */
export async function TicketCard({ guest, label }: { guest: Guest; label: string }) {
  const qrOptions = { margin: 1, width: 640, errorCorrectionLevel: "M" as const };
  const [svg, png] = await Promise.all([
    QRCode.toString(guest.token, { ...qrOptions, type: "svg" }),
    QRCode.toDataURL(guest.token, qrOptions),
  ]);
  const fileName = `qr-${guest.name.replace(/[^\w-]+/g, "-").toLowerCase()}.png`;

  return (
    <div className="card overflow-hidden">
      <div className="bg-brand-600 px-6 py-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white">{label}</p>
      </div>
      <div className="space-y-5 p-6 text-center">
        <div
          className="mx-auto aspect-square w-full max-w-64 [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div>
          <p className="text-xl font-bold break-words">{guest.name}</p>
          <p className="text-sm break-words text-zinc-600">{guest.company}</p>
        </div>
        {guest.checked_in_at && (
          <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
            ✓ Sudah check-in
          </p>
        )}
        <a href={png} download={fileName} className="btn btn-primary w-full">Simpan QR code</a>
      </div>
    </div>
  );
}
