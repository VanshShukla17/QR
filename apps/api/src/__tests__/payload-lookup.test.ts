import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

import {
  PayloadLookupService,
  RegisteredQrLookupResult,
} from "../services/payload-lookup.service.js";

describe("PayloadLookupService (Task 7)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;
  let service: PayloadLookupService;

  const mockQrRecord = {
    id: "qr-12345",
    credential_id: "cred-67890",
    qr_payload_hash: crypto
      .createHash("sha256")
      .update("upi://pay?pa=merchant@upi&pn=Store")
      .digest("hex"),
    bound_lat: 12.9716,
    bound_lng: 77.5946,
    bound_radius_m: 100,
  };

  const mockCredRecord = {
    id: "cred-67890",
    merchant_id: "merch-11111",
    status: "active",
    trust_tier: "verified",
    trust_score: 75.0,
  };

  const mockEmbeddingRecord = {
    embedding: JSON.stringify(new Array(768).fill(0.05)),
  };

  beforeEach(() => {
    mockDb = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "registered_qr") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              if (col === "qr_payload_hash" && val === mockQrRecord.qr_payload_hash) {
                return {
                  maybeSingle: vi
                    .fn()
                    .mockResolvedValue({ data: mockQrRecord, error: null }),
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
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: mockEmbeddingRecord, error: null }),
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

    service = new PayloadLookupService(mockDb, 60000);
  });

  it("correctly computes SHA-256 hash of payload", () => {
    const payload = "upi://pay?pa=test@upi";
    const expected = crypto.createHash("sha256").update(payload).digest("hex");
    expect(service.hashPayload(payload)).toBe(expected);
  });

  it("resolves a known QR payload to its credential_id on cache miss", async () => {
    const result = await service.lookupByPayload("upi://pay?pa=merchant@upi&pn=Store");

    expect(result).not.toBeNull();
    expect(result?.credentialId).toBe("cred-67890");
    expect(result?.id).toBe("qr-12345");
    expect(result?.boundLat).toBe(12.9716);
    expect(result?.boundLng).toBe(77.5946);
    expect(result?.referenceEmbedding).toHaveLength(768);
    expect(result?.trustTier).toBe("verified");
  });

  it("resolves from cache in under 50ms without querying database again", async () => {
    // Prime / warm cache with first call
    await service.lookupByPayload("upi://pay?pa=merchant@upi&pn=Store");
    mockDb.from.mockClear();

    const start = performance.now();
    const cachedResult = await service.lookupByPayload(
      "upi://pay?pa=merchant@upi&pn=Store"
    );
    const duration = performance.now() - start;

    expect(cachedResult).not.toBeNull();
    expect(cachedResult?.credentialId).toBe("cred-67890");
    expect(duration).toBeLessThan(50); // Under 50ms
    expect(mockDb.from).not.toHaveBeenCalled(); // Cache hit!
  });

  it("returns a clean null for an unrecognized payload", async () => {
    const result = await service.lookupByPayload("upi://pay?pa=unknown@fraud&pn=Fake");

    expect(result).toBeNull();
  });

  it("allows priming and invalidating cache explicitly", async () => {
    const customResult: RegisteredQrLookupResult = {
      id: "custom-qr",
      credentialId: "custom-cred",
      qrPayloadHash: "custom-hash",
      boundLat: 10,
      boundLng: 20,
      boundRadiusM: 50,
    };

    service.primeCache("custom-hash", customResult);
    expect(service.getCacheSize()).toBe(1);

    const lookup = await service.lookupByPayload("custom-hash", true);
    expect(lookup?.credentialId).toBe("custom-cred");

    service.invalidateCache("custom-hash");
    expect(service.getCacheSize()).toBe(0);
  });
});
