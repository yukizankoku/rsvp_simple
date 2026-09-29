"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { editGuest, removeGuest } from "@/app/admin/actions";
import { Alert } from "./Alert";
import { AttendanceField } from "./AttendanceField";

type Props = { id: string; name: string; company: string; attending: boolean };

export function GuestEditForm({ id, name, company, attending }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(editGuest, {});
  const v = state.values ?? { name, company, attending: attending ? "yes" : "no" };

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
          if (!confirm(`Hapus ${name} (${company})? QR code tamu ini tidak akan berlaku lagi.`)) e.preventDefault();
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
