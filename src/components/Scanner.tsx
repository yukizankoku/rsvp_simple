"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { confirmCheckIn, lookupScan } from "@/app/admin/actions";
import type { Guest } from "@/lib/guests";
import { formatDateTime } from "@/lib/format";

type View =
  | { kind: "scanning" }
  | { kind: "loading" }
  | { kind: "not_found" }
  | { kind: "guest"; guest: Guest }
  | { kind: "done"; guest: Guest }
  | { kind: "error"; message: string };

const READER_ID = "qr-reader";

export function Scanner() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [view, setView] = useState<View>({ kind: "scanning" });
  const [cameraError, setCameraError] = useState("");
  const [busy, setBusy] = useState(false);

  const onScan = useCallback(async (text: string) => {
    scannerRef.current?.pause(true);
    setView({ kind: "loading" });
    // Accept a bare token, or a URL whose last path segment is the token.
    const token = text.trim().split("/").pop() ?? "";
    try {
      const { guest } = await lookupScan(token);
      setView(guest ? { kind: "guest", guest } : { kind: "not_found" });
    } catch {
      setView({ kind: "error", message: "Gagal memeriksa QR. Periksa koneksi internet." });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let started: Promise<unknown> = Promise.resolve();

    (async () => {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      if (cancelled) return;
      const scanner = new Html5Qrcode(READER_ID, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      });
      scannerRef.current = scanner;
      started = scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.7); return { width: s, height: s }; } },
          onScan,
          () => {},
        )
        .catch((err) => {
          console.error(err);
          setCameraError("Kamera tidak bisa dibuka. Izinkan akses kamera di browser, lalu muat ulang halaman.");
        });
    })();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      // Wait for start() to settle before stopping, otherwise html5-qrcode throws.
      started.then(() => {
        if (scanner?.isScanning) scanner.stop().then(() => scanner.clear()).catch(() => {});
      });
    };
  }, [onScan]);

  function next() {
    setView({ kind: "scanning" });
    try {
      scannerRef.current?.resume();
    } catch {
      /* already running */
    }
  }

  async function doCheckIn(guest: Guest, allowNotAttending = false) {
    setBusy(true);
    try {
      const result = await confirmCheckIn(guest.token, allowNotAttending);
      if (result.status === "not_found") setView({ kind: "not_found" });
      else if (result.status === "ok") setView({ kind: "done", guest: result.guest });
      else setView({ kind: "guest", guest: result.guest });
    } catch {
      setView({ kind: "error", message: "Gagal menyimpan check-in. Coba lagi." });
    } finally {
      setBusy(false);
    }
  }

  const showResult = view.kind !== "scanning";

  return (
    <div className="space-y-4">
      <div className="card relative overflow-hidden bg-zinc-900">
        <div id={READER_ID} className="aspect-square w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
        {cameraError && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white">
            {cameraError}
          </p>
        )}
      </div>

      {!showResult && !cameraError && (
        <p className="text-center text-sm text-zinc-500">Arahkan kamera ke QR code tamu.</p>
      )}

      {view.kind === "loading" && <div className="card p-6 text-center text-sm text-zinc-500">Memeriksa…</div>}

      {view.kind === "not_found" && (
        <ResultCard tone="red" title="QR tidak dikenali" onNext={next}>
          QR code ini tidak terdaftar untuk acara ini.
        </ResultCard>
      )}

      {view.kind === "error" && (
        <ResultCard tone="red" title="Terjadi kesalahan" onNext={next}>{view.message}</ResultCard>
      )}

      {view.kind === "done" && (
        <ResultCard tone="green" title="Check-in berhasil" guest={view.guest} onNext={next} />
      )}

      {view.kind === "guest" && view.guest.checked_in_at && (
        <ResultCard tone="amber" title="Sudah check-in sebelumnya" guest={view.guest} onNext={next}>
          Tercatat pada {formatDateTime(view.guest.checked_in_at)}.
        </ResultCard>
      )}

      {view.kind === "guest" && !view.guest.checked_in_at && !view.guest.attending && (
        <ResultCard tone="amber" guest={view.guest} onNext={next}
          title={view.guest.attending === null ? "Belum konfirmasi kehadiran" : "Konfirmasi: tidak hadir"}>
          {view.guest.attending === null
            ? "Tamu ini belum mengisi konfirmasi kehadiran."
            : "Tamu ini sebelumnya menjawab tidak hadir."}
          <button disabled={busy} onClick={() => doCheckIn(view.guest, true)} className="btn btn-primary mt-4 w-full">
            {busy ? "Menyimpan…" : "Tetap check-in"}
          </button>
        </ResultCard>
      )}

      {view.kind === "guest" && !view.guest.checked_in_at && view.guest.attending && (
        <ResultCard tone="brand" title="Pastikan nama tamu" guest={view.guest} onNext={next} nextLabel="Batal">
          <button disabled={busy} onClick={() => doCheckIn(view.guest)} className="btn btn-primary w-full py-4 text-base">
            {busy ? "Menyimpan…" : "Konfirmasi check-in"}
          </button>
        </ResultCard>
      )}
    </div>
  );
}

const TONES = {
  red: "border-red-200 bg-red-50 text-red-700",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  brand: "border-brand-100 bg-brand-50 text-brand-700",
};

function ResultCard({
  tone,
  title,
  guest,
  children,
  onNext,
  nextLabel = "Scan berikutnya",
}: {
  tone: keyof typeof TONES;
  title: string;
  guest?: Guest;
  children?: React.ReactNode;
  onNext: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="card overflow-hidden">
      <p className={`border-b px-5 py-3 text-sm font-semibold ${TONES[tone]}`}>{title}</p>
      <div className="p-5">
        {guest && (
          <div className="mb-4 text-center">
            <p className="text-2xl font-bold">{guest.name}</p>
            <p className="text-zinc-600">{guest.company}</p>
          </div>
        )}
        {children && <div className="text-sm text-zinc-600">{children}</div>}
        <button onClick={onNext} className="btn btn-ghost mt-3 w-full">{nextLabel}</button>
      </div>
    </div>
  );
}
