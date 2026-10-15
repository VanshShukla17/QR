import { describe, expect, it, vi } from "vitest";
import request from "supertest";

import { app } from "../app.js";
import { AdminService, adminService } from "../services/admin.service.js";
import { NotFoundError } from "../middleware/error.middleware.js";

describe("Admin Service and Endpoints (Phase 3)", () => {
  const validDisputeId = "660e8400-e29b-41d4-a716-446655440001";
  const validCredentialId = "550e8400-e29b-41d4-a716-446655440000";
  const validMerchantId = "440e8400-e29b-41d4-a716-446655440000";

  describe("AdminService.listDisputes", () => {
    it("returns formatted list of disputes with enriched target merchant details", async () => {
      const mockDb = {
        schema: vi.fn().mockReturnThis(),
        from: vi.fn((table: string) => {
          if (table === "dispute") {
            return {
              select: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              range: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: validDisputeId,
                    credential_id: validCredentialId,
                    filed_by_merchant_id: null,
                    status: "open",
                    evidence_summary: "Suspicious physical sticker pasted over QR stand",
                    resolved_by_admin_id: null,
                    resolution_reason: null,
                    created_at: new Date().toISOString(),
                    resolved_at: null,
                  },
                ],
                error: null,
                count: 1,
              }),
            };
          }
          if (table === "merchant_credential") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: validCredentialId,
                  merchant_id: validMerchantId,
                  trust_tier: "warning",
                  status: "active",
                },
              }),
            };
          }
          if (table === "merchant") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  display_name: "Sharma Canteen",
                  contact_phone: "+919876543210",
                },
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
      };

      const service = new AdminService(mockDb);
      const result = await service.listDisputes({ page: 1, limit: 10 });

      expect(result.disputes.length).toBe(1);
      expect(result.disputes[0].id).toBe(validDisputeId);
      expect(result.disputes[0].targetMerchantName).toBe("Sharma Canteen");
      expect(result.disputes[0].targetTrustTier).toBe("warning");
      expect(result.total).toBe(1);
    });
  });

  describe("AdminService.resolveDispute", () => {
    it("resolves dispute as upheld, suspending target credential with WARNING tier", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let updatedCredential: any = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let updatedDispute: any = null;

      const mockDb = {
        schema: vi.fn().mockReturnThis(),
        from: vi.fn((table: string) => {
          if (table === "dispute") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn((_field: string, val: string) => {
                if (val === validDisputeId) {
                  return {
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: validDisputeId,
                        credential_id: validCredentialId,
                        status: "open",
                        evidence_summary: "Impersonation reported",
                      },
                      error: null,
                    }),
                  };
                }
                return {
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                };
              }),
              update: vi.fn((fields: Record<string, unknown>) => {
                updatedDispute = fields;
                return {
                  eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: validDisputeId,
                        credential_id: validCredentialId,
                        ...fields,
                        created_at: new Date().toISOString(),
                      },
                      error: null,
                    }),
                  }),
                };
              }),
            };
          }
          if (table === "merchant_credential") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: validCredentialId,
                    trust_tier: "warning",
                    status: "active",
                    trust_score: 40,
                  },
                  error: null,
                }),
              }),
              update: vi.fn((fields: Record<string, unknown>) => {
                updatedCredential = fields;
                return {
                  eq: vi.fn().mockResolvedValue({ error: null }),
                };
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
      };

      const service = new AdminService(mockDb);
      const result = await service.resolveDispute(
        validDisputeId,
        {
          status: "resolved_upheld",
          resolutionReason:
            "Confirmed sticker tampering upon physical inspection by campus marshal.",
        },
        "admin-user-42"
      );

      expect(result.newStatus).toBe("suspended");
      expect(result.newTrustTier).toBe("warning");
      expect(updatedCredential?.status).toBe("suspended");
      expect(updatedCredential?.trust_tier).toBe("warning");
      expect(updatedDispute?.status).toBe("resolved_upheld");
      expect(updatedDispute?.resolution_reason).toContain("Confirmed sticker tampering");
      expect(updatedDispute?.resolved_by_admin_id).toBe("admin-user-42");
    });

    it("resolves dispute as rejected, restoring target credential to active status", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let updatedCredential: any = null;

      const mockDb = {
        schema: vi.fn().mockReturnThis(),
        from: vi.fn((table: string) => {
          if (table === "dispute") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: validDisputeId,
                    credential_id: validCredentialId,
                    status: "open",
                  },
                  error: null,
                }),
              }),
              update: vi.fn((fields: Record<string, unknown>) => ({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: validDisputeId,
                      credential_id: validCredentialId,
                      ...fields,
                    },
                    error: null,
                  }),
                }),
              })),
            };
          }
          if (table === "merchant_credential") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: validCredentialId,
                    trust_tier: "warning",
                    status: "active",
                    trust_score: 85, // Score >= 60 restores to verified
                  },
                  error: null,
                }),
              }),
              update: vi.fn((fields: Record<string, unknown>) => {
                updatedCredential = fields;
                return {
                  eq: vi.fn().mockResolvedValue({ error: null }),
                };
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
      };

      const service = new AdminService(mockDb);
      const result = await service.resolveDispute(
        validDisputeId,
        {
          status: "resolved_rejected",
          resolutionReason:
            "Frivolous report; genuine merchant verified with valid GST registration certificate.",
        },
        "admin-user-42"
      );

      expect(result.newStatus).toBe("active");
      expect(result.newTrustTier).toBe("verified");
      expect(updatedCredential?.status).toBe("active");
      expect(updatedCredential?.trust_tier).toBe("verified");
    });

    it("throws NotFoundError when dispute does not exist", async () => {
      const mockDb = {
        schema: vi.fn().mockReturnThis(),
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        })),
      };

      const service = new AdminService(mockDb);
      await expect(
        service.resolveDispute("non-existent-id", {
          status: "resolved_upheld",
          resolutionReason: "Valid reason text",
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("AdminService.listCredentials", () => {
    it("returns credential metadata and never returns sensitive PII fields like GST or bank account numbers", async () => {
      const mockDb = {
        schema: vi.fn().mockReturnThis(),
        from: vi.fn((table: string) => {
          if (table === "merchant_credential") {
            return {
              select: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: validCredentialId,
                    merchant_id: validMerchantId,
                    status: "active",
                    trust_tier: "verified",
                    trust_score: 95,
                    activated_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                  },
                ],
                error: null,
                count: 1,
              }),
            };
          }
          if (table === "merchant") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    display_name: "Sharma Canteen",
                    contact_phone: "+919876543210",
                  },
                }),
              }),
            };
          }
          if (table === "merchant_identity") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    identity_tier: "gst_verified",
                  },
                }),
              }),
            };
          }
          if (table === "registered_qr") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({
                data: [{ id: "qr-1" }],
              }),
            };
          }
          if (table === "blockchain_anchor") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  status: "confirmed",
                  tx_hash:
                    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                },
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
      };

      const service = new AdminService(mockDb);
      const result = await service.listCredentials({ page: 1, limit: 10 });

      expect(result.credentials.length).toBe(1);
      const cred = result.credentials[0];
      expect(cred.merchantName).toBe("Sharma Canteen");
      expect(cred.identityTier).toBe("gst_verified");
      expect(cred.qrCount).toBe(1);
      expect(cred.latestAnchorStatus).toBe("confirmed");

      // Verify strict security boundary: no GST or bank VPA fields in object
      expect(cred).not.toHaveProperty("gst_udyam_number");
      expect(cred).not.toHaveProperty("bank_vpa_masked");
    });
  });

  describe("Admin API Routes (/api/v1/admin)", () => {
    it("rejects unauthenticated requests with 401 UNAUTHENTICATED", async () => {
      const res = await request(app).get("/api/v1/admin/disputes");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("rejects merchant-role tokens with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .get("/api/v1/admin/disputes")
        .set("Authorization", "Bearer mock-merchant-token");

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("GET /api/v1/admin/disputes returns 200 with list of disputes", async () => {
      vi.spyOn(adminService, "listDisputes").mockResolvedValueOnce({
        disputes: [
          {
            id: validDisputeId,
            credentialId: validCredentialId,
            status: "open",
            evidenceSummary: "QR sticker tampered with",
            createdAt: new Date().toISOString(),
            targetMerchantName: "Sharma Canteen",
            targetTrustTier: "warning",
            targetStatus: "active",
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      });

      const res = await request(app)
        .get("/api/v1/admin/disputes")
        .set("Authorization", "Bearer mock-admin-token");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("disputes");
      expect(res.body.data.disputes.length).toBe(1);
      expect(res.body.data.disputes[0].targetMerchantName).toBe("Sharma Canteen");
    });

    it("PATCH /api/v1/admin/disputes/:id successfully resolves dispute", async () => {
      vi.spyOn(adminService, "resolveDispute").mockResolvedValueOnce({
        dispute: {
          id: validDisputeId,
          credentialId: validCredentialId,
          status: "resolved_upheld",
          evidenceSummary: "QR sticker tampered with",
          resolutionReason: "Confirmed tampering after physical review.",
          createdAt: new Date().toISOString(),
          resolvedAt: new Date().toISOString(),
          resolvedByAdminId: "admin-system",
        },
        targetCredentialId: validCredentialId,
        newTrustTier: "warning",
        newStatus: "suspended",
        message:
          "Dispute upheld. Target credential has been suspended and flagged with WARNING.",
      });

      const res = await request(app)
        .patch(`/api/v1/admin/disputes/${validDisputeId}`)
        .set("Authorization", "Bearer mock-admin-token")
        .send({
          status: "resolved_upheld",
          resolutionReason: "Confirmed tampering after physical review.",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.newStatus).toBe("suspended");
      expect(res.body.data.newTrustTier).toBe("warning");
      expect(res.body.data.dispute.status).toBe("resolved_upheld");
    });

    it("PATCH /api/v1/admin/disputes/:id returns 400 when resolutionReason is too short (<5 chars)", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/disputes/${validDisputeId}`)
        .set("Authorization", "Bearer mock-admin-token")
        .send({
          status: "resolved_upheld",
          resolutionReason: "bad",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("GET /api/v1/admin/credentials returns 200 with credentials list", async () => {
      vi.spyOn(adminService, "listCredentials").mockResolvedValueOnce({
        credentials: [
          {
            id: validCredentialId,
            merchantId: validMerchantId,
            merchantName: "Sharma Canteen",
            contactPhone: "+919876543210",
            identityTier: "gst_verified",
            status: "active",
            trustTier: "verified",
            trustScore: 95,
            qrCount: 1,
            activatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            latestAnchorStatus: "confirmed",
            latestAnchorTxHash: "0x123",
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      });

      const res = await request(app)
        .get("/api/v1/admin/credentials?search=sharma")
        .set("Authorization", "Bearer mock-admin-token");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("credentials");
      expect(res.body.data.credentials[0].merchantName).toBe("Sharma Canteen");
    });

    it("POST /api/v1/admin/registry/seed returns 200 with seeded demo count", async () => {
      vi.spyOn(adminService, "seedDemoRegistry").mockResolvedValueOnce({
        message:
          "Demo merchant registry seeded successfully with 7 fictional pilot merchants.",
        seededCount: 7,
        merchants: [
          {
            name: "Sharma Canteen",
            credentialId: validCredentialId,
            trustTier: "verified",
            status: "active",
          },
        ],
      });

      const res = await request(app)
        .post("/api/v1/admin/registry/seed")
        .set("Authorization", "Bearer mock-admin-token");

      expect(res.status).toBe(200);
      expect(res.body.data.seededCount).toBe(7);
      expect(res.body.data.merchants.length).toBe(1);
    });
  });
});
