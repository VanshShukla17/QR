import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";

import { app } from "../app.js";
import { merchantService } from "../services/merchant.service.js";
import { disputeService } from "../services/dispute.service.js";
import { adminService } from "../services/admin.service.js";
import { payloadLookupService } from "../services/payload-lookup.service.js";
import { resetRateLimitStore } from "../middleware/rate-limit.middleware.js";
import { setGeminiMockHandler } from "../agents/gemini-client.js";

describe("Phase 5 — End-to-End Integration Flows", () => {
  beforeEach(() => {
    resetRateLimitStore();
    setGeminiMockHandler(null);
  });

  describe("Flow 1: Full Merchant Registration Flow (Steps 1 to 3)", () => {
    it("completes full registration from identity, reference capture, through proof-of-possession", async () => {
      const mockMerchantId = "550e8400-e29b-41d4-a716-446655440010";
      const mockIdentityId = "550e8400-e29b-41d4-a716-446655440011";
      const mockCredentialId = "550e8400-e29b-41d4-a716-446655440020";
      const dummyPhoto =
        "data:image/jpeg;base64," +
        Buffer.from("simulated_qr_reference_photo").toString("base64");

      vi.spyOn(merchantService, "registerIdentity").mockResolvedValueOnce({
        merchantId: mockMerchantId,
        displayName: "Suresh Provision Store",
        identityTier: "gst_verified",
        contactPhone: "+919876543210",
        kycAddress: "Shop 12, Market Road, Bengaluru, Karnataka",
        identityId: mockIdentityId,
        otpConfirmed: true,
      });

      vi.spyOn(merchantService, "registerReference").mockResolvedValueOnce({
        credentialId: mockCredentialId,
        merchantId: mockMerchantId,
        registeredQrId: "qr-flow-1",
        status: "pending_activation",
        trustTier: "unverified",
        locationVariance: false,
        qrPayloadHash: "hash-flow-1",
        boundLocation: {
          latitude: 12.9716,
          longitude: 77.5946,
          boundRadiusM: 100,
        },
        embeddingDimension: 768,
      });

      vi.spyOn(merchantService, "confirmProofOfPossession").mockResolvedValueOnce({
        credentialId: mockCredentialId,
        status: "recently_registered",
        verifiedAt: new Date().toISOString(),
        amountInr: 1,
        simulationPassed: true,
        message: "Proof of possession confirmed via ₹1 test transaction.",
      });

      // Step 1: Register Identity
      const step1Res = await request(app)
        .post("/api/v1/merchants/register/identity")
        .send({
          type: "gst_udyam",
          displayName: "Suresh Provision Store",
          contactPhone: "+919876543210",
          gstUdyamNumber: "29AABCU9603R1ZM",
          kycAddress: "Shop 12, Market Road, Bengaluru, Karnataka",
          otp: "123456",
        });

      expect(step1Res.status).toBe(201);
      expect(step1Res.body.data.merchantId).toBe(mockMerchantId);
      expect(step1Res.body.data.identityTier).toBe("gst_verified");
      expect(step1Res.body.data.otpConfirmed).toBe(true);

      // Step 2: Register Reference (Photo + GPS)
      const step2Res = await request(app)
        .post("/api/v1/merchants/register/reference")
        .send({
          merchantId: mockMerchantId,
          qrPayload: "upi://pay?pa=sureshstore@sbi&pn=SureshStore",
          latitude: 12.9716,
          longitude: 77.5946,
          boundRadiusM: 100,
          photoBase64: dummyPhoto,
        });

      expect(step2Res.status).toBe(201);
      expect(step2Res.body.data.credentialId).toBe(mockCredentialId);
      expect(step2Res.body.data.status).toBe("pending_activation");
      expect(step2Res.body.data.embeddingDimension).toBe(768);

      // Step 3: Proof of Possession (Rs 1 micro-transaction)
      const step3Res = await request(app)
        .post("/api/v1/merchants/register/proof-of-possession")
        .send({
          credentialId: mockCredentialId,
          simulationPassed: true,
        });

      expect(step3Res.status).toBe(200);
      expect(step3Res.body.data.status).toBe("recently_registered");
      expect(step3Res.body.data.simulationPassed).toBe(true);
      expect(step3Res.body.data.amountInr).toBe(1);
      expect(step3Res.body.data.message).toBeDefined();
    });
  });

  describe("Flow 2: Full Self-Audit Flow", () => {
    it("executes multi-agent audit run, generates verdict, and records in audit history", async () => {
      const genuinePayload = "upi://pay?pa=sureshstore@sbi&pn=SureshStore";
      const dummyPhoto =
        "data:image/jpeg;base64," +
        Buffer.from("simulated_audit_photo").toString("base64");

      payloadLookupService.primeCache(payloadLookupService.hashPayload(genuinePayload), {
        id: "qr-suresh-1",
        credentialId: "cred-suresh-1",
        qrPayloadHash: payloadLookupService.hashPayload(genuinePayload),
        boundLat: 12.9716,
        boundLng: 77.5946,
        boundRadiusM: 100,
        trustTier: "unverified",
        credentialStatus: "active",
      });

      const auditRes = await request(app).post("/api/v1/audit/run").send({
        qrPayload: genuinePayload,
        latitude: 12.9716,
        longitude: 77.5946,
        photoBase64: dummyPhoto,
      });

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.data).toHaveProperty("verdict");
      expect(auditRes.body.data.verdict).toBe("RECENTLY_REGISTERED");
      expect(auditRes.body.data.reason).toBe("OK");
      expect(auditRes.body.data.agentOutputs).toBeDefined();
      expect(auditRes.body.data.agentOutputs.identity.status).toBe("pass");
      expect(auditRes.body.data.agentOutputs.context.status).toBe("pass");

      const historyRes = await request(app).get("/api/v1/audit/history?page=1&limit=10");
      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data).toHaveProperty("items");
      expect(historyRes.body.data).toHaveProperty("pagination");
    });
  });

  describe("Flow 3: Full Dispute Lifecycle Flow", () => {
    it("files dispute, downgrades target credential immediately to WARNING, and allows admin resolution", async () => {
      const targetCredId = "550e8400-e29b-41d4-a716-446655440099";
      const disputeId = "660e8400-e29b-41d4-a716-446655440001";

      vi.spyOn(disputeService, "fileDispute").mockResolvedValueOnce({
        dispute: {
          id: disputeId,
          credentialId: targetCredId,
          filedByMerchantId: "550e8400-e29b-41d4-a716-446655440010",
          status: "open",
          evidenceSummary: "Countertop sticker swapped with unauthorized Paytm QR",
          createdAt: new Date().toISOString(),
        },
        targetCredentialId: targetCredId,
        previousTrustTier: "verified",
        newTrustTier: "warning",
        message: "Dispute filed successfully.",
      });

      // 1. File dispute
      const disputeRes = await request(app)
        .post("/api/v1/disputes")
        .set("Authorization", "Bearer mock-merchant-token")
        .send({
          credentialId: targetCredId,
          evidenceSummary: "Countertop sticker swapped with unauthorized Paytm QR",
        });

      expect(disputeRes.status).toBe(201);
      expect(disputeRes.body.data.dispute.id).toBe(disputeId);
      expect(disputeRes.body.data.newTrustTier).toBe("warning"); // Immediate auto-downgrade

      // 2. Admin retrieves dispute queue
      vi.spyOn(adminService, "listDisputes").mockResolvedValueOnce({
        disputes: [
          {
            id: disputeId,
            credentialId: targetCredId,
            filedByMerchantId: "550e8400-e29b-41d4-a716-446655440010",
            status: "open",
            evidenceSummary: "Countertop sticker swapped with unauthorized Paytm QR",
            createdAt: new Date().toISOString(),
            targetMerchantName: "Fake Impersonator",
            targetMerchantPhone: "+919999999999",
            filerMerchantName: "Genuine Merchant",
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      });

      const adminListRes = await request(app)
        .get("/api/v1/admin/disputes")
        .set("Authorization", "Bearer mock-admin-token");

      expect(adminListRes.status).toBe(200);
      expect(adminListRes.body.data.disputes).toHaveLength(1);
      expect(adminListRes.body.data.disputes[0].id).toBe(disputeId);

      // 3. Admin resolves dispute as RESOLVED_UPHELD
      vi.spyOn(adminService, "resolveDispute").mockResolvedValueOnce({
        dispute: {
          id: disputeId,
          credentialId: targetCredId,
          filedByMerchantId: "550e8400-e29b-41d4-a716-446655440010",
          status: "resolved_upheld",
          evidenceSummary: "Countertop sticker swapped with unauthorized Paytm QR",
          resolvedByAdminId: "admin-system",
          resolutionReason: "Confirmed sticker swap on-site; suspended credential.",
          createdAt: new Date().toISOString(),
          resolvedAt: new Date().toISOString(),
        },
        targetCredentialId: targetCredId,
        newTrustTier: "warning",
        newStatus: "suspended",
        message: "Dispute upheld. Target credential has been suspended.",
      });

      const resolveRes = await request(app)
        .patch(`/api/v1/admin/disputes/${disputeId}`)
        .set("Authorization", "Bearer mock-admin-token")
        .send({
          status: "resolved_upheld",
          resolutionReason: "Confirmed sticker swap on-site; suspended credential.",
        });

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.data.dispute.status).toBe("resolved_upheld");
      expect(resolveRes.body.data.newStatus).toBe("suspended");
    });
  });
});
