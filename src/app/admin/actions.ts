"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/auth";
import {
  checkIn,
  createGuest,
  deleteGuest,
  findByToken,
  readNameCompany,
  undoCheckIn,
  updateGuest,
  type CheckInResult,
  type Guest,
} from "@/lib/guests";
import type { FormState } from "@/app/actions";

export async function login(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  if (!checkPassword(String(formData.get("password") ?? ""))) {
    // Slow down password guessing a little.
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Password salah." };
  }
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

export async function lookupScan(token: string): Promise<{ guest: Guest | null }> {
  await requireAdmin();
  return { guest: token ? await findByToken(token) : null };
}

export async function confirmCheckIn(token: string, allowNotAttending = false): Promise<CheckInResult> {
  await requireAdmin();
  const result = await checkIn(token, allowNotAttending);
  revalidatePath("/admin");
  return result;
}

export async function manualCheckIn(formData: FormData) {
  await requireAdmin();
  await checkIn(String(formData.get("token")));
  revalidatePath("/admin");
}

export async function cancelCheckIn(formData: FormData) {
  await requireAdmin();
  await undoCheckIn(String(formData.get("id")));
  revalidatePath("/admin");
}

export async function editGuest(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const { name, company, error } = readNameCompany(formData);
  const attendance = String(formData.get("attending") ?? "");
  const values = { name, company, attending: attendance };
  if (error) return { error, values };

  // Neither option picked = still waiting for the guest's answer.
  const attending = attendance === "yes" ? true : attendance === "no" ? false : null;
  if (!(await updateGuest(id, name, company, attending))) {
    return { error: "Sudah ada tamu lain dengan nama dan perusahaan yang sama.", values };
  }
  revalidatePath("/admin");
  redirect("/admin");
}

/** Add a guest before sending their personal link. The guest confirms attendance themselves. */
export async function addGuest(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { name, company, error } = readNameCompany(formData);
  const values = { name, company };
  if (error) return { error, values };
  if (!(await createGuest(name, company))) {
    return { error: "Tamu dengan nama dan perusahaan ini sudah ada di daftar.", values };
  }
  revalidatePath("/admin");
  // Keep the company: guests are often added one company at a time.
  return { values: { name: "", company, added: name, at: String(Date.now()) } };
}

export async function removeGuest(formData: FormData) {
  await requireAdmin();
  await deleteGuest(String(formData.get("id")));
  revalidatePath("/admin");
  redirect("/admin");
}
