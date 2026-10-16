"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/auth";
import { emailConfigured, sendInvitation, sendTicket } from "@/lib/email";
import {
  checkIn,
  createGuest,
  createGuests,
  deleteGuest,
  findById,
  findByToken,
  findPlusOne,
  listGuests,
  markInvited,
  readEmail,
  readNameCompany,
  readPhone,
  undoCheckIn,
  updateGuest,
  type CheckInResult,
  type Guest,
} from "@/lib/guests";
import { ImportError, planImport, readGuestSheet, type Skipped } from "@/lib/import";
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
  const { phone, error: phoneError } = readPhone(formData);
  const attendance = String(formData.get("attending") ?? "");
  const values = { name, company, email, phone, attending: attendance };
  if (error || emailError || phoneError) return { error: error ?? emailError ?? phoneError, values };

  // Neither option picked = still waiting for the guest's answer.
  const attending = attendance === "yes" ? true : attendance === "no" ? false : null;
  const result = await updateGuest(id, name, company, email, phone, attending);
  if (!result.ok) {
    const error = result.reason === "email_taken" ? "Email ini sudah dipakai tamu lain." : "Tamu tidak ditemukan.";
    return { error, values };
  }
  revalidatePath("/admin");
  redirect("/admin");
}

/** Add a guest before sending their personal link. The guest confirms attendance themselves. */
export async function addGuest(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { name, company, error } = readNameCompany(formData);
  const { email, error: emailError } = readEmail(formData);
  const { phone, error: phoneError } = readPhone(formData);
  const values = { name, company, email, phone };
  if (error || emailError || phoneError) return { error: error ?? emailError ?? phoneError, values };
  if (!(await createGuest(name, company, { email, phone }))) {
    return { error: "Email ini sudah dipakai tamu lain.", values };
  }
  revalidatePath("/admin");
  // Keep the company: guests are often added one company at a time.
  return { values: { name: "", company, email: "", phone: "", added: name, at: String(Date.now()) } };
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

/** Delete from the guest list. Stays on the list, so the search and filter are kept. */
export async function removeGuestFromList(formData: FormData) {
  await requireAdmin();
  await deleteGuest(String(formData.get("id")));
  revalidatePath("/admin");
}

export type BlastResult = { sent: number; failed: number; skipped: number };

/**
 * Send the invitation to a few guests. The page calls this repeatedly with small batches,
 * so a long blast never hits the server's time limit and the admin sees the progress.
 */
export async function sendInvitationBatch(ids: string[]): Promise<BlastResult> {
  await requireAdmin();
  if (!emailConfigured()) throw new Error("SMTP is not configured");
  const result: BlastResult = { sent: 0, failed: 0, skipped: 0 };
  const baseUrl = await appUrl();

  // One at a time: SMTP servers such as Gmail refuse many parallel connections.
  for (const id of ids.slice(0, 10)) {
    const guest = await findById(id);
    // Checked again: the guest may have answered or been edited since the page loaded.
    if (!guest?.email || guest.plus_one_of || guest.attending !== null) {
      result.skipped++;
      continue;
    }
    try {
      await sendInvitation(guest, baseUrl);
      await markInvited(guest.id);
      result.sent++;
    } catch (e) {
      console.error("sendInvitationBatch failed", guest.id, e);
      result.failed++;
    }
  }
  return result;
}

export type ImportState = { error?: string; added?: number; skipped?: Skipped[]; at?: number };

/** Add guests from an Excel file (see /admin/import/template). */
export async function importGuests(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih file Excel (.xlsx) terlebih dahulu." };

  let plan: ReturnType<typeof planImport>;
  try {
    const [rows, existing] = await Promise.all([readGuestSheet(await file.arrayBuffer()), listGuests()]);
    plan = planImport(rows, existing);
  } catch (e) {
    if (e instanceof ImportError) return { error: e.message };
    console.error("importGuests: read failed", e);
    return { error: "File tidak bisa dibaca. Pastikan formatnya .xlsx (bukan .xls atau .csv)." };
  }

  try {
    await createGuests(plan.add);
  } catch (e) {
    console.error("importGuests: insert failed", e);
    revalidatePath("/admin");
    return { error: "Gagal menyimpan data tamu. Periksa daftar tamu sebelum mengimpor ulang." };
  }
  revalidatePath("/admin");
  return { added: plan.add.length, skipped: plan.skipped, at: Date.now() };
}
