"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import type { FormState } from "@/app/actions";
import { addGuest, sendGuestEmail, type SendState } from "@/app/admin/actions";
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
          Isi nama, perusahaan dan email (opsional). Lalu kirim undangan lewat email, atau salin link pribadinya
          dari daftar di bawah.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input name="name" required maxLength={120} defaultValue={v.name} placeholder="Nama tamu"
          aria-label="Nama tamu" className="input sm:flex-1" autoFocus={!!v.added} />
        <input name="company" required maxLength={120} defaultValue={v.company} placeholder="Nama perusahaan"
          aria-label="Nama perusahaan" className="input sm:flex-1" />
        <input name="email" type="email" maxLength={254} defaultValue={v.email} placeholder="Email (opsional)"
          aria-label="Email" className="input sm:flex-1" />
        <button type="submit" disabled={pending} className="btn btn-primary">
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
