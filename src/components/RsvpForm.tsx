"use client";

import { useActionState, useEffect, useState } from "react";
import { submitRsvp, type FormState } from "@/app/actions";
import { validateRsvp, type FieldErrors, type RsvpField } from "@/lib/validation";
import { Alert } from "./Alert";
import { AttendanceField } from "./AttendanceField";
import { FieldError } from "./FieldError";

export function RsvpForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(submitRsvp, {});
  const [errors, setErrors] = useState<FieldErrors>({});
  const v = state.values ?? {};

  // Show the server's field errors too (e.g. when JavaScript validation was skipped).
  useEffect(() => setErrors(state.fieldErrors ?? {}), [state]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const found = validateRsvp(new FormData(e.currentTarget));
    setErrors(found);
    const first = (["name", "company", "attending"] as const).find((f) => found[f]);
    if (first) {
      e.preventDefault();
      e.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    }
  }

  // Clear a field's warning as soon as it has a value.
  function handleChange(e: React.FormEvent<HTMLFormElement>) {
    const field = (e.target as HTMLInputElement).name as RsvpField;
    if (!errors[field]) return;
    const stillMissing = validateRsvp(new FormData(e.currentTarget))[field];
    if (!stillMissing) setErrors(({ [field]: _, ...rest }) => rest);
  }

  return (
    // key resets the uncontrolled inputs to the returned values after a failed submit.
    // noValidate: we show our own per-field warnings instead of the browser's tooltip.
    <form key={JSON.stringify(v)} action={action} onSubmit={handleSubmit} onChange={handleChange}
      noValidate className="card space-y-5 p-6">
      <div>
        <label htmlFor="name" className="label">Nama lengkap</label>
        <input id="name" name="name" required maxLength={120} autoComplete="name"
          defaultValue={v.name} placeholder="Nama orang yang hadir" className="input"
          aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />
        <FieldError id="name-error" message={errors.name} />
      </div>
      <div>
        <label htmlFor="company" className="label">Nama perusahaan</label>
        <input id="company" name="company" required maxLength={120} autoComplete="organization"
          defaultValue={v.company} placeholder="PT Contoh Indonesia" className="input"
          aria-invalid={!!errors.company} aria-describedby={errors.company ? "company-error" : undefined} />
        <FieldError id="company-error" message={errors.company} />
      </div>

      <AttendanceField defaultValue={v.attending} error={errors.attending} />

      {state.error && <Alert>{state.error}</Alert>}

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Mengirim…" : "Kirim konfirmasi"}
      </button>
    </form>
  );
}
