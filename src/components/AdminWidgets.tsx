"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import type { FormState } from "@/app/actions";
import {
  addGuest,
  importGuests,
  sendGuestEmail,
  sendInvitationBatch,
  type ImportState,
  type SendState,
} from "@/app/admin/actions";
import { Alert } from "./Alert";

/** Keeps the dashboard numbers fresh during the event. */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}

function useCopy(path: string) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(window.location.origin + path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return { copied, copy };
}

/** Card showing a full link with a copy button. */
export function CopyLink({ path = "/", label }: { path?: string; label: string }) {
  const [origin, setOrigin] = useState("");
  const { copied, copy } = useCopy(path);
  useEffect(() => setOrigin(window.location.origin), []);

  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        <p className="truncate font-mono text-sm">{origin ? origin + path : " "}</p>
      </div>
      <button type="button" onClick={copy} className="btn btn-ghost w-full sm:w-auto">
        {copied ? "Tersalin ✓" : "Salin link"}
      </button>
    </div>
  );
}

/** Compact copy button for a guest row. */
export function CopyButton({ path }: { path: string }) {
  const { copied, copy } = useCopy(path);
  return (
    <button type="button" onClick={copy}
      className="min-h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-50">
      {copied ? "Tersalin ✓" : "Salin link"}
    </button>
  );
}

export function AddGuestForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addGuest, {});
  const v = state.values ?? {};

  return (
    <form key={JSON.stringify(v)} action={action} className="card space-y-3 p-4">
      <div>
        <p className="font-semibold">Tambah tamu</p>
        <p className="text-sm text-zinc-500">
          Isi nama, perusahaan, email dan telepon (opsional). Lalu kirim undangan lewat email, atau salin link pribadinya
          dari daftar di bawah.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <input name="name" required maxLength={120} defaultValue={v.name} placeholder="Nama tamu"
          aria-label="Nama tamu" className="input" autoFocus={!!v.added} />
        <input name="company" required maxLength={120} defaultValue={v.company} placeholder="Nama perusahaan"
          aria-label="Nama perusahaan" className="input" />
        <input name="email" type="email" maxLength={254} defaultValue={v.email} placeholder="Email (opsional)"
          aria-label="Email" className="input" />
        <input name="phone" type="tel" maxLength={30} defaultValue={v.phone} placeholder="Telepon (opsional)"
          aria-label="Nomor telepon" className="input" />
        <button type="submit" disabled={pending} className="btn btn-primary sm:col-span-2 lg:col-span-1">
          {pending ? "Menambah…" : "Tambah"}
        </button>
      </div>
      {state.error && <Alert>{state.error}</Alert>}
      {v.added && <p className="text-sm text-emerald-700">✓ {v.added} ditambahkan ke daftar.</p>}
    </form>
  );
}

/**
 * Sends the invitation (or, with `kind="ticket"`, the QR code) to the guest's email.
 * `compact` is the small version for a row in the guest list.
 */
export function SendEmailButton({
  id,
  kind = "invite",
  label,
  compact = false,
}: {
  id: string;
  kind?: "invite" | "ticket";
  label: string;
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState<SendState, FormData>(sendGuestEmail, {});
  const [shown, setShown] = useState<SendState>({});

  // Show the result for a few seconds, then go back to the normal label.
  useEffect(() => {
    setShown(state);
    if (!state.ok && !state.error) return;
    const t = setTimeout(() => setShown({}), state.error ? 6000 : 3000);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <form action={action} className={compact ? "flex flex-col items-end" : "space-y-2"}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <button type="submit" disabled={pending}
        className={compact
          ? "min-h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
          : "btn btn-ghost w-full"}>
        {pending ? "Mengirim…" : shown.ok ? "Terkirim ✓" : label}
      </button>
      {shown.error && (compact
        ? <span role="alert" className="mt-1 max-w-56 text-right text-xs text-red-600">{shown.error}</span>
        : <Alert>{shown.error}</Alert>)}
    </form>
  );
}

const MAX_IMPORT_BYTES = 4 * 1024 * 1024; // matches serverActions.bodySizeLimit in next.config.ts

/** Upload the filled-in Excel template. Shows how many guests were added and which rows were skipped. */
export function ImportGuestsForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importGuests, {});
  const [tooBig, setTooBig] = useState(false);
  const error = tooBig ? "File terlalu besar (maksimal 4 MB)." : state.error;

  return (
    // key clears the file input after a successful import.
    <form key={state.at} action={action} className="card space-y-3 p-4"
      onSubmit={(e) => {
        const file = new FormData(e.currentTarget).get("file");
        const big = file instanceof File && file.size > MAX_IMPORT_BYTES;
        setTooBig(big);
        if (big) e.preventDefault();
      }}>
      <div>
        <p className="font-semibold">Import dari Excel</p>
        <p className="text-sm text-zinc-500">
          Isi{" "}
          <a href="/admin/import/template" className="font-medium text-brand-600 hover:underline">template Excel</a>
          , lalu unggah di sini. Tamu yang emailnya sudah terdaftar akan dilewati.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input type="file" name="file" required aria-label="File Excel"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="block w-full min-w-0 flex-1 text-sm text-zinc-600 file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-100 file:px-4 file:text-sm file:font-medium hover:file:bg-zinc-200" />
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Mengimpor…" : "Import"}
        </button>
      </div>
      {error && <Alert>{error}</Alert>}
      {!error && state.added !== undefined && (
        <p className="text-sm text-emerald-700">✓ {state.added} tamu ditambahkan ke daftar.</p>
      )}
      {!error && !!state.skipped?.length && (
        <details className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <summary className="cursor-pointer font-medium">{state.skipped.length} baris dilewati</summary>
          <ul className="mt-2 max-h-60 space-y-1 overflow-y-auto">
            {state.skipped.map((s) => (
              <li key={s.row}>Baris {s.row}: <strong>{s.name}</strong>, {s.reason}</li>
            ))}
          </ul>
        </details>
      )}
    </form>
  );
}

const BLAST_BATCH = 5;

/**
 * Email the invitation to many guests at once. Sends small batches one after another from the
 * browser, so the admin sees the progress and must keep the page open until it finishes.
 */
export function BlastEmailCard({
  configured,
  newIds,
  pendingIds,
}: {
  configured: boolean;
  /** Not answered yet, has an email, never invited */
  newIds: string[];
  /** Not answered yet, has an email (includes those already invited: a reminder) */
  pendingIds: string[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"new" | "all">("new");
  const [progress, setProgress] = useState<{ done: number; total: number; sent: number; failed: number } | null>(null);
  const running = !!progress && progress.done < progress.total;
  const ids = mode === "new" ? newIds : pendingIds;

  // Leaving the page stops the blast, so ask first.
  useEffect(() => {
    if (!running) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  async function start() {
    // Copy the list: the page refreshes every few seconds while this runs.
    const targets = [...ids];
    if (!targets.length || !confirm(`Kirim email undangan ke ${targets.length} tamu?`)) return;
    const p = { done: 0, total: targets.length, sent: 0, failed: 0 };
    setProgress({ ...p });
    for (let i = 0; i < targets.length; i += BLAST_BATCH) {
      const batch = targets.slice(i, i + BLAST_BATCH);
      try {
        const r = await sendInvitationBatch(batch);
        p.sent += r.sent;
        p.failed += r.failed;
      } catch {
        p.failed += batch.length;
      }
      p.done += batch.length;
      setProgress({ ...p });
    }
    router.refresh();
  }

  const options = [
    { value: "new", label: "Belum pernah dikirim", count: newIds.length },
    { value: "all", label: "Semua yang belum konfirmasi (pengingat)", count: pendingIds.length },
  ] as const;

  return (
    <div className="card space-y-3 p-4">
      <div>
        <p className="font-semibold">Kirim undangan massal</p>
        <p className="text-sm text-zinc-500">Email undangan ke tamu yang punya email dan belum konfirmasi.</p>
      </div>
      {!configured ? (
        <Alert>Email belum diatur (SMTP_HOST, SMTP_USER, SMTP_PASS).</Alert>
      ) : (
        <>
          <fieldset disabled={running} className="space-y-1">
            {options.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name="blast-mode" value={o.value} checked={mode === o.value}
                  onChange={() => setMode(o.value)} className="size-4 accent-brand-600" />
                {o.label} <span className="text-zinc-400">({o.count})</span>
              </label>
            ))}
          </fieldset>
          <button type="button" onClick={start} disabled={running || ids.length === 0} className="btn btn-primary w-full">
            {running ? `Mengirim… ${progress.done}/${progress.total}` : `Kirim ke ${ids.length} tamu`}
          </button>
          {progress && (
            <div className="space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full bg-brand-600 transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
              <p role="status" className={`text-sm ${progress.failed ? "text-red-600" : "text-zinc-500"}`}>
                {running
                  ? "Jangan tutup halaman ini sampai selesai."
                  : `Selesai: ${progress.sent} terkirim${progress.failed ? `, ${progress.failed} gagal (cek pengaturan SMTP atau batas kirim email)` : ""}.`}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
