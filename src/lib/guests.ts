import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "./supabase";
import { EMAIL_PATTERN, isValidPhone } from "./validation";

export type Guest = {
  id: string;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  /** null = added by the admin, guest has not answered yet */
  attending: boolean | null;
  token: string;
  /** Short invitation link: /i/<short_code> */
  short_code: string;
  /** When the invitation email was last sent */
  invited_at: string | null;
  checked_in_at: string | null;
  /** Set on a companion (+1): id of the guest who brought them */
  plus_one_of: string | null;
  created_at: string;
};

const COLUMNS =
  "id, name, company, email, phone, attending, token, short_code, invited_at, checked_in_at, plus_one_of, created_at";
export const MAX_LEN = 120;
const MAX_EMAIL_LEN = 254;

/** Collapse whitespace so "  Budi   Santoso " is stored as "Budi Santoso". */
export function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ");
}

/** Compare names regardless of case and spacing. */
export function toKey(value: string) {
  return clean(value).toLowerCase();
}

/** Read and validate the name + company fields shared by the RSVP and admin forms. */
export function readNameCompany(formData: FormData) {
  const name = clean(formData.get("name"));
  const company = clean(formData.get("company"));
  let error: string | undefined;
  if (!name || !company) error = "Nama dan nama perusahaan wajib diisi.";
  else if (name.length > MAX_LEN || company.length > MAX_LEN) error = "Nama atau perusahaan terlalu panjang.";
  return { name, company, error };
}

/** Read the email field. Empty is allowed here; callers decide whether it is required. */
export function readEmail(formData: FormData) {
  const email = clean(formData.get("email")).toLowerCase();
  let error: string | undefined;
  if (email && (email.length > MAX_EMAIL_LEN || !EMAIL_PATTERN.test(email))) error = "Format email tidak valid.";
  return { email, error };
}

/** Read the phone field. Empty is allowed. */
export function readPhone(formData: FormData) {
  const phone = clean(formData.get("phone"));
  return { phone, error: phone && !isValidPhone(phone) ? "Format nomor telepon tidak valid." : undefined };
}

function newToken() {
  return randomBytes(16).toString("base64url");
}

/** Emails are stored lowercased (see `readEmail`), so an exact match ignores case. */
export async function findByEmail(email: string) {
  const { data, error } = await db()
    .from("guests")
    .select(COLUMNS)
    .eq("email", email.toLowerCase())
    .maybeSingle<Guest>();
  if (error) throw error;
  return data;
}

export async function findById(id: string) {
  const { data, error } = await db()
    .from("guests")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle<Guest>();
  // Malformed uuid from the URL: treat as not found
  if (error?.code === "22P02") return null;
  if (error) throw error;
  return data;
}

export async function findByToken(token: string) {
  const { data, error } = await db()
    .from("guests")
    .select(COLUMNS)
    .eq("token", token)
    .maybeSingle<Guest>();
  if (error) throw error;
  return data;
}

export async function findByShortCode(code: string) {
  const { data, error } = await db()
    .from("guests")
    .select(COLUMNS)
    .eq("short_code", code)
    .maybeSingle<Guest>();
  if (error) throw error;
  return data;
}

export async function findPlusOne(guestId: string) {
  const { data, error } = await db()
    .from("guests")
    .select(COLUMNS)
    .eq("plus_one_of", guestId)
    .maybeSingle<Guest>();
  if (error) throw error;
  return data;
}

/** Insert a guest. Returns null if another guest already has this email. */
export async function createGuest(
  name: string,
  company: string,
  extra: { attending?: boolean; plus_one_of?: string; email?: string; phone?: string } = {},
) {
  const { data, error } = await db()
    .from("guests")
    .insert({
      name,
      company,
      email: extra.email || null,
      phone: extra.phone || null,
      attending: extra.attending ?? null,
      plus_one_of: extra.plus_one_of ?? null,
      token: newToken(),
    })
    .select(COLUMNS)
    .maybeSingle<Guest>();
  if (error?.code === "23505") return null;
  if (error) throw error;
  return data;
}

export type NewGuest = { name: string; company: string; email: string; phone: string };

/** Insert many guests at once (Excel import). Throws if an email is already taken. */
export async function createGuests(guests: NewGuest[]) {
  const chunk = 500;
  for (let i = 0; i < guests.length; i += chunk) {
    const { error } = await db()
      .from("guests")
      .insert(
        guests.slice(i, i + chunk).map((g) => ({
          name: g.name,
          company: g.company,
          email: g.email || null,
          phone: g.phone || null,
          token: newToken(),
        })),
      );
    if (error) throw error;
  }
}

export type RsvpResult =
  | { ok: true; guest: Guest }
  | { ok: false; reason: "not_found" | "plus_one_same" | "email_taken" };

/**
 * Save a guest's answer. The guest is identified by the token of their personal link,
 * or by email from the public form (created if new). Name + company can't identify a guest:
 * two different people may share both.
 * `plusOneName` is the optional companion; empty removes an existing one.
 */
export async function saveRsvp(
  who: { token: string } | { name: string; company: string },
  attending: boolean,
  plusOneName: string,
  email: string,
  phone: string,
): Promise<RsvpResult> {
  let guest = "token" in who ? await findByToken(who.token) : await findByEmail(email);
  if ("token" in who && !guest) return { ok: false, reason: "not_found" };
  // An existing guest keeps the name and company already on record.
  const name = guest?.name ?? ("name" in who ? who.name : "");
  const company = guest?.company ?? ("company" in who ? who.company : "");

  // A companion cannot bring a companion, and "tidak hadir" means no companion.
  const plusOne = attending && !guest?.plus_one_of ? plusOneName : "";
  if (plusOne && toKey(plusOne) === toKey(name)) return { ok: false, reason: "plus_one_same" };

  if (!guest) {
    // If two identical submissions race, the other one created the row: use it.
    guest = (await createGuest(name, company, { email, phone })) ?? (await findByEmail(email));
    if (!guest) throw new Error("Could not create guest");
  }

  const { data: saved, error } = await db()
    .from("guests")
    .update({ attending, email: email || guest.email, phone: phone || guest.phone, updated_at: new Date().toISOString() })
    .eq("id", guest.id)
    .select(COLUMNS)
    .single<Guest>();
  // A personal link may change the email to one another guest already uses.
  if (error?.code === "23505") return { ok: false, reason: "email_taken" };
  if (error) throw error;

  if (!guest.plus_one_of) await syncPlusOne(guest, plusOne);
  return { ok: true, guest: saved };
}

async function syncPlusOne(guest: Guest, plusOneName: string) {
  const existing = await findPlusOne(guest.id);
  if (!plusOneName) {
    // Keep a companion who is already inside the venue.
    if (existing && !existing.checked_in_at) await deleteGuest(existing.id);
    return;
  }
  if (!existing) {
    const created = await createGuest(plusOneName, guest.company, { attending: true, plus_one_of: guest.id });
    if (!created) throw new Error("Companion name was taken during save");
    return;
  }
  if (existing.name !== plusOneName) {
    // Renaming keeps the same row, so the companion's QR stays valid.
    const { error } = await db()
      .from("guests")
      .update({ name: plusOneName, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
  }
}

export async function listGuests(): Promise<Guest[]> {
  const pageSize = 1000;
  const all: Guest[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await db()
      .from("guests")
      .select(COLUMNS)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1)
      .returns<Guest[]>();
    if (error) throw error;
    all.push(...data);
    if (data.length < pageSize) return all;
  }
}

export type CheckInResult =
  | { status: "ok"; guest: Guest }
  | { status: "already"; guest: Guest }
  | { status: "not_attending"; guest: Guest }
  | { status: "not_found" };

/** `allowNotAttending` lets staff admit someone who answered "tidak hadir" but showed up anyway. */
export async function checkIn(token: string, allowNotAttending = false): Promise<CheckInResult> {
  const guest = await findByToken(token);
  if (!guest) return { status: "not_found" };
  if (guest.checked_in_at) return { status: "already", guest };
  if (!guest.attending && !allowNotAttending) return { status: "not_attending", guest };

  // Only update if still not checked in, so two scanners can't both succeed.
  const { data, error } = await db()
    .from("guests")
    .update({ checked_in_at: new Date().toISOString(), attending: true })
    .eq("id", guest.id)
    .is("checked_in_at", null)
    .select(COLUMNS)
    .maybeSingle<Guest>();
  if (error) throw error;
  if (!data) {
    const latest = await findByToken(token);
    return latest ? { status: "already", guest: latest } : { status: "not_found" };
  }
  return { status: "ok", guest: data };
}

export type UpdateResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "email_taken" };

/**
 * Save the admin's edit. A companion always has the same company as the guest who brought them:
 * changing the guest's company moves the companion too, and a companion's own company can't be changed.
 */
export async function updateGuest(
  id: string,
  name: string,
  company: string,
  email: string,
  phone: string,
  attending: boolean | null,
): Promise<UpdateResult> {
  const guest = await findById(id);
  if (!guest) return { ok: false, reason: "not_found" };
  if (guest.plus_one_of) company = guest.company;

  const { error } = await db()
    .from("guests")
    .update({ name, company, email: email || null, phone: phone || null, attending, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error?.code === "23505") return { ok: false, reason: "email_taken" };
  if (error) throw error;

  const { error: plusOneError } = await db()
    .from("guests")
    .update({ company, updated_at: new Date().toISOString() })
    .eq("plus_one_of", id);
  if (plusOneError) throw plusOneError;
  return { ok: true };
}

export async function deleteGuest(id: string) {
  const { error } = await db().from("guests").delete().eq("id", id);
  if (error) throw error;
}

export async function markInvited(id: string) {
  const { error } = await db().from("guests").update({ invited_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function undoCheckIn(id: string) {
  const { error } = await db().from("guests").update({ checked_in_at: null }).eq("id", id);
  if (error) throw error;
}
