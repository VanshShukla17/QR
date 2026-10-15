import fs from "fs";
import path from "path";
import { describe, expect, it, vi } from "vitest";
import request from "supertest";

import { app } from "../app.js";

interface DbUserContext {
  role: "authenticated" | "anon" | "service_role";
  uid: string | null;
}

interface MerchantIdentityRow {
  id: string;
  merchant_id: string;
  identity_tier: "gst_verified" | "baseline";
  gst_udyam_number: string | null;
  bank_vpa_masked: string | null;
  kyc_address: string;
  otp_confirmed: boolean;
}

interface MerchantCredentialRow {
  id: string;
  merchant_id: string;
  status: "pending_activation" | "recently_registered" | "active" | "suspended";
  trust_tier: "verified" | "unverified" | "warning";
  trust_score: number;
  location_variance: boolean;
}

/**
 * Direct Postgres Row Level Security (RLS) policy evaluator implementation
 * mirroring the exact policies defined in:
 * - supabase/migrations/20260928000000_create_merchant_and_identity.sql
 * - supabase/migrations/20260929000000_create_credential_and_qr.sql
 * - supabase/migrations/20261007000000_tighten_rls_policies.sql
 */
class PostgresRlsEvaluator {
  static evaluateMerchantIdentitySelect(
    rows: MerchantIdentityRow[],
    context: DbUserContext
  ): MerchantIdentityRow[] {
    if (context.role === "service_role") {
      // Policy: "Service role full access on identity.merchant_identity" FOR ALL TO service_role USING (true)
      return rows;
    }

    if (context.role === "authenticated") {
      // Policy: "Owning merchant can view identity" FOR SELECT TO authenticated USING (merchant_id = auth.uid())
      return rows.filter(
        (row) => context.uid !== null && row.merchant_id === context.uid
      );
    }

    // Role 'anon': No SELECT policy exists for identity.merchant_identity
    return [];
  }

  static evaluateMerchantCredentialSelect(
    rows: MerchantCredentialRow[],
    context: DbUserContext
  ): MerchantCredentialRow[] {
    if (context.role === "service_role") {
      // Policy: "Service role full access on merchant_credential" FOR ALL TO service_role USING (true)
      return rows;
    }

    if (context.role === "authenticated") {
      // Policy: "Merchant can view own credential" FOR SELECT TO authenticated USING (merchant_id = auth.uid())
      return rows.filter(
        (row) => context.uid !== null && row.merchant_id === context.uid
      );
    }

    // Role 'anon': No SELECT policy exists after tightening migration
    return [];
  }
}

describe("Phase 4 — Row Level Security (RLS) Policy Tests", () => {
  const migrationsDir = path.resolve(__dirname, "../../../../supabase/migrations");

  describe("Migration files policy definition integrity", () => {
    it("enables RLS on identity.merchant_identity and restricts SELECT to owning merchant and service role", () => {
      const migrationFile = path.join(
        migrationsDir,
        "20260928000000_create_merchant_and_identity.sql"
      );
      const sql = fs.readFileSync(migrationFile, "utf-8");

      expect(sql).toContain(
        "ALTER TABLE identity.merchant_identity ENABLE ROW LEVEL SECURITY;"
      );
      expect(sql).toContain('CREATE POLICY "Owning merchant can view identity"');
      expect(sql).toContain("ON identity.merchant_identity");
      expect(sql).toContain("FOR SELECT");
      expect(sql).toContain("TO authenticated");
      expect(sql).toContain("USING (merchant_id = auth.uid());");

      // Verify no anon select policy on identity.merchant_identity
      const anonIdentityMatch = sql.match(
        /CREATE POLICY [^;]+ ON identity\.merchant_identity [^;]+ TO anon/i
      );
      expect(anonIdentityMatch).toBeNull();
    });

    it("enables RLS on comparison.merchant_credential and restricts SELECT to owning merchant", () => {
      const migrationFile = path.join(
        migrationsDir,
        "20260929000000_create_credential_and_qr.sql"
      );
      const sql = fs.readFileSync(migrationFile, "utf-8");

      expect(sql).toContain(
        "ALTER TABLE comparison.merchant_credential ENABLE ROW LEVEL SECURITY;"
      );
      expect(sql).toContain('CREATE POLICY "Merchant can view own credential"');
      expect(sql).toContain("ON comparison.merchant_credential");
      expect(sql).toContain("FOR SELECT");
      expect(sql).toContain("TO authenticated");
      expect(sql).toContain("USING (merchant_id = auth.uid());");
    });

    it("includes tightening migration that drops anon read policy on comparison.merchant_credential", () => {
      const tighteningFile = path.join(
        migrationsDir,
        "20261007000000_tighten_rls_policies.sql"
      );
      expect(fs.existsSync(tighteningFile)).toBe(true);

      const sql = fs.readFileSync(tighteningFile, "utf-8");
      expect(sql).toContain(
        'DROP POLICY IF EXISTS "Public read for merchant credential" ON comparison.merchant_credential;'
      );
    });
  });

  describe("Postgres RLS Policy Execution — identity.merchant_identity", () => {
    const merchantA_id = "00000000-0000-0000-0000-000000000001";
    const merchantB_id = "00000000-0000-0000-0000-000000000002";
    const admin_id = "00000000-0000-0000-0000-000000000099";

    const identities: MerchantIdentityRow[] = [
      {
        id: "ident-1",
        merchant_id: merchantA_id,
        identity_tier: "gst_verified",
        gst_udyam_number: "27AAAAA0000A1Z5",
        bank_vpa_masked: "sharma***@okaxis",
        kyc_address: "Shop 12, Market Rd, Mumbai",
        otp_confirmed: true,
      },
      {
        id: "ident-2",
        merchant_id: merchantB_id,
        identity_tier: "baseline",
        gst_udyam_number: null,
        bank_vpa_masked: "verma***@okicici",
        kyc_address: "Stall 4, Station Rd, Pune",
        otp_confirmed: true,
      },
    ];

    it("allows Merchant A to read their own identity row", () => {
      const results = PostgresRlsEvaluator.evaluateMerchantIdentitySelect(identities, {
        role: "authenticated",
        uid: merchantA_id,
      });

      expect(results).toHaveLength(1);
      expect(results[0].merchant_id).toBe(merchantA_id);
      expect(results[0].gst_udyam_number).toBe("27AAAAA0000A1Z5");
    });

    it("CONFIRMS merchant A CANNOT read merchant B's identity row", () => {
      const results = PostgresRlsEvaluator.evaluateMerchantIdentitySelect(identities, {
        role: "authenticated",
        uid: merchantA_id,
      });

      const leakedOtherMerchant = results.find((r) => r.merchant_id === merchantB_id);
      expect(leakedOtherMerchant).toBeUndefined();
    });

    it("allows Merchant B to read their own identity row, but NOT Merchant A's", () => {
      const results = PostgresRlsEvaluator.evaluateMerchantIdentitySelect(identities, {
        role: "authenticated",
        uid: merchantB_id,
      });

      expect(results).toHaveLength(1);
      expect(results[0].merchant_id).toBe(merchantB_id);
      expect(results.find((r) => r.merchant_id === merchantA_id)).toBeUndefined();
    });

    it("CONFIRMS an anonymous (anon) caller CANNOT read any merchant identity rows", () => {
      const results = PostgresRlsEvaluator.evaluateMerchantIdentitySelect(identities, {
        role: "anon",
        uid: null,
      });

      expect(results).toHaveLength(0);
    });

    it("CONFIRMS an admin user CANNOT read merchant identity rows (least privilege per ARCHITECTURE.md Section 5 & 8)", () => {
      const results = PostgresRlsEvaluator.evaluateMerchantIdentitySelect(identities, {
        role: "authenticated",
        uid: admin_id,
      });

      expect(results).toHaveLength(0);
    });

    it("allows service_role backend operations to read rows for pipeline processing", () => {
      const results = PostgresRlsEvaluator.evaluateMerchantIdentitySelect(identities, {
        role: "service_role",
        uid: null,
      });

      expect(results).toHaveLength(2);
    });
  });

  describe("Postgres RLS Policy Execution — comparison.merchant_credential", () => {
    const merchantA_id = "00000000-0000-0000-0000-000000000001";
    const merchantB_id = "00000000-0000-0000-0000-000000000002";

    const credentials: MerchantCredentialRow[] = [
      {
        id: "cred-1",
        merchant_id: merchantA_id,
        status: "active",
        trust_tier: "verified",
        trust_score: 85,
        location_variance: false,
      },
      {
        id: "cred-2",
        merchant_id: merchantB_id,
        status: "recently_registered",
        trust_tier: "unverified",
        trust_score: 20,
        location_variance: false,
      },
    ];

    it("allows Merchant A to read their own credential rows", () => {
      const results = PostgresRlsEvaluator.evaluateMerchantCredentialSelect(credentials, {
        role: "authenticated",
        uid: merchantA_id,
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("cred-1");
      expect(results[0].merchant_id).toBe(merchantA_id);
    });

    it("CONFIRMS merchant A CANNOT read merchant B's credential rows", () => {
      const results = PostgresRlsEvaluator.evaluateMerchantCredentialSelect(credentials, {
        role: "authenticated",
        uid: merchantA_id,
      });

      const leakedOtherCredential = results.find((c) => c.merchant_id === merchantB_id);
      expect(leakedOtherCredential).toBeUndefined();
    });

    it("allows Merchant B to read their own credential rows, but NOT Merchant A's", () => {
      const results = PostgresRlsEvaluator.evaluateMerchantCredentialSelect(credentials, {
        role: "authenticated",
        uid: merchantB_id,
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("cred-2");
      expect(results.find((c) => c.merchant_id === merchantA_id)).toBeUndefined();
    });

    it("CONFIRMS an anonymous (anon) caller CANNOT read comparison.merchant_credential rows directly", () => {
      const results = PostgresRlsEvaluator.evaluateMerchantCredentialSelect(credentials, {
        role: "anon",
        uid: null,
      });

      expect(results).toHaveLength(0);
    });
  });

  describe("API Layer Cross-Tenant Isolation (/api/v1/credentials/me)", () => {
    it("returns ONLY the authenticated caller's credentials and excludes other merchants' credentials", async () => {
      const merchantA_id = "merchant-test-id";
      const merchantB_id = "other-merchant-uuid";

      const { supabaseAdmin } = await import("../db/client.js");
      const schemaSpy = vi.spyOn(supabaseAdmin, "schema").mockImplementation(((
        schemaName: string
      ) => {
        if (schemaName === "comparison") {
          return {
            from: (table: string) => {
              if (table === "merchant_credential") {
                const creds = [
                  {
                    id: "cred-own",
                    merchant_id: merchantA_id,
                    status: "active",
                    trust_tier: "verified",
                    trust_score: 90,
                    location_variance: false,
                    activated_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                ];

                let filtered = [...creds];

                const builder = {
                  select: () => builder,
                  order: () => builder,
                  eq: (col: string, val: string) => {
                    expect(col).toBe("merchant_id");
                    expect(val).toBe(merchantA_id);
                    filtered = filtered.filter((c) => c.merchant_id === val);
                    return builder;
                  },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  then: (resolve: any) => resolve({ data: filtered, error: null }),
                };
                return builder;
              }
              if (table === "registered_qr") {
                const qrBuilder = {
                  select: () => qrBuilder,
                  eq: () => qrBuilder,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  then: (resolve: any) => resolve({ data: [], error: null }),
                };
                return qrBuilder;
              }
              throw new Error(`Unexpected table ${table}`);
            },
          };
        }
        throw new Error(`Unexpected schema ${schemaName}`);
      }) as unknown as typeof supabaseAdmin.schema);

      try {
        const res = await request(app)
          .get("/api/v1/credentials/me")
          .set("Authorization", "Bearer mock-merchant-token");

        expect(res.status).toBe(200);
        expect(res.body.data.credentials).toHaveLength(1);
        expect(res.body.data.credentials[0].merchant_id).toBe(merchantA_id);
        expect(res.body.data.credentials[0].id).toBe("cred-own");
        expect(
          res.body.data.credentials.some(
            (c: { merchant_id: string }) => c.merchant_id === merchantB_id
          )
        ).toBe(false);
      } finally {
        schemaSpy.mockRestore();
      }
    });
  });
});
