import "server-only";
import { headers } from "next/headers";

/**
 * Absolute base URL for links in emails. Uses APP_URL when set, otherwise the host of the
 * current request. Call it inside a request (not inside `after()`).
 */
export async function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Short personal link sent to a guest. */
export function shortLink(base: string, shortCode: string) {
  return `${base}/i/${shortCode}`;
}
