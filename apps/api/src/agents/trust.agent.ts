import type {
  AuditVerdict,
  VerdictReason,
  AgentOutput,
  PipelineAgentOutputs,
} from "@qraksha/shared";

import { MisbindingAgentOutput } from "./misbinding.agent.js";
import { IdentityAgentOutput } from "./identity.agent.js";

export interface TrustAgentInput {
  agentOutputs: PipelineAgentOutputs;
  credentialTrustTier?: string;
  hasUnresolvedWarning?: boolean;
}

export interface TrustAgentOutput extends AgentOutput {
  verdict: AuditVerdict;
  reasonCode: VerdictReason;
}

/**
 * Trust Agent:
 * Combines all signals into one of VERIFIED / RECENTLY_REGISTERED / WARNING
 * plus a verdict_reason code: UNKNOWN_QR, LOCATION_MISMATCH, MISBINDING, OK.
 * Per ARCHITECTURE.md Section 4.
 */
export async function runTrustAgent(input: TrustAgentInput): Promise<TrustAgentOutput> {
  const { agentOutputs, credentialTrustTier, hasUnresolvedWarning } = input;

  const identity = agentOutputs.identity as IdentityAgentOutput | undefined;
  const context = agentOutputs.context;
  const misbinding = agentOutputs.misbinding as MisbindingAgentOutput | undefined;

  // Single WARNING overrides everything rule (ARCHITECTURE.md Section 4)
  if (hasUnresolvedWarning) {
    return {
      status: "fail",
      verdict: "WARNING",
      reasonCode: "MISBINDING",
      reason: "Credential has an unresolved active warning or dispute flag",
    };
  }

  // 1a. Suspended / Revoked Credential Check
  if (
    identity &&
    identity.status === "fail" &&
    (identity.reason?.toLowerCase().includes("suspended") ||
      identity.reason?.toLowerCase().includes("revoked"))
  ) {
    return {
      status: "fail",
      verdict: "WARNING",
      reasonCode: "CREDENTIAL_SUSPENDED",
      reason:
        identity.reason ||
        "Credential has been suspended or revoked. Payments to this QR are disabled.",
    };
  }

  // 1b. Unknown QR Check (Swapped fake QR attack)
  if (identity && (!identity.isRegistered || identity.status === "fail")) {
    return {
      status: "fail",
      verdict: "WARNING",
      reasonCode: "UNKNOWN_QR",
      reason:
        "Unknown QR sticker: This payload is not registered to any merchant in QRaksha",
    };
  }

  // 2. Location Mismatch Check (Relocated sticker attack - flagship differentiator)
  if (context && context.status === "fail") {
    return {
      status: "fail",
      verdict: "WARNING",
      reasonCode: "LOCATION_MISMATCH",
      reason:
        context.reason ||
        "QR sticker relocation detected: scan outside authorized radius",
    };
  }

  // 3. Misbinding Check (Unauthorized identity / binding collision)
  if (misbinding && (misbinding.status === "fail" || misbinding.isMisbound)) {
    return {
      status: "fail",
      verdict: "WARNING",
      reasonCode: "MISBINDING",
      reason:
        misbinding.reason ||
        "Signal inconsistency detected between QR payload and merchant binding",
    };
  }

  // 4. All checks passed! Determine between VERIFIED and RECENTLY_REGISTERED
  const isVerifiedTier = credentialTrustTier === "verified";

  if (isVerifiedTier) {
    return {
      status: "pass",
      verdict: "VERIFIED",
      reasonCode: "OK",
      reason:
        "All verification signals verified: genuine sticker, bound location, and established trust",
    };
  }

  // Fresh / baseline registration building trust
  return {
    status: "pass",
    verdict: "RECENTLY_REGISTERED",
    reasonCode: "OK",
    reason:
      "Genuine sticker and location verified. Credential is in good standing and building trust history.",
  };
}
