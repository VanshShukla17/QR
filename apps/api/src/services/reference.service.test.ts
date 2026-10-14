import { describe, expect, it, vi, beforeEach } from "vitest";
import * as supabaseDb from "../db/supabase.js";
import {
  ConflictError,
  NotFoundError,
  computeQrPayloadHash,
  extractEmbedding,
  geocodeAddress,
  haversineDistanceM,
  registerReference,
} from "./reference.service.js";

describe("reference.service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("computeQrPayloadHash", () => {
    it("computes deterministic sha256 hash for QR payloads", () => {
      const payload = "upi://pay?pa=sharmacanteen@okaxis&pn=Sharma%20Canteen&am=1.00";
      const hash1 = computeQrPayloadHash(payload);
      const hash2 = computeQrPayloadHash(payload);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });
  });

  describe("haversineDistanceM", () => {
    it("calculates accurate distance between coordinates", () => {
      // Distance between Gateway of India (18.9220, 72.8347) and Marine Drive (18.9432, 72.8230) ~ 2.6 km
      const distance = haversineDistanceM(18.922, 72.8347, 18.9432, 72.823);
      expect(distance).toBeGreaterThan(2000);
      expect(distance).toBeLessThan(3000);

      // Same point distance should be 0
      expect(haversineDistanceM(19.076, 72.8777, 19.076, 72.8777)).toBe(0);
    });
  });

  describe("geocodeAddress", () => {
    it("parses explicit coordinates embedded in address", async () => {
      const coords = await geocodeAddress("Shop 4, Market Area (19.1234, 72.5678)");
      expect(coords.latitude).toBeCloseTo(19.1234, 4);
      expect(coords.longitude).toBeCloseTo(72.5678, 4);
    });

    it("geocodes known cities accurately", async () => {
      const mumbai = await geocodeAddress("Powai Market, Mumbai");
      expect(mumbai.latitude).toBeCloseTo(19.076, 2);
      expect(mumbai.longitude).toBeCloseTo(72.8777, 2);

      const bengaluru = await geocodeAddress(
        "Indiranagar 100ft Road, Bengaluru, Karnataka"
      );
      expect(bengaluru.latitude).toBeCloseTo(12.9716, 2);
      expect(bengaluru.longitude).toBeCloseTo(77.5946, 2);
    });
  });

  describe("extractEmbedding", () => {
    it("extracts a 768-dimensional normalized unit vector", async () => {
      const dummyPhoto = Buffer.from("fake-jpeg-image-bytes-for-unit-test");
      const vector = await extractEmbedding(dummyPhoto, "image/jpeg");

      expect(vector).toHaveLength(768);

      // Verify unit length (||v|| ≈ 1) for cosine distance compatibility
      const sumSq = vector.reduce((acc, val) => acc + val * val, 0);
      expect(Math.sqrt(sumSq)).toBeCloseTo(1.0, 1);
    });
  });

  describe("registerReference", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockStorageBucket: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockSupabase: any;

    const dummyBase64 = Buffer.from("fake-reference-photo-bytes").toString("base64");
    const merchantId = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";

    beforeEach(() => {
      mockStorageBucket = {
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase = {
        schema: vi.fn().mockImplementation((schemaName: string) => {
          if (schemaName === "identity") {
            return {
              from: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: "identity-123",
                        kyc_address: "Powai, Mumbai (19.0760, 72.8777)",
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (schemaName === "comparison") {
            return {
              from: vi.fn().mockImplementation((tableName: string) => {
                if (tableName === "registered_qr") {
                  return {
                    select: vi.fn().mockReturnValue({
                      eq: vi.fn().mockReturnValue({
                        maybeSingle: vi
                          .fn()
                          .mockResolvedValue({ data: null, error: null }),
                      }),
                    }),
                    insert: vi.fn().mockReturnValue({
                      select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                          data: { id: "qr-123" },
                          error: null,
                        }),
                      }),
                    }),
                  };
                }
                if (tableName === "merchant_credential") {
                  return {
                    insert: vi.fn().mockReturnValue({
                      select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                          data: { id: "cred-123" },
                          error: null,
                        }),
                      }),
                    }),
                  };
                }
                if (tableName === "reference_embedding") {
                  return {
                    insert: vi.fn().mockResolvedValue({ error: null }),
                  };
                }
                return {};
              }),
            };
          }
          return {};
        }),
        storage: {
          from: vi.fn().mockReturnValue(mockStorageBucket),
        },
      };

      vi.spyOn(supabaseDb, "getSupabaseAdmin").mockReturnValue(mockSupabase);
    });

    it("registers reference with zero persisted photo bytes and pending_activation status", async () => {
      const result = await registerReference({
        merchantId,
        qrPayload: "upi://pay?pa=test@upi&pn=Test",
        photoBase64: dummyBase64,
        mimeType: "image/jpeg",
        latitude: 19.076, // Same as KYC address
        longitude: 72.8777,
        boundRadiusM: 100,
      });

      expect(result.status).toBe("pending_activation");
      expect(result.credentialId).toBe("cred-123");
      expect(result.registeredQrId).toBe("qr-123");
      expect(result.locationVariance).toBe(false);
      expect(result.embeddingExtracted).toBe(true);

      // Verify transient storage: uploaded then immediately removed!
      expect(mockStorageBucket.upload).toHaveBeenCalledTimes(1);
      expect(mockStorageBucket.remove).toHaveBeenCalledTimes(1);
      const uploadedFile = mockStorageBucket.upload.mock.calls[0][0];
      const removedFiles = mockStorageBucket.remove.mock.calls[0][0];
      expect(removedFiles).toContain(uploadedFile);
    });

    it("flags location_variance = true when GPS is outside bound radius (does not block)", async () => {
      // Submitted GPS is in Bengaluru (12.9716, 77.5946), while KYC address is Mumbai (19.0760, 72.8777)
      const result = await registerReference({
        merchantId,
        qrPayload: "upi://pay?pa=test@upi&pn=Test",
        photoBase64: dummyBase64,
        mimeType: "image/jpeg",
        latitude: 12.9716,
        longitude: 77.5946,
        boundRadiusM: 100,
      });

      expect(result.locationVariance).toBe(true);
      expect(result.status).toBe("pending_activation");
      expect(result.credentialId).toBe("cred-123");
      expect(result.registeredQrId).toBe("qr-123");

      // Verify photo was still deleted from transient storage
      expect(mockStorageBucket.remove).toHaveBeenCalledTimes(1);
    });

    it("throws ConflictError when QR payload is already registered", async () => {
      // Mock existing registered QR
      mockSupabase.schema = vi.fn().mockImplementation((schemaName: string) => {
        if (schemaName === "identity") {
          return {
            from: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: "identity-123", kyc_address: "Mumbai" },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (schemaName === "comparison") {
          return {
            from: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: "existing-qr-id" },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await expect(
        registerReference({
          merchantId,
          qrPayload: "upi://pay?pa=test@upi&pn=Test",
          photoBase64: dummyBase64,
          mimeType: "image/jpeg",
          latitude: 19.076,
          longitude: 72.8777,
          boundRadiusM: 100,
        })
      ).rejects.toThrow(ConflictError);
    });

    it("throws NotFoundError if merchant has not completed step 1 identity registration", async () => {
      // Mock no identity record found
      mockSupabase.schema = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      await expect(
        registerReference({
          merchantId,
          qrPayload: "upi://pay?pa=test@upi&pn=Test",
          photoBase64: dummyBase64,
          mimeType: "image/jpeg",
          latitude: 19.076,
          longitude: 72.8777,
          boundRadiusM: 100,
        })
      ).rejects.toThrow(NotFoundError);
    });
  });
});
