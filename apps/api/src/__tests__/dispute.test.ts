import { describe, expect, it, vi } from "vitest";
import request from "supertest";

import { app } from "../app.js";
import { DisputeService, disputeService } from "../services/dispute.service.js";
import { NotFoundError } from "../middleware/error.middleware.js";

describe("Dispute Service and Endpoint (Phase 3 Task 13)", () => {
  const validCredentialId = "550e8400-e29b-41d4-a716-446655440000";
  const validEvidence =
    "Counter sticker was replaced overnight with an unauthorized Paytm QR code.";

  describe("DisputeService.fileDispute", () => {
    it("successfully creates dispute and immediately downgrades target credential to WARNING", async () => {
      let updatedTier: string | null = null;
      let insertedDispute: Record<string, unknown> | null = null;

      const mockDb = {
        schema: vi.fn().mockReturnThis(),
        from: vi.fn((table: string) => {
          if (table === "merchant_credential") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn((field: string, val: string) => {
                if (val === validCredentialId) {
                  return {
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: validCredentialId,
                        trust_tier: "verified",
                        status: "active",
                      },
                      error: null,
                    }),
                  };
                }
                return {
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Row not found" },
                  }),
                };
              }),
              update: vi.fn((updates: { trust_tier: string }) => {
                updatedTier = updates.trust_tier;
                return {
                  eq: vi.fn().mockResolvedValue({ error: null }),
                };
              }),
            };
          }
          if (table === "dispute") {
            return {
              insert: vi.fn((row: Record<string, unknown>) => {
                insertedDispute = {
                  id: "dispute-uuid-1",
                  ...row,
                  created_at: new Date().toISOString(),
                  resolved_at: null,
                  resolved_by_admin_id: null,
                  resolution_reason: null,
                };
                return {
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: insertedDispute,
                    error: null,
                  }),
                };
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
      };

      const service = new DisputeService(mockDb);
      const result = await service.fileDispute(
        {
          credentialId: validCredentialId,
          evidenceSummary: validEvidence,
        },
        "merchant-filer-id"
      );

      expect(result.targetCredentialId).toBe(validCredentialId);
      expect(result.previousTrustTier).toBe("verified");
      expect(result.newTrustTier).toBe("warning");
      expect(updatedTier).toBe("warning");
      expect(insertedDispute).toBeDefined();
      const recordedDispute = insertedDispute as Record<string, unknown> | null;
      expect(recordedDispute?.status).toBe("open");
      expect(recordedDispute?.evidence_summary).toBe(validEvidence);
    });

    it("throws NotFoundError when target credential does not exist", async () => {
      const mockDb = {
        schema: vi.fn().mockReturnThis(),
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Not found" },
            }),
          }),
        })),
      };

      const service = new DisputeService(mockDb);
      await expect(
        service.fileDispute({
          credentialId: "550e8400-e29b-41d4-a716-446655449999",
          evidenceSummary: validEvidence,
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("POST /api/v1/disputes route", () => {
    it("returns 201 with dispute result when payload is valid", async () => {
      const spy = vi.spyOn(disputeService, "fileDispute").mockResolvedValueOnce({
        dispute: {
          id: "disp-101",
          credentialId: validCredentialId,
          filedByMerchantId: null,
          status: "open",
          evidenceSummary: validEvidence,
          resolvedByAdminId: null,
          resolutionReason: null,
          createdAt: new Date().toISOString(),
          resolvedAt: null,
        },
        targetCredentialId: validCredentialId,
        previousTrustTier: "verified",
        newTrustTier: "warning",
        message: "Dispute filed successfully.",
      });

      const res = await request(app).post("/api/v1/disputes").send({
        credentialId: validCredentialId,
        evidenceSummary: validEvidence,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.targetCredentialId).toBe(validCredentialId);
      expect(res.body.data.newTrustTier).toBe("warning");
      expect(res.body.data.dispute.status).toBe("open");
      expect(spy).toHaveBeenCalled();
    });

    it("returns 400 VALIDATION_ERROR when evidenceSummary is too short (<10 chars)", async () => {
      const res = await request(app).post("/api/v1/disputes").send({
        credentialId: validCredentialId,
        evidenceSummary: "short",
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 VALIDATION_ERROR when credentialId is not a valid UUID", async () => {
      const res = await request(app).post("/api/v1/disputes").send({
        credentialId: "not-a-uuid",
        evidenceSummary: validEvidence,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
