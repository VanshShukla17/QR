import type { AuditVerdict, VerdictReason, PipelineAgentOutputs } from "@qraksha/shared";

import { supabaseAdmin, isSupabaseConfigured } from "../db/client.js";
import { ServiceUnavailableError } from "../middleware/error.middleware.js";
import { payloadLookupService } from "../services/payload-lookup.service.js";
import { logger } from "../middleware/logger.middleware.js";
import { runIdentityAgent } from "./identity.agent.js";
import { runVisionAgent } from "./vision.agent.js";
import { runContextAgent } from "./context.agent.js";
import { runAttestationAgent } from "./attestation.agent.js";
import { runMisbindingAgent } from "./misbinding.agent.js";
import { runTrustAgent } from "./trust.agent.js";

export interface PipelineVerdict {
  verdict: AuditVerdict;
  reason: VerdictReason;
  message: string;
  agentOutputs: PipelineAgentOutputs;
  degradedCheck: boolean;
  credentialId?: string;
  auditRunId?: string;
}

export interface PipelineOptions {
  initiatedBy?: "merchant" | "customer";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db?: any;
  simulateFailAgent?: "identity" | "context" | "vision" | "attestation";
  correlationId?: string;
}

/**
 * Orchestrator sequences the 5 agents:
 * 1. QR Decode & Payload Lookup (Task 7)
 * 2. Parallel: Identity, Vision, Context, Attestation Agents (Task 8)
 *    - With Degraded Mode Fallback (ARCHITECTURE.md Section 10)
 * 3. Misbinding Agent (Task 9)
 * 4. Trust Agent (Task 9)
 * 5. Persists to comparison.audit_run
 */
export async function runAgentPipeline(
  qrPayload: string,
  latitude?: number,
  longitude?: number,
  photoBase64?: string,
  options: PipelineOptions = {}
): Promise<PipelineVerdict> {
  const db = options.db || supabaseAdmin;
  const initiatedBy = options.initiatedBy || "merchant";
  let degradedCheck = false;

  // 1. Step 1: QR Decode & Payload Lookup
  const lookupResult = await payloadLookupService.lookupByPayload(qrPayload, false, db);

  // 2. Step 2: Parallel execution of Identity, Vision, Context, Attestation agents
  // Check for Identity or Context failures (CRITICAL: cannot proceed if either fails)
  if (options.simulateFailAgent === "identity") {
    throw new ServiceUnavailableError(
      "Identity verification service unavailable. Verification aborted to prevent incorrect verdicts."
    );
  }
  if (options.simulateFailAgent === "context") {
    throw new ServiceUnavailableError(
      "Context geolocation service unavailable. Verification aborted to prevent incorrect verdicts."
    );
  }

  // Identity Agent
  const identityOutput = await runIdentityAgent({
    qrPayload,
    lookupResult,
  });

  // Context Agent (uses exact GPS coordinates for distance calculation)
  const contextOutput = await runContextAgent({
    liveLatitude: latitude,
    liveLongitude: longitude,
    boundLat: lookupResult?.boundLat,
    boundLng: lookupResult?.boundLng,
    boundRadiusM: lookupResult?.boundRadiusM,
  });

  // Vision Agent (Soft signal with degraded mode fallback)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let visionOutput: any;
  if (options.simulateFailAgent === "vision") {
    degradedCheck = true;
    logger.warn(
      "Vision agent unavailable; falling back to degraded mode",
      options.correlationId,
      {
        failedAgent: "vision",
        degradedCheck: true,
      }
    );
    visionOutput = {
      status: "warn",
      reason: "Vision agent unavailable; proceeding with degraded check",
      metadata: { degraded: true },
    };
  } else {
    try {
      visionOutput = await runVisionAgent({
        photoBase64,
        referenceEmbedding: lookupResult?.referenceEmbedding,
      });
    } catch (_visionErr) {
      degradedCheck = true;
      logger.warn(
        "Vision agent encountered an error; falling back to degraded mode",
        options.correlationId,
        {
          failedAgent: "vision",
          degradedCheck: true,
        }
      );
      visionOutput = {
        status: "warn",
        reason: "Vision agent encountered an error; proceeding with degraded check",
        metadata: { degraded: true },
      };
    }
  }

  // Attestation Agent (With degraded mode fallback)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let attestationOutput: any;
  if (options.simulateFailAgent === "attestation") {
    degradedCheck = true;
    logger.warn(
      "Attestation agent unavailable; falling back to degraded mode",
      options.correlationId,
      {
        failedAgent: "attestation",
        degradedCheck: true,
      }
    );
    attestationOutput = {
      status: "pass",
      diversityScore: 0.0,
      signalCount: 0,
      reason: "Attestation agent unavailable; proceeding with degraded check",
      metadata: { degraded: true },
    };
  } else {
    try {
      attestationOutput = await runAttestationAgent({
        credentialId: lookupResult?.credentialId,
        db,
      });
    } catch (_attestErr) {
      degradedCheck = true;
      logger.warn(
        "Attestation agent encountered an error; falling back to degraded mode",
        options.correlationId,
        {
          failedAgent: "attestation",
          degradedCheck: true,
        }
      );
      attestationOutput = {
        status: "pass",
        diversityScore: 0.0,
        signalCount: 0,
        reason: "Attestation agent encountered an error; proceeding with degraded check",
        metadata: { degraded: true },
      };
    }
  }

  // 3. Step 3: Misbinding Agent
  const misbindingOutput = await runMisbindingAgent({
    qrDecode: { status: "pass", reason: "Payload decoded" },
    identity: identityOutput,
    vision: visionOutput,
    context: contextOutput,
    attestation: attestationOutput,
  });

  const agentOutputs: PipelineAgentOutputs = {
    qrDecode: { status: "pass", reason: "Payload successfully read" },
    identity: identityOutput,
    vision: visionOutput,
    context: contextOutput,
    attestation: attestationOutput,
    misbinding: misbindingOutput,
  };

  // 4. Step 4: Trust Agent
  const trustOutput = await runTrustAgent({
    agentOutputs,
    credentialTrustTier: lookupResult?.trustTier,
  });

  agentOutputs.trust = trustOutput;

  // 5. Step 5: Persist to comparison.audit_run
  let auditRunId: string | undefined;
  try {
    if (db && isSupabaseConfigured()) {
      const { data: insertedRun } = await db
        .schema("comparison")
        .from("audit_run")
        .insert({
          credential_id: lookupResult?.credentialId || null,
          registered_qr_id: lookupResult?.id || null,
          initiated_by: initiatedBy,
          verdict: trustOutput.verdict,
          verdict_reason: trustOutput.reasonCode,
          agent_outputs: agentOutputs,
          degraded_check: degradedCheck,
        })
        .select("id")
        .maybeSingle();

      auditRunId = insertedRun?.id;

      // If WARNING verdict, immediately set trust_tier = 'warning' on the credential
      if (trustOutput.verdict === "WARNING" && lookupResult?.credentialId) {
        await db
          .schema("comparison")
          .from("merchant_credential")
          .update({
            trust_tier: "warning",
            updated_at: new Date().toISOString(),
          })
          .eq("id", lookupResult.credentialId);
      }
    }
  } catch (_persistErr) {
    // Non-blocking for offline or mocked runs
  }

  logger.info("Agent pipeline verdict computed", options.correlationId, {
    type: "audit_verdict",
    verdict: trustOutput.verdict,
    reason: trustOutput.reasonCode,
    degradedCheck,
    credentialId: lookupResult?.credentialId,
    initiatedBy,
  });

  return {
    verdict: trustOutput.verdict,
    reason: trustOutput.reasonCode,
    message: trustOutput.reason || "Verdict computed",
    agentOutputs,
    degradedCheck,
    credentialId: lookupResult?.credentialId,
    auditRunId,
  };
}
