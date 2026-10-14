import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WebSocket from "ws";

if (!globalThis.WebSocket) {
  // Polyfill WebSocket in Node.js environments below v22 for Supabase client
  globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;
}

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
}

export function _resetSupabaseAdminForTesting(): void {
  supabaseAdmin = null;
}
