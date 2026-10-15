/**
 * Centralized Application Constants & Merchant Identity Resolution
 * Per AGENTS.md Rule 6 and user directive.
 */

export const DEFAULT_DEMO_MERCHANT_ID = "550e8400-e29b-41d4-a716-446655440000";
export const DEFAULT_DEMO_CREDENTIAL_ID = "550e8400-e29b-41d4-a716-446655440000";

/**
 * Derives current merchant ID from local storage session or defaults to centralized demo ID.
 */
export function getActiveMerchantId(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("qraksha_merchant_id");
    if (stored && stored.trim()) return stored.trim();
  }
  return DEFAULT_DEMO_MERCHANT_ID;
}

/**
 * Derives current active credential ID from local storage session or defaults to centralized demo ID.
 */
export function getActiveCredentialId(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("qraksha_credential_id");
    if (stored && stored.trim()) return stored.trim();
  }
  return DEFAULT_DEMO_CREDENTIAL_ID;
}
