import type { AgentOutput } from "@qraksha/shared";

export interface MisbindingAgentInput {
  qrDecode?: AgentOutput;
  identity?: AgentOutput;
  vision?: AgentOutput;
  context?: AgentOutput;
  attestation?: AgentOutput;
}

export interface MisbindingAgentOutput extends AgentOutput {
  isMisbound: boolean;
}

/**
 * Misbinding Agent:
 * Given upstream agent outputs, determines internal consistency (e.g. right QR, wrong place).
 * Per ARCHITECTURE.md Section 3 & 4.
 */
export async function runMisbindingAgent(
  input: MisbindingAgentInput
): Promise<MisbindingAgentOutput> {
  const { identity, context } = input;

  // 1. If identity indicates the QR is completely unregistered
  if (identity?.status === "fail" && identity.reason?.includes("unknown")) {
    return {
      status: "pass",
      isMisbound: false,
      reason: "No misbinding: QR payload is completely unknown in registry",
    };
  }

  // 2. If identity failed due to suspended or disputed credential
  if (identity?.status === "fail") {
    return {
      status: "fail",
      isMisbound: true,
      reason: `Credential binding failure: ${identity.reason || "Unauthorized identity"}`,
    };
  }

  // 3. Location mismatch: Right QR, but wrong place!
  if (context?.status === "fail") {
    return {
      status: "fail",
      isMisbound: true,
      reason:
        "Geographic misbinding detected: valid registered QR sticker presented outside authorized premises",
    };
  }

  // 4. Clean consistency
  return {
    status: "pass",
    isMisbound: false,
    reason: "Upstream agent signals are internally consistent",
  };
}
