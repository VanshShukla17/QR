import type { RegisterIdentityRequest } from "@qraksha/shared";
import { getSupabaseAdmin } from "../db/supabase.js";

export class ConflictError extends Error {
  code = "CONFLICT" as const;
  disputeUrl?: string;

  constructor(message: string, disputeUrl?: string) {
    super(message);
    this.name = "ConflictError";
    this.disputeUrl = disputeUrl;
  }
}

export function maskVpa(vpa: string): string {
  const [handle, provider] = vpa.split("@");
  if (!handle || !provider) return "***@***";
  const prefix = handle.slice(0, Math.min(2, handle.length));
  return `${prefix}****@${provider}`;
}

export interface RegisterIdentityResult {
  merchantId: string;
  identityId: string;
  identityTier: "gst_verified" | "baseline";
  displayName: string;
}

export async function registerMerchantIdentity(
  input: RegisterIdentityRequest
): Promise<RegisterIdentityResult> {
  const supabase = getSupabaseAdmin();

  // 1. Path: GST / Udyam registration
  if (input.path === "gst_udyam") {
    // Check if GST/Udyam is already registered
    const { data: existingGst, error: gstCheckError } = await supabase
      .schema("identity")
      .from("merchant_identity")
      .select("id, merchant_id")
      .eq("gst_udyam_number", input.gstUdyamNumber)
      .maybeSingle();

    if (gstCheckError) {
      throw new Error(`Failed to check existing GST: ${gstCheckError.message}`);
    }

    if (existingGst) {
      throw new ConflictError(
        "This GST/Udyam number is already registered. If you believe this is fraudulent, file a dispute.",
        "/credential/dispute/new"
      );
    }

    // Upsert or retrieve merchant record by contact_phone
    const merchantId = await getOrCreateMerchant(input.contactPhone, input.displayName);

    // Insert into identity.merchant_identity
    const { data: identityRecord, error: insertError } = await supabase
      .schema("identity")
      .from("merchant_identity")
      .insert({
        merchant_id: merchantId,
        identity_tier: "gst_verified",
        gst_udyam_number: input.gstUdyamNumber,
        kyc_address: input.kycAddress,
        otp_confirmed: true,
      })
      .select("id")
      .single();

    if (insertError || !identityRecord) {
      throw new Error(
        `Failed to create merchant identity: ${insertError?.message || "Unknown error"}`
      );
    }

    return {
      merchantId,
      identityId: identityRecord.id,
      identityTier: "gst_verified",
      displayName: input.displayName,
    };
  }

  // 2. Path: Penny-drop registration (Baseline tier)
  const merchantId = await getOrCreateMerchant(input.contactPhone, input.displayName);

  const maskedVpa = maskVpa(input.bankVpa);

  const { data: identityRecord, error: insertError } = await supabase
    .schema("identity")
    .from("merchant_identity")
    .insert({
      merchant_id: merchantId,
      identity_tier: "baseline",
      bank_vpa_masked: maskedVpa,
      kyc_address: input.kycAddress,
      otp_confirmed: true,
    })
    .select("id")
    .single();

  if (insertError || !identityRecord) {
    throw new Error(
      `Failed to create merchant identity: ${insertError?.message || "Unknown error"}`
    );
  }

  return {
    merchantId,
    identityId: identityRecord.id,
    identityTier: "baseline",
    displayName: input.displayName,
  };
}

async function getOrCreateMerchant(
  contactPhone: string,
  displayName: string
): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data: existingMerchant } = await supabase
    .from("merchant")
    .select("id")
    .eq("contact_phone", contactPhone)
    .maybeSingle();

  if (existingMerchant) {
    return existingMerchant.id;
  }

  const { data: newMerchant, error: createError } = await supabase
    .from("merchant")
    .insert({
      contact_phone: contactPhone,
      display_name: displayName,
    })
    .select("id")
    .single();

  if (createError || !newMerchant) {
    throw new Error(
      `Failed to create merchant record: ${createError?.message || "Unknown error"}`
    );
  }

  return newMerchant.id;
}
