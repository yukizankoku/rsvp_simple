import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "rsvp_admin";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function password() {
  const value = process.env.ADMIN_PASSWORD;
  if (!value) throw new Error("ADMIN_PASSWORD must be set");
  return value;
}

// Signed with the admin password, so changing the password logs everyone out.
function sign(expires: number) {
  return createHmac("sha256", password()).update(`admin:${expires}`).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkPassword(input: string) {
  return safeEqual(input, password());
}

export async function startSession() {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE;
  (await cookies()).set(COOKIE, `${expires}.${sign(expires)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [expRaw, sig] = value.split(".");
  const expires = Number(expRaw);
  if (!sig || !Number.isFinite(expires) || expires < Date.now() / 1000) return false;
  return safeEqual(sig, sign(expires));
}

/** Use at the top of every admin page and server action. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/login");
}
