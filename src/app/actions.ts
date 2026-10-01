"use server";

import { redirect } from "next/navigation";
import { clean, findByNameCompany, readNameCompany, saveRsvp, type RsvpResult } from "@/lib/guests";
import { validateRsvp, type FieldErrors } from "@/lib/validation";

export type FormState = { error?: string; fieldErrors?: FieldErrors; values?: Record<string, string> };

/** Handles both the public form (name + company typed by the guest) and personal links (token). */
export async function submitRsvp(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const { name, company, error } = readNameCompany(formData);
  const attendance = String(formData.get("attending") ?? "");
  const plusOne = clean(formData.get("plus_one"));
  const values = { name, company, attending: attendance, plus_one: plusOne };

  const fieldErrors = validateRsvp(formData);
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };
  if (!token && error) return { error, values };

  let result: RsvpResult;
  try {
    result = await saveRsvp(token ? { token } : { name, company }, attendance === "yes", plusOne);
  } catch (e) {
    console.error("saveRsvp failed", e);
    return { error: "Terjadi kesalahan. Silakan coba lagi.", values };
  }
  if (!result.ok) {
    if (result.reason === "not_found") return { error: "Undangan tidak ditemukan atau sudah dihapus.", values };
    const message =
      result.reason === "plus_one_same"
        ? "Nama pendamping tidak boleh sama dengan nama Anda."
        : "Nama pendamping sudah terdaftar sebagai tamu. Pendamping tidak perlu didaftarkan lagi.";
    return { fieldErrors: { plus_one: message }, values };
  }
  redirect(`/tiket/${result.token}`);
}

export async function lookupTicket(_prev: FormState, formData: FormData): Promise<FormState> {
  const { name, company, error } = readNameCompany(formData);
  const values = { name, company };
  if (error) return { error, values };

  let token: string | undefined;
  try {
    token = (await findByNameCompany(name, company))?.token;
  } catch (e) {
    console.error("lookupTicket failed", e);
    return { error: "Terjadi kesalahan. Silakan coba lagi.", values };
  }
  if (!token) {
    return {
      error: "Data tidak ditemukan. Pastikan nama dan perusahaan sama dengan saat konfirmasi.",
      values,
    };
  }
  redirect(`/tiket/${token}`);
}
