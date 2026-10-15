import { describe, it, expect, vi, afterEach } from "vitest";

import { runIdentityAgent } from "../agents/identity.agent.js";
import { runVisionAgent } from "../agents/vision.agent.js";
import {
  runContextAgent,
  calculateHaversineDistanceMeters,
} from "../agents/context.agent.js";
import { runAttestationAgent } from "../agents/attestation.agent.js";
import { runMisbindingAgent } from "../agents/misbinding.agent.js";
import { runTrustAgent } from "../agents/trust.agent.js";
import { setGeminiMockHandler, GeminiClient } from "../agents/gemini-client.js";
import { visionService } from "../services/vision.service.js";

describe("Phase 5 — Unit Tests for the Five Verification Agents", () => {
  afterEach(() => {
    setGeminiMockHandler(null);
  });

  describe("Agent 1: Identity Agent", () => {
    it("returns pass when QR payload matches registered active credential with mocked Gemini response", async () => {
      setGeminiMockHandler(async () =>
        JSON.stringify({
          status: "pass",
          reason: "Payload matches registered credential format",
          isValidUpiFormat: true,
        })
      );

      const output = await runIdentityAgent({
        qrPayload: "upi://pay?pa=store@sbi&pn=Store",
        lookupResult: {
          id: "qr-1",
          credentialId: "cred-1",
          qrPayloadHash: "hash123",
          boundLat: 12.9716,
          boundLng: 77.5946,
          boundRadiusM: 100,
          credentialStatus: "active",
        },
      });

      expect(output.status).toBe("pass");
      expect(output.isRegistered).toBe(true);
      expect(output.credentialId).toBe("cred-1");
      expect(output.metadata?.isValidUpiFormat).toBe(true);
    });

    it("returns fail when QR payload is unrecognized in registry (unregistered QR)", async () => {
      const output = await runIdentityAgent({
        qrPayload: "upi://pay?pa=fake@fraud&pn=Fake",
        lookupResult: null,
      });

      expect(output.status).toBe("fail");
      expect(output.isRegistered).toBe(false);
      expect(output.reason).toContain("unknown QR");
    });

    it("returns fail when credential is suspended", async () => {
      const output = await runIdentityAgent({
        qrPayload: "upi://pay?pa=store@sbi&pn=Store",
        lookupResult: {
          id: "qr-1",
          credentialId: "cred-1",
          qrPayloadHash: "hash123",
          boundLat: 12.9716,
          boundLng: 77.5946,
          boundRadiusM: 100,
          credentialStatus: "suspended",
        },
      });

      expect(output.status).toBe("fail");
      expect(output.reason).toContain("suspended");
    });

    it("returns fail when Gemini returns fail status for tampered or invalid UPI payload", async () => {
      setGeminiMockHandler(async () =>
        JSON.stringify({
          status: "fail",
          reason: "Malformed UPI payload structure or parameter tampering",
          isValidUpiFormat: false,
        })
      );

      const output = await runIdentityAgent({
        qrPayload: "upi://pay?pa=store@sbi&tampered=1",
        lookupResult: {
          id: "qr-1",
          credentialId: "cred-1",
          qrPayloadHash: "hash123",
          boundLat: 12.9716,
          boundLng: 77.5946,
          boundRadiusM: 100,
          credentialStatus: "active",
        },
      });

      expect(output.status).toBe("fail");
      expect(output.reason).toContain("Malformed UPI payload structure");
    });

    it("gracefully falls back to deterministic verification when Gemini times out or throws", async () => {
      setGeminiMockHandler(async () => {
        throw new Error("Gemini API call timed out after 5000ms");
      });

      const output = await runIdentityAgent({
        qrPayload: "upi://pay?pa=store@sbi&pn=Store",
        lookupResult: {
          id: "qr-1",
          credentialId: "cred-1",
          qrPayloadHash: "hash123",
          boundLat: 12.9716,
          boundLng: 77.5946,
          boundRadiusM: 100,
          credentialStatus: "active",
        },
      });

      // Degraded fallback behavior: falls back to deterministic pass without crashing
      expect(output.status).toBe("pass");
      expect(output.isRegistered).toBe(true);
      expect(output.reason).toContain("deterministic verification");
    });
  });

  describe("Agent 2: Misbinding Agent", () => {
    it("returns pass when upstream agent outputs are internally consistent", async () => {
      const output = await runMisbindingAgent({
        identity: { status: "pass", reason: "Verified registered payload" },
        context: { status: "pass", reason: "Within GPS radius" },
      });

      expect(output.status).toBe("pass");
      expect(output.isMisbound).toBe(false);
      expect(output.reason).toContain("internally consistent");
    });

    it("returns pass (no misbinding) when QR is completely unregistered in registry", async () => {
      const output = await runMisbindingAgent({
        identity: { status: "fail", reason: "unknown QR code" },
      });

      expect(output.status).toBe("pass");
      expect(output.isMisbound).toBe(false);
      expect(output.reason).toContain("completely unknown");
    });

    it("returns fail when credential binding fails (e.g. suspended or disputed)", async () => {
      const output = await runMisbindingAgent({
        identity: { status: "fail", reason: "Credential suspended" },
      });

      expect(output.status).toBe("fail");
      expect(output.isMisbound).toBe(true);
      expect(output.reason).toContain("Credential binding failure");
    });

    it("returns fail when context location mismatch occurs (relocated sticker attack)", async () => {
      const output = await runMisbindingAgent({
        identity: { status: "pass", reason: "Registered genuine QR" },
        context: { status: "fail", reason: "GPS outside bound radius" },
      });

      expect(output.status).toBe("fail");
      expect(output.isMisbound).toBe(true);
      expect(output.reason).toContain("Geographic misbinding detected");
    });
  });

  describe("Agent 3: Vision Agent", () => {
    it("returns pass with skipped metadata when no photo is provided", async () => {
      const output = await runVisionAgent({});
      expect(output.status).toBe("pass");
      expect(output.metadata?.skipped).toBe(true);
    });

    it("returns pass when live photo embedding closely matches reference embedding", async () => {
      const dummyPhoto =
        "data:image/jpeg;base64," +
        Buffer.from("test photo bytes 1234567890").toString("base64");
      const { buffer, mimeType } = visionService.validateAndParsePhoto(dummyPhoto);
      const refEmbedding = await visionService.extractEmbedding(buffer, mimeType);

      const output = await runVisionAgent({
        photoBase64: dummyPhoto,
        referenceEmbedding: refEmbedding,
      });

      expect(output.status).toBe("pass");
      expect(output.score).toBeGreaterThanOrEqual(0.7);
    });

    it("returns warn (soft signal, never standalone fail) when visual similarity is low", async () => {
      const dummyPhoto =
        "data:image/jpeg;base64," +
        Buffer.from("test photo bytes 1234567890").toString("base64");
      const oppositeEmbedding = new Array(768).fill(-0.05);

      const output = await runVisionAgent({
        photoBase64: dummyPhoto,
        referenceEmbedding: oppositeEmbedding,
      });

      // Soft signal only per ARCHITECTURE.md Section 4
      expect(output.status).toBe("warn");
      expect(output.score).toBeLessThan(0.7);
      expect(output.reason).toContain("Visual variance detected");
    });

    it("gracefully catches corrupt photo and returns warn without crashing", async () => {
      const output = await runVisionAgent({
        photoBase64: "data:image/unsupported;base64,not-an-image",
        referenceEmbedding: [0.1, 0.2],
      });

      expect(output.status).toBe("warn");
      expect(output.metadata?.error).toBe(true);
      expect(output.reason).toContain("Could not process audit photo");
    });
  });

  describe("Agent 4: Context Agent", () => {
    it("correctly calculates Haversine distance", () => {
      const distance = calculateHaversineDistanceMeters(
        12.9716,
        77.5946,
        12.9725,
        77.5946
      );
      expect(distance).toBeGreaterThan(50);
      expect(distance).toBeLessThan(200);
    });

    it("returns pass when live GPS is within bound radius", async () => {
      const output = await runContextAgent({
        liveLatitude: 12.9716,
        liveLongitude: 77.5946,
        boundLat: 12.9716,
        boundLng: 77.5946,
        boundRadiusM: 100,
      });

      expect(output.status).toBe("pass");
      expect(output.metadata?.isWithinRadius).toBe(true);
      expect(output.metadata?.distanceMeters).toBe(0);
    });

    it("returns fail when live GPS is outside bound radius (relocation detection)", async () => {
      const output = await runContextAgent({
        liveLatitude: 13.0827,
        liveLongitude: 80.2707,
        boundLat: 12.9716,
        boundLng: 77.5946,
        boundRadiusM: 100,
      });

      expect(output.status).toBe("fail");
      expect(output.metadata?.isWithinRadius).toBe(false);
      expect(output.reason).toContain("QR relocation detected");
    });

    it("returns fail when live GPS is omitted for a QR with bound location", async () => {
      const output = await runContextAgent({
        boundLat: 12.9716,
        boundLng: 77.5946,
      });

      expect(output.status).toBe("fail");
      expect(output.metadata?.requiresLocation).toBe(true);
      expect(output.reason).toContain("Location required");
    });

    it("returns warn when live GPS is omitted for an unbound QR", async () => {
      const output = await runContextAgent({});

      expect(output.status).toBe("warn");
      expect(output.metadata?.missingLocation).toBe(true);
    });
  });

  describe("Agent 5: Attestation Agent", () => {
    it("returns clean baseline for fresh credential with no signals", async () => {
      const mockDb = {
        schema: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      const output = await runAttestationAgent({
        credentialId: "cred-new",
        db: mockDb,
      });

      expect(output.status).toBe("pass");
      expect(output.diversityScore).toBe(0.0);
      expect(output.signalCount).toBe(0);
    });

    it("computes diversity score across independent distinct sources", async () => {
      const mockDb = {
        schema: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            { source_identifier_hash: "hash_user_1", diversity_weight: 1.0 },
            { source_identifier_hash: "hash_user_2", diversity_weight: 1.0 },
            { source_identifier_hash: "hash_user_3", diversity_weight: 1.0 },
            { source_identifier_hash: "hash_user_4", diversity_weight: 1.0 },
          ],
          error: null,
        }),
      };

      const output = await runAttestationAgent({
        credentialId: "cred-established",
        db: mockDb,
      });

      expect(output.status).toBe("pass");
      expect(output.diversityScore).toBe(1.0);
      expect(output.signalCount).toBe(4);
    });

    it("downweights tight clusters with repeated signals from same source", async () => {
      const mockDb = {
        schema: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            { source_identifier_hash: "same_source", diversity_weight: 1.0 },
            { source_identifier_hash: "same_source", diversity_weight: 1.0 },
            { source_identifier_hash: "same_source", diversity_weight: 1.0 },
            { source_identifier_hash: "other_source", diversity_weight: 1.0 },
          ],
          error: null,
        }),
      };

      const output = await runAttestationAgent({
        credentialId: "cred-clustered",
        db: mockDb,
      });

      expect(output.status).toBe("pass");
      expect(output.diversityScore).toBe(0.5); // 2 distinct / 4 total
      expect(output.signalCount).toBe(4);
    });

    it("handles DB query failure by returning baseline pass without crashing pipeline", async () => {
      const mockDb = {
        schema: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database connection timed out" },
        }),
      };

      const output = await runAttestationAgent({
        credentialId: "cred-err",
        db: mockDb,
      });

      expect(output.status).toBe("pass");
      expect(output.diversityScore).toBe(0.0);
    });
  });

  describe("Trust Agent (Verdict Synthesis)", () => {
    it("returns WARNING when hasUnresolvedWarning is true (single warning override rule)", async () => {
      const output = await runTrustAgent({
        agentOutputs: {
          identity: { status: "pass", reason: "OK", isRegistered: true },
          context: { status: "pass", reason: "OK" },
        },
        hasUnresolvedWarning: true,
      });

      expect(output.verdict).toBe("WARNING");
      expect(output.reasonCode).toBe("MISBINDING");
      expect(output.status).toBe("fail");
    });

    it("returns WARNING with CREDENTIAL_SUSPENDED when credential is suspended or revoked", async () => {
      const output = await runTrustAgent({
        agentOutputs: {
          identity: {
            status: "fail",
            reason:
              "Credential has been suspended or revoked. Payments to this QR are disabled.",
            isRegistered: true,
          },
          context: { status: "pass", reason: "OK" },
        },
      });

      expect(output.verdict).toBe("WARNING");
      expect(output.reasonCode).toBe("CREDENTIAL_SUSPENDED");
    });

    it("returns WARNING with UNKNOWN_QR when identity is unregistered", async () => {
      const output = await runTrustAgent({
        agentOutputs: {
          identity: { status: "fail", reason: "unknown QR code", isRegistered: false },
          context: { status: "pass", reason: "OK" },
        },
      });

      expect(output.verdict).toBe("WARNING");
      expect(output.reasonCode).toBe("UNKNOWN_QR");
    });

    it("returns WARNING with LOCATION_MISMATCH when context agent fails", async () => {
      const output = await runTrustAgent({
        agentOutputs: {
          identity: { status: "pass", reason: "OK", isRegistered: true },
          context: { status: "fail", reason: "GPS outside registered radius" },
        },
      });

      expect(output.verdict).toBe("WARNING");
      expect(output.reasonCode).toBe("LOCATION_MISMATCH");
    });

    it("returns VERIFIED when all agents pass and credential trust tier is verified", async () => {
      const output = await runTrustAgent({
        agentOutputs: {
          identity: { status: "pass", reason: "OK", isRegistered: true },
          context: { status: "pass", reason: "OK" },
          vision: { status: "pass", reason: "OK" },
          misbinding: { status: "pass", reason: "OK", isMisbound: false },
        },
        credentialTrustTier: "verified",
      });

      expect(output.verdict).toBe("VERIFIED");
      expect(output.reasonCode).toBe("OK");
    });

    it("returns RECENTLY_REGISTERED when all agents pass but credential trust tier is unverified", async () => {
      const output = await runTrustAgent({
        agentOutputs: {
          identity: { status: "pass", reason: "OK", isRegistered: true },
          context: { status: "pass", reason: "OK" },
          vision: { status: "pass", reason: "OK" },
          misbinding: { status: "pass", reason: "OK", isMisbound: false },
        },
        credentialTrustTier: "unverified",
      });

      expect(output.verdict).toBe("RECENTLY_REGISTERED");
      expect(output.reasonCode).toBe("OK");
    });
  });

  describe("Gemini Client Data Boundary Guard Enforcement", () => {
    it("blocks request if sensitive identity data attempts to reach Gemini", async () => {
      const client = new GeminiClient("mock-key");

      await expect(
        client.generateStructuredJson({
          systemPrompt: "Analyze this verification input",
          userPrompt: "Merchant GST is 29ABCDE1234F1Z5 and bank is store@okaxis",
        })
      ).rejects.toThrow(/AI Data Boundary Violation/);
    });
  });
});
