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
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" required maxLength={254} autoComplete="email"
          defaultValue={v.email} placeholder="name@company.com" className="input" />
      </div>
      {state.error && <Alert>{state.error}</Alert>}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Searching…" : "Show QR code"}
      </button>
    </form>
  );
}
