"use client";

import { useActionState } from "react";
import { lookupTicket, type FormState } from "@/app/actions";
import { Alert } from "./Alert";

export function LookupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(lookupTicket, {});
  const v = state.values ?? {};

  return (
    <form key={JSON.stringify(v)} action={action} className="card space-y-5 p-6">
      <div>
        <label htmlFor="name" className="label">Nama lengkap</label>
        <input id="name" name="name" required maxLength={120} autoComplete="name"
          defaultValue={v.name} className="input" />
      </div>
      <div>
        <label htmlFor="company" className="label">Nama perusahaan</label>
        <input id="company" name="company" required maxLength={120} autoComplete="organization"
          defaultValue={v.company} className="input" />
      </div>
      {state.error && <Alert>{state.error}</Alert>}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Mencari…" : "Tampilkan QR code"}
      </button>
    </form>
  );
}
