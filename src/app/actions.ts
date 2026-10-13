"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { emailConfigured, sendTicket } from "@/lib/email";
import { clean, findByNameCompany, findPlusOne, readEmail, readNameCompany, saveRsvp, type RsvpResult } from "@/lib/guests";
import { appUrl } from "@/lib/url";
import { validateRsvp, type FieldErrors } from "@/lib/validation";

export type FormState = { error?: string; fieldErrors?: FieldErrors; values?: Record<string, string> };

/** Handles both the public form (name + company typed by the guest) and personal links (token). */
export async function submitRsvp(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const { name, company, error } = readNameCompany(formData);
  const attendance = String(formData.get("attending") ?? "");
  const plusOne = clean(formData.get("plus_one"));
  const { email } = readEmail(formData);
  const values = { name, company, email, attending: attendance, plus_one: plusOne };

  const fieldErrors = validateRsvp(formData);
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };
  // Only reachable when a field is too long; the empty case is caught by validateRsvp.
  if (!token && error) return { error: "Name or company name is too long.", values };

  let result: RsvpResult;
  try {
    result = await saveRsvp(token ? { token } : { name, company }, attendance === "yes", plusOne, email);
  } catch (e) {
    console.error("saveRsvp failed", e);
    return { error: "Something went wrong. Please try again.", values };
  }
  if (!result.ok) {
    if (result.reason === "not_found") return { error: "Invitation not found or has been removed.", values };
    const message =
      result.reason === "plus_one_same"
        ? "Your companion's name cannot be the same as yours."
        : "Your companion is already registered as a guest and does not need to be added again.";
    return { fieldErrors: { plus_one: message }, values };
  }

  const guest = result.guest;
  if (guest.attending && guest.email && emailConfigured()) {
    const baseUrl = await appUrl();
    // Send after the response so the guest sees their QR page without waiting for the mail server.
    after(async () => {
      try {
        const companion = guest.plus_one_of ? null : await findPlusOne(guest.id);
        await sendTicket(guest, companion, baseUrl);
      } catch (e) {
        console.error("sendTicket failed", e);
      }
    });
  }
  redirect(`/tiket/${guest.token}`);
}

export async function lookupTicket(_prev: FormState, formData: FormData): Promise<FormState> {
  const { name, company, error } = readNameCompany(formData);
  const values = { name, company };
  if (!name || !company) return { error: "Please enter your name and company name.", values };
  if (error) return { error: "Name or company name is too long.", values };

  let token: string | undefined;
  try {
    token = (await findByNameCompany(name, company))?.token;
  } catch (e) {
    console.error("lookupTicket failed", e);
    return { error: "Something went wrong. Please try again.", values };
  }
  if (!token) {
    return {
      error: "Not found. Make sure the name and company match what you entered when you confirmed.",
      values,
    };
  }
  redirect(`/tiket/${token}`);
}
