"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { editGuest, removeGuest } from "@/app/admin/actions";
import { Alert } from "./Alert";
import { AttendanceField } from "./AttendanceField";
import { confirmDelete } from "./DeleteGuestButton";

type Props = {
  id: string;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  attending: boolean | null;
  plusOneName?: string;
  /** A companion's company follows the guest who brought them, so it can't be edited here. */
  isPlusOne?: boolean;
};

export function GuestEditForm({ id, name, company, email, phone, attending, plusOneName, isPlusOne = false }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(editGuest, {});
  const v: Record<string, string | undefined> = state.values ?? {
    name,
    company,
    email: email ?? "",
    phone: phone ?? "",
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
          <input id="company" name="company" required maxLength={120} defaultValue={v.company}
            readOnly={isPlusOne} className={`input ${isPlusOne ? "bg-zinc-50 text-zinc-500" : ""}`} />
          {isPlusOne ? (
            <p className="mt-1.5 text-xs text-zinc-500">
              Pendamping mengikuti perusahaan tamu yang membawanya. Ubah perusahaan di halaman tamu tersebut.
            </p>
          ) : plusOneName && (
            <p className="mt-1.5 text-xs text-zinc-500">Pendamping ({plusOneName}) ikut pindah jika perusahaan diubah.</p>
          )}
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" maxLength={254} defaultValue={v.email}
            placeholder="nama@perusahaan.com" className="input" />
        </div>
        <div>
          <label htmlFor="phone" className="label">Nomor telepon</label>
          <input id="phone" name="phone" type="tel" maxLength={30} defaultValue={v.phone}
            placeholder="+62 812-3456-7890" className="input" />
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
          if (!confirmDelete(name, company, plusOneName)) e.preventDefault();
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
