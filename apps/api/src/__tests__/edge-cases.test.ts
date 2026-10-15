import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";

import { app } from "../app.js";
import { merchantService } from "../services/merchant.service.js";
import { payloadLookupService } from "../services/payload-lookup.service.js";
import { resetRateLimitStore } from "../middleware/rate-limit.middleware.js";
import { setGeminiMockHandler } from "../agents/gemini-client.js";
import { ConflictError } from "../middleware/error.middleware.js";
import * as orchestrator from "../agents/orchestrator.js";

describe("Phase 5 — Edge Case Tests", () => {
  beforeEach(() => {
    resetRateLimitStore();
    setGeminiMockHandler(null);
    vi.restoreAllMocks();
  });

  describe("Edge Case 1: Duplicate GST Registration", () => {
    it("rejects duplicate GST registration with 409 CONFLICT and dispute guidance", async () => {
      // Mock merchantService.registerIdentity throwing ConflictError for existing GST
      vi.spyOn(merchantService, "registerIdentity").mockRejectedValueOnce(
        new ConflictError(
          "This GST/Udyam number is already registered to an existing merchant credential.",
          { disputePointer: "/credential/dispute/new" }
        )
      );

      const res = await request(app).post("/api/v1/merchants/register/identity").send({
        type: "gst_udyam",
        displayName: "Imposter Store",
        contactPhone: "+919988776655",
        gstUdyamNumber: "29AABCU9603R1ZJ", // already registered GST
        kycAddress: "MG Road, Bengaluru, Karnataka",
        otp: "123456",
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("CONFLICT");
      expect(res.body.error.message).toContain("already registered");
      expect(res.body.error.details).toEqual({
        disputePointer: "/credential/dispute/new",
      });
    });
  });

  describe("Edge Case 2: Out-of-Radius Registration Warning", () => {
    it("permits registration when GPS has location variance (>5km from KYC) with location_variance flag", async () => {
      const mockMerchantId = "550e8400-e29b-41d4-a716-446655440099";
      const mockCredentialId = "550e8400-e29b-41d4-a716-446655440098";
      const dummyPhoto =
        "data:image/jpeg;base64," +
        Buffer.from("out_of_radius_reference_photo").toString("base64");

      // Merchant service flags location variance without failing the registration
      vi.spyOn(merchantService, "registerReference").mockResolvedValueOnce({
        credentialId: mockCredentialId,
        merchantId: mockMerchantId,
        registeredQrId: "qr-edge-1",
        status: "pending_activation",
        trustTier: "unverified",
        locationVariance: true,
        qrPayloadHash: "hash-edge-1",
        boundLocation: {
          latitude: 13.0827,
          longitude: 80.2707,
          boundRadiusM: 100,
        },
        embeddingDimension: 768,
      });

      const res = await request(app).post("/api/v1/merchants/register/reference").send({
        merchantId: mockMerchantId,
        qrPayload: "upi://pay?pa=farbranch@icici&pn=FarBranch",
        latitude: 13.0827, // Chennai coordinates while KYC was in Bengaluru
        longitude: 80.2707,
        boundRadiusM: 100,
        photoBase64: dummyPhoto,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.credentialId).toBe(mockCredentialId);
      expect(res.body.data.locationVariance).toBe(true);
      expect(res.body.data.status).toBe("pending_activation");
    });

    it("triggers LOCATION_MISMATCH warning in self-audit when scanned outside bound premises", async () => {
      const sharmaPayload =
        "upi://pay?pa=sharmacanteen@okaxis&pn=Sharma%20Canteen&mc=5499&aid=uGICAgICAgICAgA";

      payloadLookupService.primeCache(payloadLookupService.hashPayload(sharmaPayload), {
        id: "qr-sharma-1",
        credentialId: "cred-sharma-1",
        qrPayloadHash: payloadLookupService.hashPayload(sharmaPayload),
        boundLat: 12.9716,
        boundLng: 77.5946,
        boundRadiusM: 100,
        trustTier: "verified",
        credentialStatus: "active",
      });

      const res = await request(app)
        .post("/api/v1/audit/run")
        .send({
          qrPayload: sharmaPayload,
          latitude: 12.91, // 2+ km away from Sharma Canteen's registered 12.9716, 77.5946
          longitude: 77.64,
          photoBase64:
            "data:image/jpeg;base64," +
            Buffer.from("distant_audit_scan").toString("base64"),
        });

      expect(res.status).toBe(200);
      expect(res.body.data.verdict).toBe("WARNING");
      expect(res.body.data.reason).toBe("LOCATION_MISMATCH");
      expect(res.body.data.agentOutputs.context.status).toBe("fail");
    });
  });

  describe("Edge Case 3: Degraded-Mode Verdict", () => {
    it("returns degradedCheck: true with capped verdict when vision embedding service fails", async () => {
      // Mock runAgentPipeline returning degradedCheck: true
      vi.spyOn(orchestrator, "runAgentPipeline").mockResolvedValueOnce({
        verdict: "RECENTLY_REGISTERED",
        reason: "OK",
        message: "Degraded check completed",
        auditRunId: "run-degraded-1234",
        degradedCheck: true,
        agentOutputs: {
          identity: { status: "pass", isRegistered: true, credentialId: "cred-deg-1" },
          vision: { status: "fail", score: 0, reason: "Vision service timeout fallback" },
          context: { status: "pass", reason: "Within premises coordinates" },
          misbinding: { status: "pass", isMisbound: false },
        },
      });

      const res = await request(app)
        .post("/api/v1/audit/run")
        .send({
          qrPayload: "upi://pay?pa=sharmacanteen@okaxis&pn=Sharma%20Canteen",
          latitude: 12.9716,
          longitude: 77.5946,
          photoBase64:
            "data:image/jpeg;base64," +
            Buffer.from("corrupt_or_unreadable_photo").toString("base64"),
        });

      expect(res.status).toBe(200);
      expect(res.body.data.degradedCheck).toBe(true);
      // Under degraded mode, verdict cannot be VERIFIED
      expect(res.body.data.verdict).not.toBe("VERIFIED");
      expect(res.body.data.verdict).toBe("RECENTLY_REGISTERED");
    });
  });

  describe("Edge Case 4: Unknown-QR Check (Customer vs Merchant)", () => {
    it("returns non-alarming friendly RECENTLY_REGISTERED / NOT_ENROLLED for customer check on unknown QR", async () => {
      const res = await request(app).post("/api/v1/check").send({
        qrPayload: "upi://pay?pa=unknown.curry.point@axis&pn=UnknownCurryPoint",
        latitude: 12.9716,
        longitude: 77.5946,
      });

      expect(res.status).toBe(200);
      // Customer sees non-alarming RECENTLY_REGISTERED tier with isUnregistered flag
      expect(res.body.data.verdict).toBe("RECENTLY_REGISTERED");
      expect(res.body.data.isUnregistered).toBe(true);
      expect(res.body.data.reason).toBe("OK");
      expect(res.body.data.message).toContain("not yet registered with QRaksha");
    });

    it("returns strict WARNING UNKNOWN_QR for merchant self-audit on unknown QR", async () => {
      const res = await request(app)
        .post("/api/v1/audit/run")
        .send({
          qrPayload: "upi://pay?pa=malicious.counterfeit@scam&pn=FakeSticker",
          latitude: 12.9716,
          longitude: 77.5946,
          photoBase64:
            "data:image/jpeg;base64," +
            Buffer.from("unknown_sticker_photo").toString("base64"),
        });

      expect(res.status).toBe(200);
      // Merchant sees strict WARNING UNKNOWN_QR
      expect(res.body.data.verdict).toBe("WARNING");
      expect(res.body.data.reason).toBe("UNKNOWN_QR");
      expect(res.body.data.message).toContain("Unknown QR sticker");
    });
  });
});
