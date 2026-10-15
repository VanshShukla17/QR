import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key";

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL;
  if (!url || url.includes("placeholder")) return false;
  if (process.env.MOCK_DB === "true" || process.env.OFFLINE_MODE === "true") return false;
  return true;
}
