import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import app from "../index.js";
import * as supabaseDb from "../db/supabase.js";

describe("POST /api/v1/merchants/register/identity", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const setupMockSupabase = (overrides = {}) => {
    const mockIdentitySelect = vi.fn();
    const mockIdentityInsert = vi.fn();
    const mockMerchantSelect = vi.fn();
    const mockMerchantInsert = vi.fn();

    mockSupabase = {
      schema: vi.fn().mockImplementation((schemaName: string) => {
        if (schemaName === "identity") {
          return {
            from: vi.fn().mockImplementation((tableName: string) => {
              if (tableName === "merchant_identity") {
                return {
                  select: mockIdentitySelect,
                  insert: mockIdentityInsert,
                };
              }
              return {};
            }),
          };
        }
        return {};
      }),
      from: vi.fn().mockImplementation((tableName: string) => {
        if (tableName === "merchant") {
          return {
            select: mockMerchantSelect,
            insert: mockMerchantInsert,
          };
        }
        return {};
      }),
      ...overrides,
    };

    vi.spyOn(supabaseDb, "getSupabaseAdmin").mockReturnValue(mockSupabase);

    return {
      mockIdentitySelect,
      mockIdentityInsert,
      mockMerchantSelect,
      mockMerchantInsert,
    };
  };

  it("registers successfully via GST/Udyam path (gst_verified tier)", async () => {
    const {
      mockIdentitySelect,
      mockIdentityInsert,
      mockMerchantSelect,
      mockMerchantInsert,
    } = setupMockSupabase();

    // 1. GST check: no existing record
    mockIdentitySelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    // 2. Merchant check: not existing
    mockMerchantSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    // 3. Merchant insert
    mockMerchantInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "merchant-uuid-1" },
          error: null,
        }),
      }),
    });

    // 4. Identity insert
    mockIdentityInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "identity-uuid-1" },
          error: null,
        }),
      }),
    });

    const res = await request(app).post("/api/v1/merchants/register/identity").send({
      path: "gst_udyam",
      gstUdyamNumber: "27AAPFU0939F1ZV",
      contactPhone: "+919876543210",
      otp: "123456",
      displayName: "Sharma Canteen",
      kycAddress: "Shop 4, Campus Market, IIT Bombay, Mumbai",
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      merchantId: "merchant-uuid-1",
      identityId: "identity-uuid-1",
      identityTier: "gst_verified",
      displayName: "Sharma Canteen",
    });
  });

  it("returns 409 CONFLICT if GST/Udyam number is already registered", async () => {
    const { mockIdentitySelect } = setupMockSupabase();

    // GST check: existing record found
    mockIdentitySelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "existing-identity-id", merchant_id: "existing-merchant-id" },
          error: null,
        }),
      }),
    });

    const res = await request(app).post("/api/v1/merchants/register/identity").send({
      path: "gst_udyam",
      gstUdyamNumber: "27AAPFU0939F1ZV",
      contactPhone: "+919876543210",
      otp: "123456",
      displayName: "Sharma Canteen",
      kycAddress: "Shop 4, Campus Market, IIT Bombay, Mumbai",
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
    expect(res.body.error.message).toContain("already registered");
    expect(res.body.error.disputeUrl).toBe("/credential/dispute/new");
  });

  it("registers successfully via penny-drop path (baseline tier) with masked VPA", async () => {
    const { mockIdentityInsert, mockMerchantSelect, mockMerchantInsert } =
      setupMockSupabase();

    // 1. Merchant check: not existing
    mockMerchantSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    // 2. Merchant insert
    mockMerchantInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "merchant-uuid-2" },
          error: null,
        }),
      }),
    });

    // 3. Identity insert
    mockIdentityInsert.mockImplementation((payload: { bank_vpa_masked: string }) => {
      expect(payload.bank_vpa_masked).toBe("sh****@okaxis");
      return {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "identity-uuid-2" },
            error: null,
          }),
        }),
      };
    });

    const res = await request(app).post("/api/v1/merchants/register/identity").send({
      path: "penny_drop",
      contactPhone: "+919876543210",
      bankVpa: "sharmacanteen@okaxis",
      displayName: "Sharma Fast Food",
      kycAddress: "Stall 12, Main Gate, Powai, Mumbai",
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      merchantId: "merchant-uuid-2",
      identityId: "identity-uuid-2",
      identityTier: "baseline",
      displayName: "Sharma Fast Food",
    });
  });

  it("returns 400 VALIDATION_ERROR on malformed request payload", async () => {
    const res = await request(app).post("/api/v1/merchants/register/identity").send({
      path: "gst_udyam",
      gstUdyamNumber: "27", // too short
      contactPhone: "invalid-phone",
      otp: "12", // too short
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });
});

describe("POST /api/v1/merchants/register/reference", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockStorageBucket: any;

  const merchantId = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";
  const dummyBase64 = Buffer.from("test-photo-data").toString("base64");

  beforeEach(() => {
    vi.restoreAllMocks();

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
                      id: "identity-1",
                      kyc_address: "Powai Market, Mumbai (19.0760, 72.8777)",
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
                      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                  insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: { id: "qr-1" },
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
                        data: { id: "cred-1" },
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

  it("successfully registers reference capture and creates credential in pending_activation state", async () => {
    const res = await request(app).post("/api/v1/merchants/register/reference").send({
      merchantId,
      qrPayload: "upi://pay?pa=sharmacanteen@okaxis&pn=Sharma%20Canteen",
      photoBase64: dummyBase64,
      mimeType: "image/jpeg",
      latitude: 19.076,
      longitude: 72.8777,
      boundRadiusM: 100,
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      credentialId: "cred-1",
      registeredQrId: "qr-1",
      qrPayloadHash: expect.any(String),
      status: "pending_activation",
      locationVariance: false,
      embeddingExtracted: true,
    });

    // Zero persisted photo bytes verified
    expect(mockStorageBucket.remove).toHaveBeenCalledTimes(1);
  });

  it("handles out-of-radius capture with location_variance = true without blocking", async () => {
    const res = await request(app).post("/api/v1/merchants/register/reference").send({
      merchantId,
      qrPayload: "upi://pay?pa=sharmacanteen@okaxis&pn=Sharma%20Canteen",
      photoBase64: dummyBase64,
      mimeType: "image/jpeg",
      latitude: 12.9716, // Bengaluru (far from Mumbai KYC)
      longitude: 77.5946,
      boundRadiusM: 100,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.locationVariance).toBe(true);
    expect(res.body.data.status).toBe("pending_activation");
  });

  it("returns 409 CONFLICT if the QR payload is already registered", async () => {
    mockSupabase.schema = vi.fn().mockImplementation((schemaName: string) => {
      if (schemaName === "identity") {
        return {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "identity-1", kyc_address: "Mumbai" },
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
                  data: { id: "existing-qr-uuid" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await request(app).post("/api/v1/merchants/register/reference").send({
      merchantId,
      qrPayload: "upi://pay?pa=sharmacanteen@okaxis&pn=Sharma%20Canteen",
      photoBase64: dummyBase64,
      latitude: 19.076,
      longitude: 72.8777,
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
    expect(res.body.error.disputeUrl).toBe("/credential/dispute/new");
  });

  it("returns 400 VALIDATION_ERROR on missing or invalid fields", async () => {
    const res = await request(app).post("/api/v1/merchants/register/reference").send({
      merchantId: "not-a-uuid",
      latitude: 95, // out of range
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
