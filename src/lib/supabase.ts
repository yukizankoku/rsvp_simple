import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Server-side client using the service_role key. Never import this from a client component.
export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  // New projects use a secret key (sb_secret_...); older ones use the legacy service_role JWT.
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
