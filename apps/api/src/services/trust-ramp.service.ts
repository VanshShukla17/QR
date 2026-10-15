import type { IdentityTier, TrustTier } from "@qraksha/shared";

export interface TrustCalculationInput {
  identityTier: IdentityTier;
  daysSinceActivation: number;
  cleanAuditCount: number;
  attestationDiversityScore: number;
  hasUnresolvedWarning: boolean;
}

export interface TrustScoreResult {
  score: number;
  tier: TrustTier;
}

/**
 * Calculates trust score and tier per ARCHITECTURE.md Section 4
 */
export function calculateTrustScore(input: TrustCalculationInput): TrustScoreResult {
  if (input.hasUnresolvedWarning) {
    return { score: 0, tier: "warning" };
  }

  const timeComponent = Math.min(40, input.daysSinceActivation * 4);
  const auditComponent = Math.min(30, input.cleanAuditCount * 3);
  const attestationComponent = Math.min(30, input.attestationDiversityScore * 30);

  const score = Math.round(timeComponent + auditComponent + attestationComponent);

  const minDaysRequired = input.identityTier === "gst_verified" ? 3 : 7;
  const isEligibleForVerified =
    score >= 60 && input.daysSinceActivation >= minDaysRequired;

  return {
    score,
    tier: isEligibleForVerified ? "verified" : "unverified",
  };
}
