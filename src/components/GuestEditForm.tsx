"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { editGuest, removeGuest } from "@/app/admin/actions";
import { Alert } from "./Alert";
import { AttendanceField } from "./AttendanceField";

type Props = { id: string; name: string; company: string; attending: boolean | null; plusOneName?: string };

export function GuestEditForm({ id, name, company, attending, plusOneName }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(editGuest, {});
  const v: Record<string, string | undefined> = state.values ?? {
    name,
    company,
    attending: attending === null ? undefined : attending ? "yes" : "no",
  };

  return (
    <div className="space-y-4">
      <form key={JSON.stringify(v)} action={action} className="card space-y-5 p-6">
        <input type="hidden" name="id" value={id} />
        <div>
          <label htmlFor="name" className="label">Nama lengkap</label>
          <input id="name" name="name" required maxLength={120} defaultValue={v.name} className="input" />
        </div>
        <div>
          <label htmlFor="company" className="label">Nama perusahaan</label>
          <input id="company" name="company" required maxLength={120} defaultValue={v.company} className="input" />
        </div>
        <AttendanceField defaultValue={v.attending} />
        {attending === null && (
          <p className="-mt-2 text-xs text-zinc-500">
            Tamu belum menjawab. Biarkan kosong jika tamu akan mengisi sendiri lewat link pribadinya.
          </p>
        )}

        {state.error && <Alert>{state.error}</Alert>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link href="/admin" className="btn btn-ghost">Batal</Link>
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? "Menyimpan…" : "Simpan perubahan"}
          </button>
        </div>
      </form>

      <form
        action={removeGuest}
        onSubmit={(e) => {
          const extra = plusOneName ? ` Pendampingnya (${plusOneName}) juga ikut terhapus.` : "";
          if (!confirm(`Hapus ${name} (${company})? QR code tamu ini tidak akan berlaku lagi.${extra}`)) e.preventDefault();
        }}
        className="card flex flex-col gap-3 p-6 sm:flex-row sm:items-center"
      >
        <input type="hidden" name="id" value={id} />
        <div className="flex-1">
          <p className="font-medium">Hapus tamu</p>
          <p className="text-sm text-zinc-500">Data dan QR code tamu ini akan dihapus permanen.</p>
        </div>
        <button type="submit" className="btn border border-red-200 bg-white text-red-600 hover:bg-red-50">
          Hapus
        </button>
      </form>
    </div>
  );
}
