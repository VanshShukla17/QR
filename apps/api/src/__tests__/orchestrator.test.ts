import { describe, it, expect, vi, beforeEach } from "vitest";

import { runAgentPipeline } from "../agents/orchestrator.js";
import { payloadLookupService } from "../services/payload-lookup.service.js";
import { ServiceUnavailableError } from "../middleware/error.middleware.js";

describe("Orchestrator and Verdict Engine (Task 9)", () => {
  const registeredQrPayload = "upi://pay?pa=genuine@sbi&pn=GenuineStore";
  const boundLat = 12.9716;
  const boundLng = 77.5946;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;

  beforeEach(() => {
    // Prime the payload cache with a known genuine QR
    payloadLookupService.primeCache(
      payloadLookupService.hashPayload(registeredQrPayload),
      {
        id: "qr-genuine",
        credentialId: "cred-genuine",
        qrPayloadHash: payloadLookupService.hashPayload(registeredQrPayload),
        boundLat,
        boundLng,
        boundRadiusM: 100,
        trustTier: "unverified", // Fresh registration
        credentialStatus: "active",
      }
    );

    mockDb = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "audit-123" } }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    };
  });

  it("genuine-sticker scan against fresh demo credential returns 🟡 with verdict_reason = OK", async () => {
    const result = await runAgentPipeline(
      registeredQrPayload,
      boundLat,
      boundLng,
      undefined,
      {
        db: mockDb,
      }
    );

    expect(result.verdict).toBe("RECENTLY_REGISTERED");
    expect(result.reason).toBe("OK");
    expect(result.degradedCheck).toBe(false);
    expect(result.credentialId).toBe("cred-genuine");
  });

  it("genuine-sticker scan against verified credential returns 🟢 VERIFIED with verdict_reason = OK", async () => {
    const verifiedPayload = "upi://pay?pa=verified@sbi&pn=VerifiedStore";
    payloadLookupService.primeCache(payloadLookupService.hashPayload(verifiedPayload), {
      id: "qr-verified",
      credentialId: "cred-verified",
      qrPayloadHash: payloadLookupService.hashPayload(verifiedPayload),
      boundLat,
      boundLng,
      boundRadiusM: 100,
      trustTier: "verified", // Established verified credential
      credentialStatus: "active",
    });

    const result = await runAgentPipeline(
      verifiedPayload,
      boundLat,
      boundLng,
      undefined,
      {
        db: mockDb,
      }
    );

    expect(result.verdict).toBe("VERIFIED");
    expect(result.reason).toBe("OK");
  });

  it("swapped-QR scan returns 🔴 with verdict_reason = UNKNOWN_QR", async () => {
    const fakeQrPayload = "upi://pay?pa=scammer@paytm&pn=Fraud";

    const result = await runAgentPipeline(fakeQrPayload, boundLat, boundLng, undefined, {
      db: mockDb,
    });

    expect(result.verdict).toBe("WARNING");
    expect(result.reason).toBe("UNKNOWN_QR");
    expect(result.message).toContain("Unknown QR sticker");
  });

  it("relocated-genuine-QR scan returns 🔴 with verdict_reason = LOCATION_MISMATCH", async () => {
    // Live GPS in Mumbai while registered in Bangalore (> 800km)
    const relocatedLat = 19.076;
    const relocatedLng = 72.8777;

    const result = await runAgentPipeline(
      registeredQrPayload,
      relocatedLat,
      relocatedLng,
      undefined,
      { db: mockDb }
    );

    expect(result.verdict).toBe("WARNING");
    expect(result.reason).toBe("LOCATION_MISMATCH");
    expect(result.message).toContain("relocation detected");
    // Verify db updated credential to warning
    expect(mockDb.update).toHaveBeenCalledWith(
      expect.objectContaining({ trust_tier: "warning" })
    );
  });

  it("simulating an Identity agent failure returns service_unavailable, never a guessed verdict", async () => {
    await expect(
      runAgentPipeline(registeredQrPayload, boundLat, boundLng, undefined, {
        simulateFailAgent: "identity",
        db: mockDb,
      })
    ).rejects.toThrow(ServiceUnavailableError);
  });

  it("simulating a Context agent failure returns service_unavailable, never a guessed verdict", async () => {
    await expect(
      runAgentPipeline(registeredQrPayload, boundLat, boundLng, undefined, {
        simulateFailAgent: "context",
        db: mockDb,
      })
    ).rejects.toThrow(ServiceUnavailableError);
  });

  it("simulating a Vision agent failure returns a verdict with degraded_check = true using remaining agents", async () => {
    const result = await runAgentPipeline(
      registeredQrPayload,
      boundLat,
      boundLng,
      undefined,
      {
        simulateFailAgent: "vision",
        db: mockDb,
      }
    );

    expect(result.degradedCheck).toBe(true);
    expect(result.verdict).toBe("RECENTLY_REGISTERED");
    expect(result.reason).toBe("OK");
    expect(result.agentOutputs.vision?.status).toBe("warn");
  });

  it("simulating an Attestation agent failure returns a verdict with degraded_check = true using remaining agents", async () => {
    const result = await runAgentPipeline(
      registeredQrPayload,
      boundLat,
      boundLng,
      undefined,
      {
        simulateFailAgent: "attestation",
        db: mockDb,
      }
    );

    expect(result.degradedCheck).toBe(true);
    expect(result.verdict).toBe("RECENTLY_REGISTERED");
    expect(result.reason).toBe("OK");
  });
});
