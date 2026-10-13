// Shared by the RSVP form (instant feedback) and the server action (final check).

export type RsvpField = "name" | "company" | "email" | "attending" | "plus_one";
export type FieldErrors = Partial<Record<RsvpField, string>>;

/** Order in which fields appear in the form, used to focus the first invalid one. */
export const RSVP_FIELDS: RsvpField[] = ["name", "company", "email", "attending", "plus_one"];

const MAX_LEN = 120;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A personal invitation link carries a `token`, so name and company are already known. */
export function validateRsvp(formData: FormData): FieldErrors {
  const text = (field: string) => String(formData.get(field) ?? "").trim();
  const errors: FieldErrors = {};

  if (!text("token")) {
    if (!text("name")) errors.name = "Please enter your full name.";
    if (!text("company")) errors.company = "Please enter your company name.";
  }

  // Required: the QR code is sent to this address.
  const email = text("email");
  if (!email) errors.email = "Please enter your email.";
  else if (email.length > 254 || !EMAIL_PATTERN.test(email)) errors.email = "Please enter a valid email address.";

  const attending = formData.get("attending");
  if (attending !== "yes" && attending !== "no") errors.attending = "Please choose: Attending or Not attending.";

  const plusOne = text("plus_one");
  // The checkbox is only sent while "Attending" is selected and the box is ticked.
  if (formData.get("has_plus_one") && attending === "yes" && !plusOne) {
    errors.plus_one = "Enter your companion's name, or untick the box if you are coming alone.";
  } else if (plusOne.length > MAX_LEN) errors.plus_one = "Companion's name is too long.";
  else if (plusOne && plusOne.toLowerCase() === text("name").toLowerCase()) {
    errors.plus_one = "Your companion's name cannot be the same as yours.";
  }
  return errors;
}
