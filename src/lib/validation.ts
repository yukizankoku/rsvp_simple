// Shared by the RSVP form (instant feedback) and the server action (final check).

export type RsvpField = "name" | "company" | "attending" | "plus_one";
export type FieldErrors = Partial<Record<RsvpField, string>>;

/** Order in which fields appear in the form, used to focus the first invalid one. */
export const RSVP_FIELDS: RsvpField[] = ["name", "company", "attending", "plus_one"];

const MAX_LEN = 120;

/** A personal invitation link carries a `token`, so name and company are already known. */
export function validateRsvp(formData: FormData): FieldErrors {
  const text = (field: string) => String(formData.get(field) ?? "").trim();
  const errors: FieldErrors = {};

  if (!text("token")) {
    if (!text("name")) errors.name = "Nama lengkap wajib diisi.";
    if (!text("company")) errors.company = "Nama perusahaan wajib diisi.";
  }

  const attending = formData.get("attending");
  if (attending !== "yes" && attending !== "no") errors.attending = "Pilih salah satu: Hadir atau Tidak hadir.";

  const plusOne = text("plus_one");
  // The checkbox is only sent while "Hadir" is selected and the box is ticked.
  if (formData.get("has_plus_one") && attending === "yes" && !plusOne) {
    errors.plus_one = "Isi nama pendamping, atau hapus centang jika datang sendiri.";
  } else if (plusOne.length > MAX_LEN) errors.plus_one = "Nama pendamping terlalu panjang.";
  else if (plusOne && plusOne.toLowerCase() === text("name").toLowerCase()) {
    errors.plus_one = "Nama pendamping tidak boleh sama dengan nama Anda.";
  }
  return errors;
}
