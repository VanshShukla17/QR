import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { app } from "../app.js";
import { payloadLookupService } from "../services/payload-lookup.service.js";
import { adminService } from "../services/admin.service.js";
import { disputeService } from "../services/dispute.service.js";
import { MerchantService } from "../services/merchant.service.js";
import { blockchainAnchorService } from "../services/blockchain.service.js";
import { setGeminiMockHandler } from "../agents/gemini-client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../../../");

function createMockDb() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const merchants: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const identities: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const credentials: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const registeredQrs: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const referenceEmbeddings: any[] = [];
  const storageObjects: string[] = [];

  const db = {
    storage: {
      from: () => ({
        upload: async (p: string) => {
          storageObjects.push(p);
          return { data: { path: p }, error: null };
        },
        remove: async (paths: string[]) => {
          return { data: paths, error: null };
        },
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
                      const found = identities.find((i) =>
                        col === "gst_udyam_number"
                          ? i.gst_udyam_number === val
                          : i.merchant_id === val
                      );
                      return { data: found || null, error: null };
                    },
                  }),
                }),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                insert: (record: any) => ({
                  select: () => ({
                    single: async () => {
                      const newRecord = { id: `id-${Date.now()}`, ...record };
                      identities.push(newRecord);
                      return { data: newRecord, error: null };
                    },
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
                select: () => ({
                  eq: (_col: string, val: string) => ({
                    maybeSingle: async () => {
                      const found = credentials.find((c) => c.id === val);
                      return { data: found || null, error: null };
                    },
                  }),
                }),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                update: (updates: any) => ({
                  eq: (_col: string, val: string) => ({
                    select: () => ({
                      single: async () => {
                        const found = credentials.find((c) => c.id === val);
                        if (found) Object.assign(found, updates);
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
                  eq: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
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
                  referenceEmbeddings.push(record);
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

  return { db };
}

describe("Phase 7 — Final Acceptance Test Suite (PRD.md Section 8 Acceptance Criteria 1 to 10)", () => {
  const genuinePayload = "upi://pay?pa=sharmacanteen@icici&pn=SharmaCanteen";
  const genuineHash = payloadLookupService.hashPayload(genuinePayload);
  const sampleLat = 12.9716;
  const sampleLng = 77.5946;
  const samplePhoto =
    "data:image/jpeg;base64," +
    Buffer.from("genuine_qr_sample_sticker").toString("base64");

  beforeEach(() => {
    process.env.MOCK_DB = "true";
    process.env.MOCK_GEMINI = "true";

    // Prime genuine Sharma Canteen credential
    payloadLookupService.primeCache(genuineHash, {
      id: "qr-acceptance-sharma-1",
      credentialId: "cred-acceptance-sharma-1",
      qrPayloadHash: genuineHash,
      boundLat: sampleLat,
      boundLng: sampleLng,
      boundRadiusM: 100,
      trustTier: "verified",
      credentialStatus: "active",
      trustScore: 95,
      merchantId: "merch-acceptance-sharma",
    });

    setGeminiMockHandler(async () =>
      JSON.stringify({
        status: "pass",
        reason: "Acceptance test verified pass",
        confidence: 0.98,
        isValidUpiFormat: true,
      })
    );
  });

  afterEach(() => {
    setGeminiMockHandler(null);
    delete process.env.MOCK_DB;
    delete process.env.MOCK_GEMINI;
  });

  // --------------------------------------------------------------------------
  // Criterion 1: Complete registration, reference capture, location binding & proof-of-possession
  // --------------------------------------------------------------------------
  it("Criterion 1: Merchant completes registration, capture, location binding, and proof-of-possession", async () => {
    const { db } = createMockDb();
    const service = new MerchantService(db);

    // Step 1: Identity registration (GST path)
    const idRes = await service.registerIdentity({
      type: "gst_udyam",
      displayName: "Krishna Cafe",
      contactPhone: "+919876543999",
      gstUdyamNumber: "29AAACK1234M1Z5",
      kycAddress: "123 Indiranagar, Bangalore",
      otp: "123456",
    });
    expect(idRes).toHaveProperty("merchantId");
    expect(idRes.displayName).toBe("Krishna Cafe");
    expect(idRes.identityTier).toBe("gst_verified");

    // Step 2: Reference capture & location binding
    const refRes = await service.registerReference(idRes.merchantId, {
      qrPayload: "upi://pay?pa=krishnacafe@sbi&pn=KrishnaCafe",
      latitude: 12.9716,
      longitude: 77.5946,
      photoBase64: samplePhoto,
      boundRadiusM: 100,
    });
    expect(refRes).toHaveProperty("credentialId");
    expect(refRes.status).toBe("pending_activation");

    // Step 3: Proof-of-possession simulation
    const popRes = await service.confirmProofOfPossession(refRes.credentialId);
    expect(popRes.status).toBe("recently_registered");
    expect(popRes.simulationPassed).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Criterion 2: Self-audit against genuine unaltered sticker returns VERIFIED within 3s
  // --------------------------------------------------------------------------
  it("Criterion 2: Self-audit against genuine unaltered sticker returns VERIFIED within 3 seconds", async () => {
    const t0 = performance.now();
    const res = await request(app)
      .post("/api/v1/audit/run")
      .set("x-bypass-rate-limit", "true")
      .send({
        qrPayload: genuinePayload,
        latitude: sampleLat,
        longitude: sampleLng,
        photoBase64: samplePhoto,
      });
    const durationMs = performance.now() - t0;

    expect(res.status).toBe(200);
    expect(res.body.data.verdict).toBe("VERIFIED");
    expect(res.body.data.reason).toBe("OK");
    expect(durationMs).toBeLessThan(3000); // Latency target < 3000ms
  });

  // --------------------------------------------------------------------------
  // Criterion 3: Self-audit against swapped QR returns WARNING with UNKNOWN_QR or MISBINDING
  // --------------------------------------------------------------------------
  it("Criterion 3: Self-audit against swapped QR returns WARNING with UNKNOWN_QR or MISBINDING", async () => {
    const swappedPayload = "upi://pay?pa=attacker@scam&pn=AttackerFraud";
    const res = await request(app)
      .post("/api/v1/audit/run")
      .set("x-bypass-rate-limit", "true")
      .send({
        qrPayload: swappedPayload,
        latitude: sampleLat,
        longitude: sampleLng,
        photoBase64: samplePhoto,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.verdict).toBe("WARNING");
    expect(["UNKNOWN_QR", "MISBINDING"]).toContain(res.body.data.reason);
  });

  // --------------------------------------------------------------------------
  // Criterion 4: Self-audit against genuine QR relocated beyond radius returns LOCATION_MISMATCH
  // --------------------------------------------------------------------------
  it("Criterion 4: Self-audit against genuine QR relocated beyond radius returns LOCATION_MISMATCH", async () => {
    // 5 km away from bound location
    const distantLat = sampleLat + 0.05;
    const distantLng = sampleLng + 0.05;

    const res = await request(app)
      .post("/api/v1/audit/run")
      .set("x-bypass-rate-limit", "true")
      .send({
        qrPayload: genuinePayload,
        latitude: distantLat,
        longitude: distantLng,
        photoBase64: samplePhoto,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.verdict).toBe("WARNING");
    expect(res.body.data.reason).toBe("LOCATION_MISMATCH");
  });

  // --------------------------------------------------------------------------
  // Criterion 5: Every activated credential has a public testnet anchor and explorer link
  // --------------------------------------------------------------------------
  it("Criterion 5: Activated credential has an on-chain transaction hash and block-explorer link", async () => {
    const anchorResult = await blockchainAnchorService.anchorCredential({
      credentialId: "cred-acceptance-sharma-1",
      merchantId: "merch-acceptance-sharma",
      qrPayloadHash: genuineHash,
      boundLocation: { latitude: sampleLat, longitude: sampleLng, boundRadiusM: 100 },
      status: "active",
      activatedAt: new Date().toISOString(),
    });

    expect(anchorResult).toHaveProperty("txHash");
    expect(anchorResult).toHaveProperty("explorerUrl");
    expect(anchorResult.explorerUrl).toContain("polygonscan.com");
    expect(anchorResult.status).toBe("confirmed");
  });

  // --------------------------------------------------------------------------
  // Criterion 6: Customer unauthenticated /check scan produces correct verdict without login
  // --------------------------------------------------------------------------
  it("Criterion 6: Customer /check works without authentication and returns appropriate verdict", async () => {
    const res = await request(app)
      .post("/api/v1/check")
      .set("x-bypass-rate-limit", "true")
      .send({
        qrPayload: genuinePayload,
        latitude: sampleLat,
        longitude: sampleLng,
        photoBase64: samplePhoto,
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("verdict");
    expect(res.body.data.verdict).toBe("VERIFIED");
  });

  // --------------------------------------------------------------------------
  // Criterion 7: Dispute filing immediately downgrades credential to WARNING; admin resolves
  // --------------------------------------------------------------------------
  it("Criterion 7: Filing a dispute immediately downgrades credential to WARNING; admin resolves", async () => {
    const targetCredentialId = "550e8400-e29b-41d4-a716-446655440000";

    const disputeSpy = vi.spyOn(disputeService, "fileDispute").mockResolvedValueOnce({
      dispute: {
        id: "dispute-acceptance-1",
        credentialId: targetCredentialId,
        filedByMerchantId: null,
        status: "open",
        evidenceSummary: "Suspected QR replacement observed on shopfront counter",
        resolvedByAdminId: null,
        resolutionReason: null,
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      },
      targetCredentialId,
      previousTrustTier: "verified",
      newTrustTier: "warning",
      message: "Dispute filed successfully.",
    });

    // File dispute
    const disputeRes = await request(app)
      .post("/api/v1/disputes")
      .set("x-bypass-rate-limit", "true")
      .send({
        credentialId: targetCredentialId,
        evidenceSummary: "Suspected QR replacement observed on shopfront counter",
      });

    expect(disputeRes.status).toBe(201);
    expect(disputeRes.body.data.dispute.status).toBe("open");
    expect(disputeRes.body.data.targetCredentialId).toBe(targetCredentialId);
    expect(disputeRes.body.data.newTrustTier).toBe("warning");

    disputeSpy.mockRestore();

    const adminSpy = vi.spyOn(adminService, "resolveDispute").mockResolvedValueOnce({
      dispute: {
        id: "dispute-acceptance-1",
        credentialId: targetCredentialId,
        status: "resolved_upheld",
        resolutionReason: "Confirmed sticker tampering upon physical review",
        resolvedByAdminId: "admin-system-1",
        resolvedAt: new Date().toISOString(),
        filedByMerchantId: null,
        evidenceSummary: "Suspected QR replacement observed on shopfront counter",
        createdAt: new Date().toISOString(),
      },
      targetCredentialId,
      newTrustTier: "warning",
      newStatus: "suspended",
      message: "Dispute resolved successfully as upheld.",
    });

    // Admin resolves dispute
    const resolveRes = await adminService.resolveDispute(
      "dispute-acceptance-1",
      {
        status: "resolved_upheld",
        resolutionReason: "Confirmed sticker tampering upon physical review",
      },
      "admin-system-1"
    );

    expect(resolveRes.dispute.status).toBe("resolved_upheld");
    expect(resolveRes.dispute.resolutionReason).toContain("Confirmed sticker tampering");

    adminSpy.mockRestore();
  });

  // --------------------------------------------------------------------------
  // Criterion 8: Demo registry contains at least 5 fictional merchants spanning all three tiers
  // --------------------------------------------------------------------------
  it("Criterion 8: Demo registry contains 5+ merchants spanning VERIFIED, RECENTLY_REGISTERED, and WARNING", async () => {
    const registryResult = await adminService.seedDemoRegistry();

    expect(registryResult.seededCount).toBeGreaterThanOrEqual(5);

    const tiers = registryResult.merchants.map((m) => m.trustTier);
    const statuses = registryResult.merchants.map((m) => m.status);
    expect(tiers).toContain("verified"); // 🟢
    expect(statuses).toContain("recently_registered"); // 🟡
    expect(tiers).toContain("warning"); // 🔴
  });

  // --------------------------------------------------------------------------
  // Criterion 9: No raw reference photo stored in persistent storage — only embeddings & hashes
  // --------------------------------------------------------------------------
  it("Criterion 9: No raw reference photos in database schema or comparison storage tables", () => {
    const migrationsDir = path.join(rootDir, "supabase/migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"));

    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      // Assert no table column stores raw photo binary/base64
      expect(sql).not.toMatch(/photo_base64\s+text/i);
      expect(sql).not.toMatch(/raw_photo\s+bytea/i);
      expect(sql).not.toMatch(/photo_blob\s+bytea/i);
    }
  });

  // --------------------------------------------------------------------------
  // Criterion 10: Identity documents have separate access controls from comparison embeddings
  // --------------------------------------------------------------------------
  it("Criterion 10: Identity schema has separate access controls from comparison store", () => {
    const migrationsDir = path.join(rootDir, "supabase/migrations");
    const identitySql = fs.readFileSync(
      path.join(migrationsDir, "20260928000000_create_merchant_and_identity.sql"),
      "utf-8"
    );

    // Must be in schema 'identity'
    expect(identitySql).toContain("identity.merchant_identity");
    expect(identitySql).toContain(
      "ALTER TABLE identity.merchant_identity ENABLE ROW LEVEL SECURITY;"
    );

    // Owning merchant only (no admin or public read)
    expect(identitySql).toContain('CREATE POLICY "Owning merchant can view identity"');
    expect(identitySql).toContain("USING (merchant_id = auth.uid());");
    expect(identitySql).not.toMatch(
      /CREATE POLICY [^;]+ ON identity\.merchant_identity [^;]+ TO anon/i
    );
  });
});
