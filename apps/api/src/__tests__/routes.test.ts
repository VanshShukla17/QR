import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";

import { app } from "../app.js";
import { payloadLookupService } from "../services/payload-lookup.service.js";
import { merchantService } from "../services/merchant.service.js";
import { resetRateLimitStore } from "../middleware/rate-limit.middleware.js";

describe("Phase 2 API Routes (Audit, Check, Credentials)", () => {
  const genuinePayload = "upi://pay?pa=store@sbi&pn=Store";
  const dummyPhoto =
    "data:image/jpeg;base64," + Buffer.from("test photo 1234567890").toString("base64");

  beforeEach(() => {
    resetRateLimitStore();
    payloadLookupService.primeCache(payloadLookupService.hashPayload(genuinePayload), {
      id: "qr-100",
      credentialId: "cred-100",
      qrPayloadHash: payloadLookupService.hashPayload(genuinePayload),
      boundLat: 12.9716,
      boundLng: 77.5946,
      boundRadiusM: 100,
      trustTier: "unverified",
      credentialStatus: "active",
    });
  });

  describe("POST /api/v1/audit/run", () => {
    it("returns 200 with verdict data for valid self-audit scan", async () => {
      const res = await request(app).post("/api/v1/audit/run").send({
        qrPayload: genuinePayload,
        latitude: 12.9716,
        longitude: 77.5946,
        photoBase64: dummyPhoto,
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("verdict");
      expect(res.body.data).toHaveProperty("reason");
      expect(res.body.data).toHaveProperty("agentOutputs");
      expect(res.body.data.verdict).toBe("RECENTLY_REGISTERED");
      expect(res.body.data.reason).toBe("OK");
    });

    it("returns 400 when required fields are missing", async () => {
      const res = await request(app).post("/api/v1/audit/run").send({
        qrPayload: genuinePayload,
        // Missing latitude, longitude, photoBase64
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/v1/audit/history", () => {
    it("returns 200 with paginated audit runs", async () => {
      const res = await request(app).get("/api/v1/audit/history?page=1&limit=5");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("items");
      expect(res.body.data).toHaveProperty("pagination");
      expect(res.body.data.pagination.page).toBe(1);
    });
  });

  describe("POST /api/v1/check (Customer Optional Check)", () => {
    it("returns 200 with normal verdict for recognized QR", async () => {
      const res = await request(app).post("/api/v1/check").send({
        qrPayload: genuinePayload,
        latitude: 12.9716,
        longitude: 77.5946,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.verdict).toBe("RECENTLY_REGISTERED");
      expect(res.body.data.reason).toBe("OK");
    });

    it("returns non-alarming 🟡 verdict with friendly message when QR is unregistered in QRaksha", async () => {
      const unrecognizedPayload = "upi://pay?pa=unregistered@upi&pn=LocalStall";

      const res = await request(app).post("/api/v1/check").send({
        qrPayload: unrecognizedPayload,
      });

      expect(res.status).toBe(200);
      // Crucial requirement: non-alarming 🟡 message, NOT a red flag alert!
      expect(res.body.data.verdict).toBe("RECENTLY_REGISTERED");
      expect(res.body.data.isUnregistered).toBe(true);
      expect(res.body.data.message).toContain("not yet registered with QRaksha");
    });
  });

  describe("POST /api/v1/credentials/:id/qrs (Task 12 Multi-QR)", () => {
    it("adds an additional QR sticker under an existing credential", async () => {
      const spy = vi.spyOn(merchantService, "addQrToCredential").mockResolvedValueOnce({
        id: "qr-new-2",
        credentialId: "cred-100",
        qrPayloadHash: "newhash123",
        boundLocation: {
          latitude: 12.9716,
          longitude: 77.5946,
          boundRadiusM: 100,
        },
        inheritedRamp: false,
        initialCleanAuditCount: 0,
      });

      const res = await request(app).post("/api/v1/credentials/cred-100/qrs").send({
        qrPayload: "upi://pay?pa=store.counter2@sbi&pn=StoreCounter2",
        latitude: 12.9716,
        longitude: 77.5946,
        boundRadiusM: 100,
        photoBase64: dummyPhoto,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe("qr-new-2");
      expect(res.body.data.credentialId).toBe("cred-100");
      expect(spy).toHaveBeenCalled();
    });
  });
});
