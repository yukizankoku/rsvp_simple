import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { eventInfo } from "./event";
import type { Guest } from "./guests";
import { qrPng } from "./qr";
import { shortLink } from "./url";

let transport: Transporter | null = null;

export function emailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function mailer() {
  if (transport) return transport;
  if (!emailConfigured()) throw new Error("SMTP_HOST, SMTP_USER and SMTP_PASS must be set");
  const port = Number(process.env.SMTP_PORT || 465);
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // Port 465 uses TLS from the start; 587 upgrades with STARTTLS.
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transport;
}

function from() {
  return process.env.MAIL_FROM || process.env.SMTP_USER!;
}

function esc(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Shared email layout: header with the event, then the body, then a footer. */
function layout(body: string) {
  const event = eventInfo();
  const details = [event.date && `📅 ${esc(event.date)}`, event.location && `📍 ${esc(event.location)}`]
    .filter(Boolean)
    .join("<br>");
  return `<!doctype html>
<html lang="en"><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden">
  <tr><td bgcolor="#0b1120" style="background-color:#0b1120;background-image:linear-gradient(135deg,#1668ff 0%,#0b1120 60%,#3a56be 100%);padding:28px 24px;text-align:center;color:#ffffff">
    <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;opacity:.85">Invitation</div>
    <div style="font-size:24px;font-weight:bold;margin-top:8px">${esc(event.name)}</div>
    ${details ? `<div style="font-size:14px;margin-top:12px;line-height:1.6">${details}</div>` : ""}
  </td></tr>
  <tr><td style="padding:28px 24px;font-size:15px;line-height:1.6">${body}</td></tr>
  <tr><td style="padding:16px 24px;background:#fafafa;font-size:12px;color:#71717a;text-align:center">
    This email was sent automatically. Please do not reply.
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function button(href: string, label: string) {
  return `<p style="text-align:center;margin:24px 0">
  <a href="${esc(href)}" style="display:inline-block;background:#1660f5;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:12px">${esc(label)}</a>
</p>`;
}

/** Invitation with the guest's short personal link to confirm attendance. */
export async function sendInvitation(guest: Guest, baseUrl: string) {
  if (!guest.email) throw new Error("Guest has no email");
  const event = eventInfo();
  const link = shortLink(baseUrl, guest.short_code);
  const html = layout(`
    <p>Dear<br><strong>${esc(guest.name)}</strong><br>${esc(guest.company)}</p>
    <p>We are pleased to invite you to <strong>${esc(event.name)}</strong>.</p>
    <p>Please confirm your attendance using the button below. Once you confirm, your QR code for registration will be sent to this email.</p>
    ${button(link, "Confirm attendance")}
    <p style="font-size:13px;color:#71717a">Or open this link: <a href="${esc(link)}" style="color:#1660f5">${esc(link)}</a></p>`);

  await mailer().sendMail({
    from: from(),
    to: guest.email,
    subject: `Invitation: ${event.name}`,
    html,
    text: `Dear ${guest.name} (${guest.company})\n\nYou are invited to ${event.name}.\n${event.date}\n${event.location}\n\nConfirm attendance: ${link}`,
  });
}

/** QR code(s) after the guest confirms attendance. The companion's QR is included in the same email. */
export async function sendTicket(guest: Guest, plusOne: Guest | null, baseUrl: string) {
  if (!guest.email) return;
  const event = eventInfo();
  const people = plusOne ? [guest, plusOne] : [guest];
  const images = await Promise.all(people.map((p) => qrPng(p.token)));
  const link = shortLink(baseUrl, guest.short_code);

  // Inline (cid) images: Gmail and Outlook block data: URLs in emails.
  const qrBlock = (p: Guest, i: number, label: string) => `
    <div style="text-align:center;border:1px solid #e4e4e7;border-radius:12px;padding:16px;margin:16px 0">
      <div style="font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#1660f5">${esc(label)}</div>
      <img src="cid:qr-${i}" width="240" height="240" alt="QR code ${esc(p.name)}" style="display:block;margin:12px auto">
      <div style="font-size:18px;font-weight:bold">${esc(p.name)}</div>
      <div style="font-size:14px;color:#52525b">${esc(p.company)}</div>
    </div>`;

  const html = layout(`
    <p>Hello <strong>${esc(guest.name)}</strong>,</p>
    <p>Thank you, your attendance at <strong>${esc(event.name)}</strong> is confirmed.</p>
    <p><strong>Show ${plusOne ? "these QR codes" : "this QR code"} to the staff at event registration.</strong>${
      plusOne ? " Each person uses their own QR code." : ""
    } The QR ${plusOne ? "codes are" : "code is"} also attached as image files.</p>
    ${qrBlock(guest, 0, "Guest")}
    ${plusOne ? qrBlock(plusOne, 1, "Companion (+1)") : ""}
    ${button(link, "Open QR code / update response")}`);

  const fileName = (p: Guest) => `qr-${p.name.replace(/[^\w-]+/g, "-").toLowerCase()}.png`;
  await mailer().sendMail({
    from: from(),
    to: guest.email,
    subject: `Registration QR code: ${event.name}`,
    html,
    text: `Hello ${guest.name},\n\nYour attendance at ${event.name} is confirmed. Your QR code is attached; show it to the staff at registration.\n\nOpen QR code: ${link}`,
    attachments: people.map((p, i) => ({
      filename: fileName(p),
      content: images[i],
      cid: `qr-${i}`,
      contentType: "image/png",
    })),
  });
}
