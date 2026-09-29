"use server";

import { redirect } from "next/navigation";
import { findByNameCompany, readNameCompany, saveRsvp } from "@/lib/guests";
import { validateRsvp, type FieldErrors } from "@/lib/validation";

export type FormState = { error?: string; fieldErrors?: FieldErrors; values?: Record<string, string> };

export async function submitRsvp(_prev: FormState, formData: FormData): Promise<FormState> {
  const { name, company, error } = readNameCompany(formData);
  const attendance = String(formData.get("attending") ?? "");
  const values = { name, company, attending: attendance };
  const fieldErrors = validateRsvp(formData);
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };
  if (error) return { error, values };

  let token: string;
  try {
    token = await saveRsvp(name, company, attendance === "yes");
  } catch (e) {
    console.error("saveRsvp failed", e);
    return { error: "Terjadi kesalahan. Silakan coba lagi.", values };
  }
  redirect(`/tiket/${token}`);
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
