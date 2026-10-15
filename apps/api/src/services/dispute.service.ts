import { supabaseAdmin } from "../db/client.js";
import { NotFoundError } from "../middleware/error.middleware.js";
import type { Dispute, FileDisputeResult, TrustTier } from "@qraksha/shared";

export class DisputeService {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private db: any = supabaseAdmin
  ) {}

  /**
   * Files a formal dispute against a target merchant credential.
   * Immediately downgrades the target credential's trust tier to WARNING pending review,
   * per ARCHITECTURE.md Section 4 and PRD.md Section 4.
   */
  async fileDispute(
    input: { credentialId: string; evidenceSummary: string },
    filedByMerchantId?: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dbOverride?: any
  ): Promise<FileDisputeResult> {
    const client = dbOverride || this.db;

    // 1. Verify target credential exists
    const { data: credential, error: credError } = await client
      .schema("comparison")
      .from("merchant_credential")
      .select("id, trust_tier, status")
      .eq("id", input.credentialId)
      .single();

    if (credError || !credential) {
      throw new NotFoundError(`Target credential ${input.credentialId} not found`);
    }

    const previousTrustTier = (credential.trust_tier || "warning") as TrustTier;

    // 2. Insert into comparison.dispute
    const { data: disputeRow, error: disputeError } = await client
      .schema("comparison")
      .from("dispute")
      .insert({
        credential_id: input.credentialId,
        filed_by_merchant_id: filedByMerchantId || null,
        status: "open",
        evidence_summary: input.evidenceSummary,
      })
      .select("*")
      .single();

    if (disputeError) {
      throw new Error(`Failed to create dispute record: ${disputeError.message}`);
    }

    // 3. Immediate auto-downgrade to WARNING side-effect
    const { error: updateError } = await client
      .schema("comparison")
      .from("merchant_credential")
      .update({
        trust_tier: "warning",
      })
      .eq("id", input.credentialId);

    if (updateError) {
      throw new Error(
        `Failed to downgrade target credential trust tier: ${updateError.message}`
      );
    }

    const dispute: Dispute = {
      id: disputeRow.id,
      credentialId: disputeRow.credential_id,
      filedByMerchantId: disputeRow.filed_by_merchant_id,
      status: disputeRow.status,
      evidenceSummary: disputeRow.evidence_summary,
      resolvedByAdminId: disputeRow.resolved_by_admin_id,
      resolutionReason: disputeRow.resolution_reason,
      createdAt: disputeRow.created_at,
      resolvedAt: disputeRow.resolved_at,
    };

    return {
      dispute,
      targetCredentialId: input.credentialId,
      previousTrustTier,
      newTrustTier: "warning",
      message:
        "Dispute filed successfully. Target credential has been immediately downgraded to WARNING pending administrative review.",
    };
  }
}

export const disputeService = new DisputeService();
