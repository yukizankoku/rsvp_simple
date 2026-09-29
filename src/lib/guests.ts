import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "./supabase";

export type Guest = {
  id: string;
  name: string;
  company: string;
  attending: boolean;
  token: string;
  checked_in_at: string | null;
  created_at: string;
};

const COLUMNS = "id, name, company, attending, token, checked_in_at, created_at";
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

/** Create the RSVP, or update attendance if this name + company already responded. Returns the token. */
export async function saveRsvp(name: string, company: string, attending: boolean): Promise<string> {
  const existing = await findByNameCompany(name, company);
  if (existing) {
    const { error } = await db()
      .from("guests")
      .update({ name, company, attending, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
    return existing.token;
  }

  const token = newToken();
  const { error } = await db().from("guests").insert({
    name,
    company,
    name_key: toKey(name),
    company_key: toKey(company),
    attending,
    token,
  });
  if (error) {
    // Two identical submissions at the same time: the other one won, so use its row.
    if (error.code === "23505") return saveRsvp(name, company, attending);
    throw error;
  }
  return token;
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
export async function updateGuest(id: string, name: string, company: string, attending: boolean) {
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
