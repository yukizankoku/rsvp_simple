// Shared by the RSVP form (instant feedback) and the server action (final check).

export type RsvpField = "name" | "company" | "attending";
export type FieldErrors = Partial<Record<RsvpField, string>>;

const MESSAGES: Record<RsvpField, string> = {
  name: "Nama lengkap wajib diisi.",
  company: "Nama perusahaan wajib diisi.",
  attending: "Pilih salah satu: Hadir atau Tidak hadir.",
};

export function validateRsvp(formData: FormData): FieldErrors {
  const errors: FieldErrors = {};
  if (!String(formData.get("name") ?? "").trim()) errors.name = MESSAGES.name;
  if (!String(formData.get("company") ?? "").trim()) errors.company = MESSAGES.company;
  const attending = formData.get("attending");
  if (attending !== "yes" && attending !== "no") errors.attending = MESSAGES.attending;
  return errors;
}
