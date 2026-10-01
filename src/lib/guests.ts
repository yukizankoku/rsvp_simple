import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "./supabase";

export type Guest = {
  id: string;
  name: string;
  company: string;
  /** null = added by the admin, guest has not answered yet */
  attending: boolean | null;
  token: string;
  checked_in_at: string | null;
  /** Set on a companion (+1): id of the guest who brought them */
  plus_one_of: string | null;
  created_at: string;
};

const COLUMNS = "id, name, company, attending, token, checked_in_at, plus_one_of, created_at";
export const MAX_LEN = 120;

/** Collapse whitespace so "  Budi   Santoso " is stored as "Budi Santoso". */
export function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ");
}

/** Key used to match a guest again regardless of case and spacing. */
export function toKey(value: string) {
  return clean(value).toLowerCase();
}

/** Read and validate the name + company fields shared by the RSVP, lookup and edit forms. */
export function readNameCompany(formData: FormData) {
  const name = clean(formData.get("name"));
  const company = clean(formData.get("company"));
  let error: string | undefined;
  if (!name || !company) error = "Nama dan nama perusahaan wajib diisi.";
  else if (name.length > MAX_LEN || company.length > MAX_LEN) error = "Nama atau perusahaan terlalu panjang.";
  return { name, company, error };
}

function newToken() {
  return randomBytes(16).toString("base64url");
}

export async function findByNameCompany(name: string, company: string) {
  const { data, error } = await db()
    .from("guests")
    .select(COLUMNS)
    .eq("name_key", toKey(name))
    .eq("company_key", toKey(company))
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

export async function findPlusOne(guestId: string) {
  const { data, error } = await db()
    .from("guests")
    .select(COLUMNS)
    .eq("plus_one_of", guestId)
    .maybeSingle<Guest>();
  if (error) throw error;
  return data;
}

/** Insert a guest. Returns null if this name + company already exists. */
export async function createGuest(
  name: string,
  company: string,
  extra: { attending?: boolean; plus_one_of?: string } = {},
) {
  const { data, error } = await db()
    .from("guests")
    .insert({
      name,
      company,
      name_key: toKey(name),
      company_key: toKey(company),
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

export type RsvpResult =
  | { ok: true; token: string }
  | { ok: false; reason: "not_found" | "plus_one_taken" | "plus_one_same" };

/**
 * Save a guest's answer. The guest is identified by the token of their personal link,
 * or by name + company from the public form (created if new).
 * `plusOneName` is the optional companion; empty removes an existing one.
 */
export async function saveRsvp(
  who: { token: string } | { name: string; company: string },
  attending: boolean,
  plusOneName: string,
): Promise<RsvpResult> {
  let guest = "token" in who ? await findByToken(who.token) : await findByNameCompany(who.name, who.company);
  if ("token" in who && !guest) return { ok: false, reason: "not_found" };
  const name = guest?.name ?? ("name" in who ? who.name : "");
  const company = guest?.company ?? ("company" in who ? who.company : "");

  // A companion cannot bring a companion, and "tidak hadir" means no companion.
  const plusOne = attending && !guest?.plus_one_of ? plusOneName : "";
  if (plusOne) {
    if (toKey(plusOne) === toKey(name)) return { ok: false, reason: "plus_one_same" };
    const clash = await findByNameCompany(plusOne, company);
    if (clash && (!guest || clash.plus_one_of !== guest.id)) return { ok: false, reason: "plus_one_taken" };
  }

  if (!guest) {
    // If two identical submissions race, the other one created the row: use it.
    guest = (await createGuest(name, company)) ?? (await findByNameCompany(name, company));
    if (!guest) throw new Error("Could not create guest");
  }

  const { error } = await db()
    .from("guests")
    .update({ attending, updated_at: new Date().toISOString() })
    .eq("id", guest.id);
  if (error) throw error;

  if (!guest.plus_one_of) await syncPlusOne(guest, plusOne);
  return { ok: true, token: guest.token };
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
      .update({ name: plusOneName, name_key: toKey(plusOneName), updated_at: new Date().toISOString() })
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

/** Returns false if another guest already has this name + company. */
export async function updateGuest(id: string, name: string, company: string, attending: boolean | null) {
  const { error } = await db()
    .from("guests")
    .update({
      name,
      company,
      name_key: toKey(name),
      company_key: toKey(company),
      attending,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error?.code === "23505") return false;
  if (error) throw error;

  // A companion is looked up under the same company as the guest who brought them.
  const { error: plusOneError } = await db()
    .from("guests")
    .update({ company, company_key: toKey(company) })
    .eq("plus_one_of", id);
  if (plusOneError && plusOneError.code !== "23505") throw plusOneError;
  return true;
}

export async function deleteGuest(id: string) {
  const { error } = await db().from("guests").delete().eq("id", id);
  if (error) throw error;
}

export async function undoCheckIn(id: string) {
  const { error } = await db().from("guests").update({ checked_in_at: null }).eq("id", id);
  if (error) throw error;
}
