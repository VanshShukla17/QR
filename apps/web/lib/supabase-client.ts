import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-anon-key";

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export async function sendPhoneOtp(phone: string) {
  const supabase = createClient();
  return await supabase.auth.signInWithOtp({
    phone,
  });
}

export async function verifyPhoneOtp(phone: string, token: string) {
  const supabase = createClient();
  return await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
}
