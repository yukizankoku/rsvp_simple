"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/auth";
import { emailConfigured, sendInvitation, sendTicket } from "@/lib/email";
import {
  checkIn,
  createGuest,
  deleteGuest,
  findById,
  findByToken,
  findPlusOne,
  markInvited,
  readEmail,
  readNameCompany,
  undoCheckIn,
  updateGuest,
  type CheckInResult,
  type Guest,
} from "@/lib/guests";
import { appUrl } from "@/lib/url";
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
  const { email, error: emailError } = readEmail(formData);
  const attendance = String(formData.get("attending") ?? "");
  const values = { name, company, email, attending: attendance };
  if (error || emailError) return { error: error ?? emailError, values };

  // Neither option picked = still waiting for the guest's answer.
  const attending = attendance === "yes" ? true : attendance === "no" ? false : null;
  if (!(await updateGuest(id, name, company, email, attending))) {
    return { error: "Sudah ada tamu lain dengan nama dan perusahaan yang sama.", values };
  }
  revalidatePath("/admin");
  redirect("/admin");
}

/** Add a guest before sending their personal link. The guest confirms attendance themselves. */
export async function addGuest(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { name, company, error } = readNameCompany(formData);
  const { email, error: emailError } = readEmail(formData);
  const values = { name, company, email };
  if (error || emailError) return { error: error ?? emailError, values };
  if (!(await createGuest(name, company, { email }))) {
    return { error: "Tamu dengan nama dan perusahaan ini sudah ada di daftar.", values };
  }
  revalidatePath("/admin");
  // Keep the company: guests are often added one company at a time.
  return { values: { name: "", company, email: "", added: name, at: String(Date.now()) } };
}

export type SendState = { ok?: boolean; error?: string };

/**
 * Email a guest: the invitation with their short link, or (`kind = "ticket"`) their QR code again.
 * Used by the buttons in the guest list and on the edit page.
 */
export async function sendGuestEmail(_prev: SendState, formData: FormData): Promise<SendState> {
  await requireAdmin();
  if (!emailConfigured()) return { error: "Email belum diatur (SMTP_HOST, SMTP_USER, SMTP_PASS)." };
  const guest = await findById(String(formData.get("id")));
  if (!guest) return { error: "Tamu tidak ditemukan." };
  if (!guest.email) return { error: "Tamu ini belum punya email." };

  try {
    const baseUrl = await appUrl();
    if (formData.get("kind") === "ticket") {
      if (!guest.attending) return { error: "Tamu belum konfirmasi hadir." };
      const companion = guest.plus_one_of ? null : await findPlusOne(guest.id);
      await sendTicket(guest, companion, baseUrl);
    } else {
      await sendInvitation(guest, baseUrl);
      await markInvited(guest.id);
    }
  } catch (e) {
    console.error("sendGuestEmail failed", e);
    return { error: "Gagal mengirim email. Cek pengaturan SMTP." };
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/tamu/${guest.id}`);
  return { ok: true };
}

export async function removeGuest(formData: FormData) {
  await requireAdmin();
  await deleteGuest(String(formData.get("id")));
  revalidatePath("/admin");
  redirect("/admin");
}
