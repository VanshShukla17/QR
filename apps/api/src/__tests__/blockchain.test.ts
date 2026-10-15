import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import {
  computeCanonicalCredentialHash,
  getExplorerUrl,
  BlockchainAnchorService,
  CanonicalCredentialData,
} from "../services/blockchain.service.js";
import { supabaseAdmin } from "../db/client.js";

// Helper to mock Supabase DB for Blockchain tests
function createMockDb(initialState?: {
  credentials?: Array<{
    id: string;
    merchant_id: string;
    status: string;
    trust_tier: string;
    trust_score: number;
    activated_at: string | null;
  }>;
  registeredQrs?: Array<{
    credential_id: string;
    qr_payload_hash: string;
    bound_lat: number;
    bound_lng: number;
    bound_radius_m: number;
  }>;
  merchants?: Array<{
    id: string;
    display_name: string;
  }>;
  anchors?: Array<{
    id: string;
    credential_id: string;
    tx_hash: string | null;
    network: string;
    status: string;
    credential_hash: string;
    attempts: number;
    last_error: string | null;
    submitted_at: string | null;
    confirmed_at: string | null;
    created_at: string;
  }>;
}) {
  const credentials = initialState?.credentials || [];
  const registeredQrs = initialState?.registeredQrs || [];
  const merchants = initialState?.merchants || [];
  const anchors = initialState?.anchors || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = {
    from: (table: string) => {
      if (table === "merchant") {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => {
                const found = merchants.find((m) => m.id === val);
                return { data: found || null, error: null };
              },
            }),
          }),
        };
      }
      throw new Error(`Unexpected public table ${table}`);
    },
    schema: (schemaName: string) => {
      if (schemaName === "comparison") {
        return {
          from: (table: string) => {
            if (table === "merchant_credential") {
              return {
                select: () => ({
                  eq: (_col: string, val: string) => ({
                    maybeSingle: async () => {
                      const found = credentials.find((c) => c.id === val);
                      return { data: found || null, error: null };
                    },
                  }),
                }),
              };
            }

            if (table === "registered_qr") {
              return {
                select: () => ({
                  eq: (_col: string, val: string) => ({
                    maybeSingle: async () => {
                      const found = registeredQrs.find((q) => q.credential_id === val);
                      return { data: found || null, error: null };
                    },
                  }),
                }),
              };
            }

            if (table === "blockchain_anchor") {
              return {
                select: () => ({
                  eq: (_col: string, val: string) => ({
                    maybeSingle: async () => {
                      const found = anchors.find((a) => a.credential_id === val);
                      return { data: found || null, error: null };
                    },
                    order: () => ({
                      maybeSingle: async () => {
                        const found = anchors.find((a) => a.credential_id === val);
                        return { data: found || null, error: null };
                      },
                    }),
                  }),
                }),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                insert: (record: any) => ({
                  select: () => ({
                    single: async () => {
                      const newAnchor = {
                        id: `anchor-${Date.now()}`,
                        created_at: new Date().toISOString(),
                        ...record,
                      };
                      anchors.push(newAnchor);
                      return { data: newAnchor, error: null };
                    },
                  }),
                }),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                update: (updates: any) => ({
                  eq: (_col: string, val: string) => {
                    const found = anchors.find((a) => a.id === val);
                    if (found) {
                      Object.assign(found, updates);
                    }
                    return Promise.resolve({ data: found, error: null });
                  },
                }),
              };
            }

            throw new Error(`Unexpected comparison table ${table}`);
          },
        };
      }
      throw new Error(`Unexpected schema ${schemaName}`);
    },
  };

  return { db, credentials, registeredQrs, merchants, anchors };
}

describe("Canonical Credential Hash (Unit Tests)", () => {
  const sampleData: CanonicalCredentialData = {
    credentialId: "550e8400-e29b-41d4-a716-446655440000",
    merchantId: "660e8400-e29b-41d4-a716-446655440001",
    qrPayloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    boundLocation: {
      latitude: 18.5204,
      longitude: 73.8567,
      boundRadiusM: 100,
    },
    status: "recently_registered",
    activatedAt: "2026-09-30T10:00:00.000Z",
  };

  it("computes a valid 32-byte 0x-prefixed Keccak-256 hash", () => {
    const hash = computeCanonicalCredentialHash(sampleData);
    expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("is deterministic regardless of object key order", () => {
    const reorderedData: CanonicalCredentialData = {
      status: "recently_registered",
      activatedAt: "2026-09-30T10:00:00.000Z",
      credentialId: "550e8400-e29b-41d4-a716-446655440000",
      boundLocation: {
        latitude: 18.5204,
        longitude: 73.8567,
        boundRadiusM: 100,
      },
      merchantId: "660e8400-e29b-41d4-a716-446655440001",
      qrPayloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    };

    const hash1 = computeCanonicalCredentialHash(sampleData);
    const hash2 = computeCanonicalCredentialHash(reorderedData);
    expect(hash1).toBe(hash2);
  });

  it("produces a distinct hash when any metadata attribute is modified", () => {
    const modifiedData: CanonicalCredentialData = {
      ...sampleData,
      status: "active",
    };

    const originalHash = computeCanonicalCredentialHash(sampleData);
    const modifiedHash = computeCanonicalCredentialHash(modifiedData);
    expect(originalHash).not.toBe(modifiedHash);
  });
});

describe("Explorer URL Generator (Unit Tests)", () => {
  it("formats Polygon Amoy explorer link correctly", () => {
    const tx = "0x8f3c7a2b9e1d4c5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f";
    const url = getExplorerUrl(tx, "amoy");
    expect(url).toBe(`https://amoy.polygonscan.com/tx/${tx}`);
  });

  it("formats Sepolia explorer link when network is sepolia", () => {
    const tx = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const url = getExplorerUrl(tx, "sepolia");
    expect(url).toBe(`https://sepolia.etherscan.io/tx/${tx}`);
  });
});

describe("BlockchainAnchorService (Unit Tests)", () => {
  const credId = "550e8400-e29b-41d4-a716-446655440000";

  it("successfully creates anchor record and transitions status to confirmed", async () => {
    const { db, anchors } = createMockDb({
      credentials: [
        {
          id: credId,
          merchant_id: "m-1",
          status: "recently_registered",
          trust_tier: "unverified",
          trust_score: 10,
          activated_at: "2026-09-30T10:00:00.000Z",
        },
      ],
      registeredQrs: [
        {
          credential_id: credId,
          qr_payload_hash: "hash123",
          bound_lat: 18.5204,
          bound_lng: 73.8567,
          bound_radius_m: 100,
        },
      ],
    });

    const service = new BlockchainAnchorService(db, {
      simulateFailure: false,
    });

    const result = await service.executeAnchorAttempt(credId, 1);

    expect(result.status).toBe("confirmed");
    expect(result.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(result.credentialHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(result.explorerUrl).toContain("amoy.polygonscan.com");

    expect(anchors.length).toBe(1);
    expect(anchors[0].status).toBe("confirmed");
  });

  it("handles testnet failure, schedules retry, and marks failed on 5th attempt", async () => {
    const { db, anchors } = createMockDb({
      credentials: [
        {
          id: credId,
          merchant_id: "m-1",
          status: "recently_registered",
          trust_tier: "unverified",
          trust_score: 10,
          activated_at: "2026-09-30T10:00:00.000Z",
        },
      ],
      registeredQrs: [
        {
          credential_id: credId,
          qr_payload_hash: "hash123",
          bound_lat: 18.5204,
          bound_lng: 73.8567,
          bound_radius_m: 100,
        },
      ],
    });

    const service = new BlockchainAnchorService(db, {
      maxAttempts: 5,
      baseBackoffMs: 10,
      simulateFailure: true,
    });

    // Attempt 1 fails and throws for queue to catch and reschedule
    await expect(service.executeAnchorAttempt(credId, 1)).rejects.toThrow(
      "Simulated testnet failure"
    );
    expect(anchors[0].attempts).toBe(1);
    expect(anchors[0].last_error).toContain("Simulated testnet failure");

    // Attempts 2, 3, 4 also throw
    await expect(service.executeAnchorAttempt(credId, 2)).rejects.toThrow();
    await expect(service.executeAnchorAttempt(credId, 3)).rejects.toThrow();
    await expect(service.executeAnchorAttempt(credId, 4)).rejects.toThrow();

    // Final attempt (5): does NOT crash, returns status 'failed'
    const finalResult = await service.executeAnchorAttempt(credId, 5);
    expect(finalResult.status).toBe("failed");
    expect(finalResult.txHash).toBeNull();
    expect(anchors[0].status).toBe("failed");
  });

  it("retrieves latest anchor with getLatestAnchor", async () => {
    const { db } = createMockDb({
      anchors: [
        {
          id: "anc-1",
          credential_id: credId,
          tx_hash: "0x8f3c7a2b9e1d4c5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f",
          network: "amoy",
          status: "confirmed",
          credential_hash:
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          attempts: 1,
          last_error: null,
          submitted_at: "2026-09-30T10:00:00.000Z",
          confirmed_at: "2026-09-30T10:00:05.000Z",
          created_at: "2026-09-30T10:00:00.000Z",
        },
      ],
    });

    const service = new BlockchainAnchorService(db);
    const anchor = await service.getLatestAnchor(credId);

    expect(anchor).not.toBeNull();
    expect(anchor?.status).toBe("confirmed");
    expect(anchor?.explorerUrl).toContain("amoy.polygonscan.com");
  });
});

describe("GET /api/v1/verify/:credentialId (API Route)", () => {
  const testCredId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 404 when credential does not exist", async () => {
    vi.spyOn(supabaseAdmin, "schema").mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const res = await request(app).get("/api/v1/verify/non-existent-id");
    expect(res.status).toBe(404);
  });

  it("returns 200 with credential metadata, canonical hash, and anchor verification", async () => {
    // 1. Mock credential
    const mockCred = {
      id: testCredId,
      merchant_id: "m-123",
      status: "recently_registered",
      trust_tier: "unverified",
      trust_score: 10,
      activated_at: "2026-09-30T10:00:00.000Z",
    };

    const mockMerchant = {
      display_name: "Sharma Canteen",
    };

    const mockQr = {
      qr_payload_hash: "hash999",
      bound_lat: 18.5204,
      bound_lng: 73.8567,
      bound_radius_m: 100,
    };

    const canonicalHash = computeCanonicalCredentialHash({
      credentialId: testCredId,
      merchantId: "m-123",
      qrPayloadHash: "hash999",
      boundLocation: {
        latitude: 18.5204,
        longitude: 73.8567,
        boundRadiusM: 100,
      },
      status: "recently_registered",
      activatedAt: "2026-09-30T10:00:00.000Z",
    });

    const mockAnchor = {
      id: "anc-123",
      credentialId: testCredId,
      txHash: "0x8f3c7a2b9e1d4c5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f",
      network: "amoy",
      status: "confirmed" as const,
      credentialHash: canonicalHash,
      attempts: 1,
      submittedAt: "2026-09-30T10:00:00.000Z",
      confirmedAt: "2026-09-30T10:00:05.000Z",
      explorerUrl:
        "https://amoy.polygonscan.com/tx/0x8f3c7a2b9e1d4c5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f",
    };

    vi.spyOn(supabaseAdmin, "schema").mockReturnValue({
      from: (table: string) => {
        if (table === "merchant_credential") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: mockCred, error: null }),
              }),
            }),
          };
        }
        if (table === "registered_qr") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: mockQr, error: null }),
              }),
            }),
          };
        }
        return {};
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    vi.spyOn(supabaseAdmin, "from").mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: mockMerchant, error: null }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { blockchainService } = await import("../services/blockchain.service.js");
    vi.spyOn(blockchainService, "getLatestAnchor").mockResolvedValueOnce(mockAnchor);

    const res = await request(app).get(`/api/v1/verify/${testCredId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.credentialId).toBe(testCredId);
    expect(res.body.data.displayName).toBe("Sharma Canteen");
    expect(res.body.data.canonicalCredentialHash).toBe(canonicalHash);
    expect(res.body.data.verifiedOnChain).toBe(true);
    expect(res.body.data.anchor.explorerUrl).toContain("amoy.polygonscan.com");
  });
});
