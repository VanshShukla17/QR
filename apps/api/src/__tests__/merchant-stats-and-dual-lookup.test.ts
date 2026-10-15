import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { normalizeQrPayload } from "@qraksha/shared";
import { PayloadLookupService } from "../services/payload-lookup.service.js";
import { runContextAgent } from "../agents/context.agent.js";
import { runTrustAgent } from "../agents/trust.agent.js";
import { MerchantService } from "../services/merchant.service.js";

describe("Merchant Stats, Dual Hash Lookup & Verification Ground Truth", () => {
  describe("Dual-Hash Lookup & 15-Second Negative Cache", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockDb: any;
    let service: PayloadLookupService;

    const rawPayload = "upi://pay?pn=Store&pa=merchant@upi&cu=INR";
    const rawHash = crypto.createHash("sha256").update(rawPayload).digest("hex");
    const normalizedPayload = normalizeQrPayload(rawPayload);
    const normalizedHash = crypto
      .createHash("sha256")
      .update(normalizedPayload)
      .digest("hex");

    const mockRawRecord = {
      id: "qr-raw-123",
      credential_id: "cred-abc",
      qr_payload_hash: rawHash,
      bound_lat: 12.9716,
      bound_lng: 77.5946,
      bound_radius_m: 100,
    };

    const mockCredRecord = {
      id: "cred-abc",
      merchant_id: "merch-123",
      status: "active",
      trust_tier: "verified",
      trust_score: 80,
    };

    beforeEach(() => {
      // Mock DB that only matches the raw hash (simulating existing database rows computed on RAW payload)
      mockDb = {
        schema: vi.fn().mockReturnThis(),
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "registered_qr") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (col === "qr_payload_hash" && val === rawHash) {
                  return {
                    maybeSingle: vi
                      .fn()
                      .mockResolvedValue({ data: mockRawRecord, error: null }),
                  };
                }
                return {
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                };
              }),
            };
          }
          if (table === "merchant_credential") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: mockCredRecord, error: null }),
              }),
            };
          }
          if (table === "reference_embedding") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      };

      // 5 min positive, 15 sec negative cache
      service = new PayloadLookupService(mockDb, 300000, 15000);
    });

    it("verifies normalized hash differs from raw un-ordered hash", () => {
      expect(normalizedHash).not.toBe(rawHash);
    });

    it("falls back to raw payload hash when normalized hash is not found in database", async () => {
      const result = await service.lookupByPayload(rawPayload);

      expect(result).not.toBeNull();
      expect(result?.id).toBe("qr-raw-123");
      expect(result?.credentialId).toBe("cred-abc");
      expect(result?.boundLat).toBe(12.9716);
    });

    it("does NOT cache lookup when database query fails with an error", async () => {
      const errorDb = {
        schema: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: null, error: new Error("DB Connection Error") }),
          }),
        }),
      };

      const errService = new PayloadLookupService(errorDb, 300000, 15000);

      // First call fails due to DB error
      const firstResult = await errService.lookupByPayload("upi://pay?pa=any@upi");
      expect(firstResult).toBeNull();
      // Cache must NOT store the error
      expect(errService.getCacheSize()).toBe(0);
    });

    it("caches genuine 'not found' as null with 15s negative TTL", async () => {
      const unknownPayload = "upi://pay?pa=unknown@fraud";
      const result = await service.lookupByPayload(unknownPayload);

      expect(result).toBeNull();
      // Genuine not found is cached with negative TTL
      expect(service.getCacheSize()).toBeGreaterThan(0);
    });

    it("invalidates all entries for a suspended or revoked credential", async () => {
      await service.lookupByPayload(rawPayload);
      expect(service.getCacheSize()).toBeGreaterThan(0);

      service.invalidateCredential("cred-abc");
      expect(service.getCacheSize()).toBe(0);
    });
  });

  describe("Customer Scan Location Verification Ground Truth", () => {
    it("fails context agent when scan coordinates are missing for a QR with bound location", async () => {
      const output = await runContextAgent({
        boundLat: 12.9716,
        boundLng: 77.5946,
        boundRadiusM: 100,
        // liveLatitude and liveLongitude are omitted
      });

      expect(output.status).toBe("fail");
      expect(output.reason).toContain("Location required");
      expect(output.metadata?.requiresLocation).toBe(true);
    });

    it("fails context agent and flags LOCATION_MISMATCH when scan coordinates are distant (relocation attack)", async () => {
      const contextOutput = await runContextAgent({
        liveLatitude: 13.0827, // Chennai (~300km from Bangalore)
        liveLongitude: 80.2707,
        boundLat: 12.9716,
        boundLng: 77.5946,
        boundRadiusM: 100,
      });

      expect(contextOutput.status).toBe("fail");
      expect(contextOutput.reason).toContain("QR relocation detected");

      const trustOutput = await runTrustAgent({
        agentOutputs: {
          identity: { status: "pass", isRegistered: true, reason: "Payload match" },
          context: contextOutput,
        },
      });

      expect(trustOutput.verdict).toBe("WARNING");
      expect(trustOutput.reasonCode).toBe("LOCATION_MISMATCH");
    });
  });

  describe("Suspended Credential Returns Distinct WARNING with CREDENTIAL_SUSPENDED", () => {
    it("returns WARNING with CREDENTIAL_SUSPENDED when credential is suspended", async () => {
      const trustOutput = await runTrustAgent({
        agentOutputs: {
          identity: {
            status: "fail",
            isRegistered: true,
            reason:
              "Credential has been suspended or revoked. Payments to this QR are disabled.",
          },
          context: { status: "pass", reason: "Location verified" },
        },
      });

      expect(trustOutput.verdict).toBe("WARNING");
      expect(trustOutput.reasonCode).toBe("CREDENTIAL_SUSPENDED");
      expect(trustOutput.status).toBe("fail");
    });
  });

  describe("MerchantService.getMerchantStats Single Source of Truth", () => {
    it("returns merchant stats from RPC function", async () => {
      const mockDb = {
        rpc: vi.fn().mockResolvedValue({
          data: {
            merchant_id: "550e8400-e29b-41d4-a716-446655440000",
            active_qrs: 6,
            clean_audits: 21,
            total_audits: 32,
            flagged_audits: 11,
          },
          error: null,
        }),
      };

      const merchantService = new MerchantService(mockDb);
      const stats = await merchantService.getMerchantStats(
        "550e8400-e29b-41d4-a716-446655440000"
      );

      expect(stats.activeQrs).toBe(6);
      expect(stats.cleanAudits).toBe(21);
      expect(stats.totalAudits).toBe(32);
      expect(stats.flaggedAudits).toBe(11);
      expect(mockDb.rpc).toHaveBeenCalledWith("get_merchant_stats", {
        p_merchant_id: "550e8400-e29b-41d4-a716-446655440000",
      });
    });
  });
});
