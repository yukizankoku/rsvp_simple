"use client";

import { useActionState, useEffect, useState } from "react";
import { submitRsvp, type FormState } from "@/app/actions";
import { RSVP_FIELDS, validateRsvp, type FieldErrors, type RsvpField } from "@/lib/validation";
import { Alert } from "./Alert";
import { AttendanceField } from "./AttendanceField";
import { FieldError } from "./FieldError";

/** Set when the form is opened from a personal link: name and company are fixed. */
export type Invite = {
  token: string;
  name: string;
  company: string;
  attending?: string;
  plusOne?: string;
  /** A companion cannot bring a companion of their own. */
  canBringPlusOne: boolean;
};

export function RsvpForm({ invite }: { invite?: Invite }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitRsvp, {});
  const [errors, setErrors] = useState<FieldErrors>({});
  const v: Record<string, string | undefined> =
    state.values ?? { attending: invite?.attending, plus_one: invite?.plusOne };
  const [attending, setAttending] = useState(v.attending);
  // The companion's name field only appears after the guest ticks the checkbox.
  const [hasPlusOne, setHasPlusOne] = useState(!!v.plus_one);

  // Show the server's field errors too (e.g. when JavaScript validation was skipped).
  useEffect(() => setErrors(state.fieldErrors ?? {}), [state]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const found = validateRsvp(new FormData(e.currentTarget));
    setErrors(found);
    const first = RSVP_FIELDS.find((f) => found[f]);
    if (first) {
      e.preventDefault();
      e.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    }
  }

  function handleChange(e: React.FormEvent<HTMLFormElement>) {
    const input = e.target as HTMLInputElement;
    if (input.name === "attending") setAttending(input.value);
    if (input.name === "has_plus_one") {
      setHasPlusOne(input.checked);
      if (!input.checked) setErrors(({ plus_one: _, ...rest }) => rest);
      return;
    }

    // Clear a field's warning as soon as it is valid.
    const field = input.name as RsvpField;
    if (!errors[field]) return;
    const stillInvalid = validateRsvp(new FormData(e.currentTarget))[field];
    if (!stillInvalid) setErrors(({ [field]: _, ...rest }) => rest);
  }

  const showPlusOne = attending === "yes" && (invite?.canBringPlusOne ?? true);

  return (
    // key resets the uncontrolled inputs to the returned values after a failed submit.
    // noValidate: we show our own per-field warnings instead of the browser's tooltip.
    <form key={JSON.stringify(v)} action={action} onSubmit={handleSubmit} onChange={handleChange}
      noValidate className="card space-y-5 p-6">
      {invite ? (
        <div>
          <input type="hidden" name="token" value={invite.token} />
          <input type="hidden" name="name" value={invite.name} />
          <input type="hidden" name="company" value={invite.company} />
          <p className="text-sm text-zinc-500">Kepada Yth.</p>
          <p className="text-xl font-bold break-words">{invite.name}</p>
          <p className="break-words text-zinc-600">{invite.company}</p>
        </div>
      ) : (
        <>
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
        </>
      )}

      <AttendanceField defaultValue={v.attending} error={errors.attending} />

      {showPlusOne && (
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-300 px-4 py-3 transition hover:bg-zinc-50 has-checked:border-brand-600 has-checked:bg-brand-50">
            <input type="checkbox" name="has_plus_one" defaultChecked={hasPlusOne}
              className="mt-0.5 size-5 shrink-0 accent-brand-600" />
            <span>
              <span className="block text-sm font-medium text-zinc-700">Saya membawa pendamping (+1)</span>
              <span className="block text-xs text-zinc-500">Maksimal 1 orang. Pendamping mendapat QR code sendiri.</span>
            </span>
          </label>

          {hasPlusOne && (
            <div>
              <label htmlFor="plus_one" className="label">Nama pendamping</label>
              <input id="plus_one" name="plus_one" maxLength={120} autoComplete="off" autoFocus={!v.plus_one}
                defaultValue={v.plus_one} placeholder="Nama lengkap pendamping" className="input"
                aria-invalid={!!errors.plus_one} aria-describedby={errors.plus_one ? "plus_one-error" : undefined} />
              <FieldError id="plus_one-error" message={errors.plus_one} />
            </div>
          )}
        </div>
      )}

      {state.error && <Alert>{state.error}</Alert>}

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Mengirim…" : "Kirim konfirmasi"}
      </button>
    </form>
  );
}
