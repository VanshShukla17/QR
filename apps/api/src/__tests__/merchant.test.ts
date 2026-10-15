import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { MerchantService, maskVpa } from "../services/merchant.service.js";
import { visionService } from "../services/vision.service.js";
import {
  geocodingService,
  haversineDistanceMeters,
} from "../services/geocoding.service.js";
import { ConflictError, NotFoundError } from "../middleware/error.middleware.js";

function createMockDb(initialState?: {
  merchants?: Array<{ id: string; display_name: string; contact_phone: string }>;
  identities?: Array<{
    id: string;
    merchant_id: string;
    identity_tier: "gst_verified" | "baseline";
    gst_udyam_number: string | null;
    bank_vpa_masked: string | null;
    kyc_address: string;
    otp_confirmed: boolean;
  }>;
  credentials?: Array<{
    id: string;
    merchant_id: string;
    status: string;
    trust_tier: string;
    trust_score: number;
    location_variance: boolean;
  }>;
  registeredQrs?: Array<{
    id: string;
    credential_id: string;
    qr_payload_hash: string;
    bound_lat: number;
    bound_lng: number;
    bound_radius_m: number;
  }>;
  referenceEmbeddings?: Array<{
    id: string;
    registered_qr_id: string;
    embedding: string;
  }>;
  storageObjects?: string[];
}) {
  const merchants = [...(initialState?.merchants || [])];
  const identities = [...(initialState?.identities || [])];
  const credentials = [...(initialState?.credentials || [])];
  const registeredQrs = [...(initialState?.registeredQrs || [])];
  const referenceEmbeddings = [...(initialState?.referenceEmbeddings || [])];
  const storageObjects = [...(initialState?.storageObjects || [])];

  const db = {
    storage: {
      from: (_bucket: string) => ({
        upload: async (path: string) => {
          storageObjects.push(path);
          return { data: { path }, error: null };
        },
        remove: async (paths: string[]) => {
          for (const p of paths) {
            const idx = storageObjects.indexOf(p);
            if (idx !== -1) storageObjects.splice(idx, 1);
          }
          return { data: paths, error: null };
        },
        list: async () => ({
          data: storageObjects.map((name) => ({ name })),
          error: null,
        }),
      }),
    },
    from: (table: string) => {
      if (table === "merchant") {
        return {
          select: () => ({
            eq: (col: string, val: string) => ({
              maybeSingle: async () => {
                const found = merchants.find((m) =>
                  col === "id" ? m.id === val : m.contact_phone === val
                );
                return { data: found || null, error: null };
              },
            }),
          }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          insert: (record: any) => ({
            select: () => ({
              single: async () => {
                const newRecord = { id: `m-${Date.now()}`, ...record };
                merchants.push(newRecord);
                return { data: newRecord, error: null };
              },
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
    schema: (schemaName: string) => {
      if (schemaName === "identity") {
        return {
          from: (table: string) => {
            if (table === "merchant_identity") {
              return {
                select: () => ({
                  eq: (col: string, val: string) => ({
                    maybeSingle: async () => {
                      if (col === "gst_udyam_number") {
                        const found = identities.find((i) => i.gst_udyam_number === val);
                        return { data: found || null, error: null };
                      }
                      if (col === "merchant_id") {
                        const found = identities.find((i) => i.merchant_id === val);
                        return { data: found || null, error: null };
                      }
                      return { data: null, error: null };
                    },
                  }),
                }),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                insert: (record: any) => ({
                  select: () => ({
                    single: async () => {
                      if (
                        record.gst_udyam_number &&
                        identities.some(
                          (i) => i.gst_udyam_number === record.gst_udyam_number
                        )
                      ) {
                        return {
                          data: null,
                          error: {
                            code: "23505",
                            message:
                              "duplicate key value violates unique constraint gst_udyam",
                          },
                        };
                      }
                      const newRecord = { id: `id-${Date.now()}`, ...record };
                      identities.push(newRecord);
                      return { data: newRecord, error: null };
                    },
                  }),
                }),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                update: (updates: any) => ({
                  eq: (_col: string, val: string) => ({
                    select: () => ({
                      single: async () => {
                        const idx = identities.findIndex((i) => i.id === val);
                        if (idx !== -1) {
                          identities[idx] = { ...identities[idx], ...updates };
                          return { data: identities[idx], error: null };
                        }
                        return { data: null, error: new Error("Not found") };
                      },
                    }),
                  }),
                }),
              };
            }
            throw new Error(`Unexpected identity table ${table}`);
          },
        };
      }

      if (schemaName === "comparison") {
        return {
          from: (table: string) => {
            if (table === "merchant_credential") {
              return {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                insert: (record: any) => ({
                  select: () => ({
                    single: async () => {
                      const newRecord = { id: `cred-${Date.now()}`, ...record };
                      credentials.push(newRecord);
                      return { data: newRecord, error: null };
                    },
                  }),
                }),
                select: (_cols?: string) => ({
                  eq: (col: string, val: string) => ({
                    maybeSingle: async () => {
                      if (col === "id") {
                        const found = credentials.find((c) => c.id === val);
                        return { data: found || null, error: null };
                      }
                      return { data: null, error: null };
                    },
                  }),
                }),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                update: (updates: any) => ({
                  eq: (col: string, val: string) => ({
                    select: () => ({
                      single: async () => {
                        const found = credentials.find((c) => c.id === val);
                        if (!found) return { data: null, error: new Error("Not found") };
                        Object.assign(found, updates);
                        return { data: found, error: null };
                      },
                    }),
                  }),
                }),
              };
            }

            if (table === "registered_qr") {
              return {
                select: () => ({
                  eq: (col: string, val: string) => ({
                    maybeSingle: async () => {
                      if (col === "qr_payload_hash") {
                        const found = registeredQrs.find(
                          (q) => q.qr_payload_hash === val
                        );
                        return { data: found || null, error: null };
                      }
                      return { data: null, error: null };
                    },
                  }),
                }),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                insert: (record: any) => ({
                  select: () => ({
                    single: async () => {
                      const newRecord = { id: `qr-${Date.now()}`, ...record };
                      registeredQrs.push(newRecord);
                      return { data: newRecord, error: null };
                    },
                  }),
                }),
              };
            }

            if (table === "reference_embedding") {
              return {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                insert: async (record: any) => {
                  referenceEmbeddings.push({ id: `emb-${Date.now()}`, ...record });
                  return { data: null, error: null };
                },
              };
            }

            throw new Error(`Unexpected comparison table ${table}`);
          },
        };
      }

      throw new Error(`Unexpected schema ${schemaName}`);
    },
  };

  return {
    db,
    merchants,
    identities,
    credentials,
    registeredQrs,
    referenceEmbeddings,
    storageObjects,
  };
}

describe("MerchantService — Step 1 Identity (Unit Tests)", () => {
  it("masks bank VPA correctly without revealing full handle", () => {
    expect(maskVpa("sharma@okaxis")).toBe("sh***@okaxis");
    expect(maskVpa("ab@upi")).toBe("ab***@upi");
    expect(maskVpa("a@paytm")).toBe("a***@paytm");
  });

  it("successfully registers GST/Udyam path with gst_verified tier", async () => {
    const { db, merchants, identities } = createMockDb();
    const service = new MerchantService(db);

    const result = await service.registerIdentity({
      type: "gst_udyam",
      displayName: "Sharma Canteen",
      contactPhone: "+919876543210",
      gstUdyamNumber: "27AAAPL1234C1ZV",
      kycAddress: "Shop 12, Main Market, Delhi",
      otp: "123456",
    });

    expect(result.identityTier).toBe("gst_verified");
    expect(result.displayName).toBe("Sharma Canteen");
    expect(result.contactPhone).toBe("+919876543210");
    expect(result.otpConfirmed).toBe(true);
    expect(merchants).toHaveLength(1);
    expect(identities).toHaveLength(1);
    expect(identities[0].identity_tier).toBe("gst_verified");
    expect(identities[0].gst_udyam_number).toBe("27AAAPL1234C1ZV");
  });

  it("successfully registers penny-drop path with baseline tier and masked VPA", async () => {
    const { db, merchants, identities } = createMockDb();
    const service = new MerchantService(db);

    const result = await service.registerIdentity({
      type: "penny_drop",
      displayName: "Chai Tapri",
      contactPhone: "+919876543211",
      bankVpa: "chaitapri@upi",
      kycAddress: "Stall 4, University Road, Pune",
    });

    expect(result.identityTier).toBe("baseline");
    expect(result.displayName).toBe("Chai Tapri");
    expect(result.contactPhone).toBe("+919876543211");
    expect(result.otpConfirmed).toBe(true);
    expect(merchants).toHaveLength(1);
    expect(identities).toHaveLength(1);
    expect(identities[0].identity_tier).toBe("baseline");
    expect(identities[0].gst_udyam_number).toBeNull();
    expect(identities[0].bank_vpa_masked).toBe("ch***@upi");
  });

  it("throws ConflictError 409 on duplicate GST number", async () => {
    const { db } = createMockDb({
      merchants: [
        { id: "m-1", display_name: "Original Shop", contact_phone: "+919876543210" },
      ],
      identities: [
        {
          id: "id-1",
          merchant_id: "m-1",
          identity_tier: "gst_verified",
          gst_udyam_number: "27AAAPL1234C1ZV",
          bank_vpa_masked: null,
          kyc_address: "Shop 1, Delhi",
          otp_confirmed: true,
        },
      ],
    });
    const service = new MerchantService(db);

    await expect(
      service.registerIdentity({
        type: "gst_udyam",
        displayName: "Fraudulent Shop",
        contactPhone: "+919999999999",
        gstUdyamNumber: "27AAAPL1234C1ZV",
        kycAddress: "Somewhere Else",
        otp: "123456",
      })
    ).rejects.toThrow(ConflictError);
  });
});

describe("MerchantService — Step 2 Reference Capture & Location Binding (Task 3 Unit Tests)", () => {
  const dummyBase64 =
    "data:image/jpeg;base64," +
    Buffer.from("simulated_qr_sticker_photo_bytes_12345").toString("base64");

  it("validates and parses photo buffer and enforces max size", () => {
    const parsed = visionService.validateAndParsePhoto(dummyBase64);
    expect(parsed.mimeType).toBe("image/jpeg");
    expect(parsed.buffer.length).toBeGreaterThan(0);

    // Unsupported MIME
    expect(() =>
      visionService.validateAndParsePhoto(
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
      )
    ).toThrow(/Unsupported image MIME type/);
  });

  it("extracts 768-dim normalized embedding and calculates cosine similarity", async () => {
    const parsed = visionService.validateAndParsePhoto(dummyBase64);
    const embedding = await visionService.extractEmbedding(
      parsed.buffer,
      parsed.mimeType
    );

    expect(embedding).toHaveLength(768);
    // Unit norm check
    const norm = Math.sqrt(embedding.reduce((acc, val) => acc + val * val, 0));
    expect(norm).toBeCloseTo(1.0, 1);

    // Self similarity is 1.0
    const sim = visionService.cosineSimilarity(embedding, embedding);
    expect(sim).toBeCloseTo(1.0, 2);
  });

  it("calculates Haversine distance and location variance correctly", async () => {
    // Distance between Gurgaon (28.4595, 77.0266) and Delhi (28.6139, 77.2090) is ~24km
    const distM = haversineDistanceMeters(28.4595, 77.0266, 28.6139, 77.209);
    expect(distM).toBeGreaterThan(20000);
    expect(distM).toBeLessThan(30000);

    // Same location is 0 distance
    const distZero = haversineDistanceMeters(28.4595, 77.0266, 28.4595, 77.0266);
    expect(distZero).toBe(0);

    // Out of radius check
    const checkOut = await geocodingService.checkLocationVariance(
      28.4595,
      77.0266,
      "Shop 12, Connaught Place, Delhi",
      5000
    );
    expect(checkOut.isVariance).toBe(true);

    // In radius check (same area)
    const checkIn = await geocodingService.checkLocationVariance(
      28.4595,
      77.0266,
      "Shop 4, Sector 14, Gurgaon",
      5000
    );
    expect(checkIn.isVariance).toBe(false);
  });

  it("successfully registers reference photo, binds location, and cleans up transient buffer", async () => {
    const { db, credentials, registeredQrs, referenceEmbeddings, storageObjects } =
      createMockDb({
        merchants: [
          {
            id: "m-100",
            display_name: "Gurgaon Canteen",
            contact_phone: "+919876543210",
          },
        ],
        identities: [
          {
            id: "id-100",
            merchant_id: "m-100",
            identity_tier: "gst_verified",
            gst_udyam_number: "06AAACG1234E1ZV",
            bank_vpa_masked: null,
            kyc_address: "Sector 14, Gurgaon, HR",
            otp_confirmed: true,
          },
        ],
      });

    const service = new MerchantService(db);

    const result = await service.registerReference("m-100", {
      qrPayload: "upi://pay?pa=gurgaon.canteen@sbi&pn=GurgaonCanteen&cu=INR",
      latitude: 28.4595,
      longitude: 77.0266,
      boundRadiusM: 100,
      photoBase64: dummyBase64,
    });

    expect(result.status).toBe("pending_activation");
    expect(result.trustTier).toBe("unverified");
    expect(result.locationVariance).toBe(false); // In Gurgaon
    expect(result.embeddingDimension).toBe(768);

    expect(credentials).toHaveLength(1);
    expect(credentials[0].status).toBe("pending_activation");
    expect(credentials[0].location_variance).toBe(false);

    expect(registeredQrs).toHaveLength(1);
    expect(registeredQrs[0].bound_radius_m).toBe(100);

    expect(referenceEmbeddings).toHaveLength(1);

    // CRITICAL REQUIREMENT: verify zero persisted photo bytes in transient storage buffer!
    expect(storageObjects).toHaveLength(0);
  });

  it("flags location_variance = true when GPS is out of radius, but allows registration to succeed", async () => {
    const { db, credentials } = createMockDb({
      merchants: [
        { id: "m-200", display_name: "Pune Stall", contact_phone: "+919876543211" },
      ],
      identities: [
        {
          id: "id-200",
          merchant_id: "m-200",
          identity_tier: "baseline",
          gst_udyam_number: null,
          bank_vpa_masked: "pu***@upi",
          kyc_address: "FC Road, Pune, Maharashtra",
          otp_confirmed: true,
        },
      ],
    });

    const service = new MerchantService(db);

    // Submitted GPS is in Delhi (~1200km away from Pune)
    const result = await service.registerReference("m-200", {
      qrPayload: "upi://pay?pa=pune.stall@upi&pn=PuneStall&cu=INR",
      latitude: 28.6139,
      longitude: 77.209,
      boundRadiusM: 100,
      photoBase64: dummyBase64,
    });

    expect(result.status).toBe("pending_activation");
    expect(result.locationVariance).toBe(true);
    expect(credentials[0].location_variance).toBe(true);
  });

  it("rejects duplicate QR payload registration with ConflictError 409", async () => {
    const qrPayload = "upi://pay?pa=claimed@upi&pn=Claimed&cu=INR";
    const crypto = await import("crypto");
    const qrHash = crypto.createHash("sha256").update(qrPayload).digest("hex");

    const { db } = createMockDb({
      merchants: [
        { id: "m-300", display_name: "Shop 2", contact_phone: "+919876543212" },
      ],
      identities: [
        {
          id: "id-300",
          merchant_id: "m-300",
          identity_tier: "baseline",
          gst_udyam_number: null,
          bank_vpa_masked: "sh***@upi",
          kyc_address: "Pune",
          otp_confirmed: true,
        },
      ],
      registeredQrs: [
        {
          id: "existing-qr-1",
          credential_id: "cred-existing",
          qr_payload_hash: qrHash,
          bound_lat: 18.5204,
          bound_lng: 73.8567,
          bound_radius_m: 100,
        },
      ],
    });

    const service = new MerchantService(db);

    await expect(
      service.registerReference("m-300", {
        qrPayload,
        latitude: 18.5204,
        longitude: 73.8567,
        boundRadiusM: 100,
        photoBase64: dummyBase64,
      })
    ).rejects.toThrow(ConflictError);
  });

  it("throws NotFoundError if merchant identity was not created first", async () => {
    const { db } = createMockDb({
      merchants: [
        { id: "m-400", display_name: "No Identity Shop", contact_phone: "+919876543213" },
      ],
      identities: [], // Empty identities
    });

    const service = new MerchantService(db);

    await expect(
      service.registerReference("m-400", {
        qrPayload: "upi://pay?pa=noidentity@upi&pn=Shop&cu=INR",
        latitude: 18.5204,
        longitude: 73.8567,
        boundRadiusM: 100,
        photoBase64: dummyBase64,
      })
    ).rejects.toThrow(NotFoundError);
  });
});

describe("POST /api/v1/merchants/register/identity (API Route)", () => {
  it("returns 400 VALIDATION_ERROR when payload is invalid", async () => {
    const res = await request(app).post("/api/v1/merchants/register/identity").send({
      type: "gst_udyam",
      displayName: "S", // too short (min 2)
      contactPhone: "invalid-phone",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toBeDefined();
  });

  it("handles duplicate GST with 409 CONFLICT and dispute pointer", async () => {
    const { merchantService } = await import("../services/merchant.service.js");
    const spy = vi
      .spyOn(merchantService, "registerIdentity")
      .mockRejectedValueOnce(
        new ConflictError(
          "This GST/Udyam number is already registered to an existing merchant credential.",
          { disputePointer: "/credential/dispute/new" }
        )
      );

    const res = await request(app).post("/api/v1/merchants/register/identity").send({
      type: "gst_udyam",
      displayName: "Duplicate Shop",
      contactPhone: "+919876543210",
      gstUdyamNumber: "27AAAPL1234C1ZV",
      kycAddress: "Market Square",
      otp: "123456",
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
    expect(res.body.error.details.disputePointer).toBe("/credential/dispute/new");
    expect(res.body.error.correlationId).toBeDefined();

    spy.mockRestore();
  });

  it("returns 201 on successful registration", async () => {
    const { merchantService } = await import("../services/merchant.service.js");
    const spy = vi.spyOn(merchantService, "registerIdentity").mockResolvedValueOnce({
      merchantId: "m-123",
      displayName: "Valid Shop",
      identityTier: "gst_verified",
      contactPhone: "+919876543210",
      kycAddress: "123 Main St",
      identityId: "id-123",
      otpConfirmed: true,
    });

    const res = await request(app).post("/api/v1/merchants/register/identity").send({
      type: "gst_udyam",
      displayName: "Valid Shop",
      contactPhone: "+919876543210",
      gstUdyamNumber: "27AAAPL1234C1ZV",
      kycAddress: "123 Main St",
      otp: "123456",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.identityTier).toBe("gst_verified");
    expect(res.body.data.merchantId).toBe("m-123");

    spy.mockRestore();
  });
});

describe("POST /api/v1/merchants/register/reference (API Route)", () => {
  const dummyBase64 =
    "data:image/jpeg;base64," + Buffer.from("sample_qr_image_bytes").toString("base64");

  it("returns 400 VALIDATION_ERROR when merchantId or payload fields are missing", async () => {
    const res = await request(app).post("/api/v1/merchants/register/reference").send({
      qrPayload: "upi://pay?pa=test@upi",
      // missing latitude, longitude, photoBase64
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when merchantId is omitted from unauthenticated body", async () => {
    const res = await request(app).post("/api/v1/merchants/register/reference").send({
      qrPayload: "upi://pay?pa=test@upi",
      latitude: 18.5204,
      longitude: 73.8567,
      photoBase64: dummyBase64,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("merchantId is required");
  });

  it("returns 201 on successful reference registration", async () => {
    const { merchantService } = await import("../services/merchant.service.js");
    const spy = vi.spyOn(merchantService, "registerReference").mockResolvedValueOnce({
      credentialId: "cred-999",
      merchantId: "550e8400-e29b-41d4-a716-446655440000",
      registeredQrId: "qr-999",
      status: "pending_activation",
      trustTier: "unverified",
      locationVariance: false,
      qrPayloadHash: "abc123hash",
      boundLocation: {
        latitude: 18.5204,
        longitude: 73.8567,
        boundRadiusM: 100,
      },
      embeddingDimension: 768,
    });

    const res = await request(app).post("/api/v1/merchants/register/reference").send({
      merchantId: "550e8400-e29b-41d4-a716-446655440000",
      qrPayload: "upi://pay?pa=test@upi",
      latitude: 18.5204,
      longitude: 73.8567,
      boundRadiusM: 100,
      photoBase64: dummyBase64,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.credentialId).toBe("cred-999");
    expect(res.body.data.status).toBe("pending_activation");
    expect(res.body.data.locationVariance).toBe(false);

    spy.mockRestore();
  });
});

describe("PaymentProofService (Unit Tests)", () => {
  it("returns verified true and ₹1.00 amount by default", async () => {
    const { paymentProofService } = await import("../services/payment-proof.service.js");
    const result = await paymentProofService.verifyVpaPossession("merchant@upi");
    expect(result.verified).toBe(true);
    expect(result.amountInr).toBe(1.0);
    expect(result.transactionRef).toContain("POP-SIM");
  });

  it("returns verified false when simulationPassed is false", async () => {
    const { paymentProofService } = await import("../services/payment-proof.service.js");
    const result = await paymentProofService.verifyVpaPossession("fake@upi", {
      simulationPassed: false,
    });
    expect(result.verified).toBe(false);
    expect(result.message).toContain("rejected");
  });
});

describe("MerchantService — Step 3 Proof-of-Possession (Unit Tests)", () => {
  it("throws NotFoundError when credential does not exist", async () => {
    const { db } = createMockDb();
    const service = new MerchantService(db);

    await expect(service.confirmProofOfPossession("non-existent-cred")).rejects.toThrow(
      NotFoundError
    );
  });

  it("transitions credential status from pending_activation to recently_registered on success", async () => {
    const { db, credentials } = createMockDb({
      credentials: [
        {
          id: "cred-123",
          merchant_id: "m-123",
          status: "pending_activation",
          trust_tier: "unverified",
          trust_score: 10,
          location_variance: false,
        },
      ],
    });
    const service = new MerchantService(db);

    const result = await service.confirmProofOfPossession("cred-123", true);

    expect(result.credentialId).toBe("cred-123");
    expect(result.status).toBe("recently_registered");
    expect(result.simulationPassed).toBe(true);
    expect(result.amountInr).toBe(1.0);

    const updatedCred = credentials.find((c) => c.id === "cred-123");
    expect(updatedCred?.status).toBe("recently_registered");
  });

  it("retains pending_activation status when simulation fails", async () => {
    const { db, credentials } = createMockDb({
      credentials: [
        {
          id: "cred-456",
          merchant_id: "m-456",
          status: "pending_activation",
          trust_tier: "unverified",
          trust_score: 10,
          location_variance: false,
        },
      ],
    });
    const service = new MerchantService(db);

    const result = await service.confirmProofOfPossession("cred-456", false);

    expect(result.credentialId).toBe("cred-456");
    expect(result.status).toBe("pending_activation");
    expect(result.simulationPassed).toBe(false);

    const currentCred = credentials.find((c) => c.id === "cred-456");
    expect(currentCred?.status).toBe("pending_activation");
  });
});

describe("POST /api/v1/merchants/register/proof-of-possession (API Route)", () => {
  it("returns 400 VALIDATION_ERROR when credentialId is missing or invalid", async () => {
    const res = await request(app)
      .post("/api/v1/merchants/register/proof-of-possession")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 200 and transitions status on successful proof-of-possession", async () => {
    const validCredId = "550e8400-e29b-41d4-a716-446655440000";
    const { merchantService } = await import("../services/merchant.service.js");
    const spy = vi
      .spyOn(merchantService, "confirmProofOfPossession")
      .mockResolvedValueOnce({
        credentialId: validCredId,
        status: "recently_registered",
        verifiedAt: new Date().toISOString(),
        amountInr: 1.0,
        simulationPassed: true,
        message: "Proof-of-possession confirmed",
      });

    const res = await request(app)
      .post("/api/v1/merchants/register/proof-of-possession")
      .send({
        credentialId: validCredId,
        simulationPassed: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.credentialId).toBe(validCredId);
    expect(res.body.data.status).toBe("recently_registered");
    expect(res.body.data.simulationPassed).toBe(true);

    spy.mockRestore();
  });

  it("returns 200 and retains pending_activation status on simulated rejection", async () => {
    const validCredId = "550e8400-e29b-41d4-a716-446655440000";
    const { merchantService } = await import("../services/merchant.service.js");
    const spy = vi
      .spyOn(merchantService, "confirmProofOfPossession")
      .mockResolvedValueOnce({
        credentialId: validCredId,
        status: "pending_activation",
        verifiedAt: new Date().toISOString(),
        amountInr: 1.0,
        simulationPassed: false,
        message: "Proof-of-possession rejected",
      });

    const res = await request(app)
      .post("/api/v1/merchants/register/proof-of-possession")
      .send({
        credentialId: validCredId,
        simulationPassed: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.credentialId).toBe(validCredId);
    expect(res.body.data.status).toBe("pending_activation");
    expect(res.body.data.simulationPassed).toBe(false);

    spy.mockRestore();
  });
});
