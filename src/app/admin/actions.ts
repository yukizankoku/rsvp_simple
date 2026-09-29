"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/auth";
import {
  checkIn,
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
  if (attendance !== "yes" && attendance !== "no") return { error: "Pilih status kehadiran.", values };

  if (!(await updateGuest(id, name, company, attendance === "yes"))) {
    return { error: "Sudah ada tamu lain dengan nama dan perusahaan yang sama.", values };
  }
  revalidatePath("/admin");
  redirect("/admin");
}

export async function removeGuest(formData: FormData) {
  await requireAdmin();
  await deleteGuest(String(formData.get("id")));
  revalidatePath("/admin");
  redirect("/admin");
}
