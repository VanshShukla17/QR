import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

import { app } from "../app.js";
import { resetRateLimitStore } from "../middleware/rate-limit.middleware.js";
import { disputeService } from "../services/dispute.service.js";
import { merchantService } from "../services/merchant.service.js";

// Mock orchestrator for fast responses
vi.mock("../agents/orchestrator.js", () => ({
  runAgentPipeline: vi.fn().mockResolvedValue({
    verdict: "VERIFIED",
    reason: "OK",
    confidence: 0.95,
    agentOutputs: {},
    degradedCheck: false,
    timestamp: new Date().toISOString(),
  }),
}));

describe("Phase 4 — Rate Limiting Middleware (ARCHITECTURE.md Section 6 & 8)", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  describe("Scan Rate Limiting (/api/v1/audit/run & /api/v1/check)", () => {
    it("allows first scan and blocks immediate second scan with 429 RATE_LIMITED on /api/v1/audit/run", async () => {
      const payload = {
        qrPayload: "upi://pay?pa=merchant@upi&pn=TestMerchant",
        latitude: 19.076,
        longitude: 72.8777,
        photoBase64: "data:image/jpeg;base64,dGVzdA==",
      };

      const clientId = "client-audit-user-1";

      // First request: should succeed
      const res1 = await request(app)
        .post("/api/v1/audit/run")
        .set("x-test-client-id", clientId)
        .send(payload);

      expect(res1.status).toBe(200);

      // Immediate second request: should be rate-limited (limit: 1 per 5s)
      const res2 = await request(app)
        .post("/api/v1/audit/run")
        .set("x-test-client-id", clientId)
        .send(payload);

      expect(res2.status).toBe(429);
      expect(res2.headers["retry-after"]).toBeDefined();
      expect(res2.body.error).toBeDefined();
      expect(res2.body.error.code).toBe("RATE_LIMITED");
      expect(res2.body.error.retryAfterSeconds).toBeGreaterThanOrEqual(1);
      expect(res2.body.error.retryAfterSeconds).toBeLessThanOrEqual(5);

      // Distinct client should NOT be blocked
      const resOtherClient = await request(app)
        .post("/api/v1/audit/run")
        .set("x-test-client-id", "different-client-id")
        .send(payload);

      expect(resOtherClient.status).toBe(200);
    });

    it("allows first customer check and blocks immediate second check on /api/v1/check", async () => {
      const payload = {
        qrPayload: "upi://pay?pa=merchant@upi&pn=TestMerchant",
      };

      const clientId = "client-check-user-2";

      // First check: should succeed
      const res1 = await request(app)
        .post("/api/v1/check")
        .set("x-test-client-id", clientId)
        .send(payload);

      expect(res1.status).toBe(200);

      // Immediate second check: should be rate-limited
      const res2 = await request(app)
        .post("/api/v1/check")
        .set("x-test-client-id", clientId)
        .send(payload);

      expect(res2.status).toBe(429);
      expect(res2.body.error.code).toBe("RATE_LIMITED");
      expect(res2.body.error.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Dispute Rate Limiting (/api/v1/disputes)", () => {
    it("enforces max 3 disputes per day per merchant against the same credential", async () => {
      vi.spyOn(disputeService, "fileDispute").mockResolvedValue({
        dispute: {
          id: "disp-mock-1",
          credentialId: "550e8400-e29b-41d4-a716-446655440000",
          filedByMerchantId: "merchant-caller-1",
          status: "open",
          evidenceSummary: "Duplicate sticker detected",
          createdAt: new Date().toISOString(),
        },
        targetCredentialId: "550e8400-e29b-41d4-a716-446655440000",
        previousTrustTier: "unverified",
        newTrustTier: "warning",
        message: "Dispute filed successfully",
      });

      const body = {
        credentialId: "550e8400-e29b-41d4-a716-446655440000",
        evidenceSummary: "Fraudulent QR sticker placed over genuine merchant stand.",
      };

      const merchantToken = "Bearer mock-merchant-token";

      // 1st dispute
      const res1 = await request(app)
        .post("/api/v1/disputes")
        .set("Authorization", merchantToken)
        .send(body);
      expect(res1.status).toBe(201);

      // 2nd dispute
      const res2 = await request(app)
        .post("/api/v1/disputes")
        .set("Authorization", merchantToken)
        .send(body);
      expect(res2.status).toBe(201);

      // 3rd dispute
      const res3 = await request(app)
        .post("/api/v1/disputes")
        .set("Authorization", merchantToken)
        .send(body);
      expect(res3.status).toBe(201);

      // 4th dispute: exceeds limit of 3 per day
      const res4 = await request(app)
        .post("/api/v1/disputes")
        .set("Authorization", merchantToken)
        .send(body);

      expect(res4.status).toBe(429);
      expect(res4.headers["retry-after"]).toBeDefined();
      expect(res4.body.error.code).toBe("RATE_LIMITED");
      expect(res4.body.error.message).toContain("3 disputes per day");

      // Filing against a DIFFERENT credential should still be allowed
      const resOtherCred = await request(app)
        .post("/api/v1/disputes")
        .set("Authorization", merchantToken)
        .send({
          credentialId: "660e8400-e29b-41d4-a716-446655440001",
          evidenceSummary: "Different merchant credential issue.",
        });
      expect(resOtherCred.status).toBe(201);
    });
  });

  describe("OTP Rate Limiting (/api/v1/merchants/register/identity)", () => {
    it("enforces max 5 OTP attempts per phone number per 15 minutes", async () => {
      const phone = "+919876543299";

      vi.spyOn(merchantService, "registerIdentity").mockResolvedValue({
        merchantId: "m-123",
        identityId: "i-123",
        identityTier: "gst_verified",
        displayName: "Kirana Store",
        contactPhone: phone,
        kycAddress: "Shop 10, Main Market, Mumbai",
        otpConfirmed: true,
      });
      const body = {
        type: "gst_udyam" as const,
        displayName: "Kirana Store",
        contactPhone: phone,
        gstUdyamNumber: "27AAPFU0939F1ZV",
        otp: "123456",
        kycAddress: "Shop 10, Main Market, Mumbai",
      };

      // 5 requests allowed
      for (let i = 1; i <= 5; i++) {
        const res = await request(app)
          .post("/api/v1/merchants/register/identity")
          .send(body);
        expect(res.status).toBe(201);
      }

      // 6th request: exceeds limit of 5 per 15 minutes
      const res6 = await request(app)
        .post("/api/v1/merchants/register/identity")
        .send(body);

      expect(res6.status).toBe(429);
      expect(res6.headers["retry-after"]).toBeDefined();
      expect(res6.body.error.code).toBe("RATE_LIMITED");
      expect(res6.body.error.message).toContain("Too many OTP attempts");

      // Different phone number is NOT blocked
      const resOtherPhone = await request(app)
        .post("/api/v1/merchants/register/identity")
        .send({
          ...body,
          contactPhone: "+919876543288",
        });

      expect(resOtherPhone.status).toBe(201);
    });
  });

  describe("Bypass mechanism for tests and admin processes", () => {
    it("bypasses rate limit when x-bypass-rate-limit header is present", async () => {
      const payload = {
        qrPayload: "upi://pay?pa=merchant@upi&pn=TestMerchant",
      };

      const clientId = "bypass-client";

      const res1 = await request(app)
        .post("/api/v1/check")
        .set("x-test-client-id", clientId)
        .send(payload);
      expect(res1.status).toBe(200);

      // Sending immediate second request with bypass header should succeed with 200
      const res2 = await request(app)
        .post("/api/v1/check")
        .set("x-test-client-id", clientId)
        .set("x-bypass-rate-limit", "true")
        .send(payload);

      expect(res2.status).toBe(200);
    });
  });
});
