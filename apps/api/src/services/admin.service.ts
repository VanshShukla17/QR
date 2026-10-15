import crypto from "crypto";
import { supabaseAdmin, isSupabaseConfigured } from "../db/client.js";
import { NotFoundError, ValidationError } from "../middleware/error.middleware.js";
import { payloadLookupService } from "./payload-lookup.service.js";
import type {
  AdminCredentialItem,
  AdminCredentialsListResult,
  AdminDisputeItem,
  AdminDisputesListResult,
  CredentialStatus,
  Dispute,
  DisputeStatus,
  ResolveDisputeInput,
  ResolveDisputeResult,
  SeedRegistryResult,
  TrustTier,
} from "@qraksha/shared";

export class AdminService {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private db: any = supabaseAdmin
  ) {}

  /**
   * List disputes with optional status filter and pagination.
   * Per ARCHITECTURE.md Section 5 & 6, and TASKS.md Phase 3.
   */
  async listDisputes(
    filters: {
      status?: DisputeStatus;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<AdminDisputesListResult> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    let query = this.db
      .schema("comparison")
      .from("dispute")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    const {
      data: disputeRows,
      error,
      count,
    } = await query.range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to list disputes: ${error.message}`);
    }

    const total = count ?? (disputeRows?.length || 0);
    const disputes: AdminDisputeItem[] = [];

    for (const row of disputeRows || []) {
      // Fetch target credential details
      const { data: credential } = await this.db
        .schema("comparison")
        .from("merchant_credential")
        .select("id, trust_tier, status, merchant_id")
        .eq("id", row.credential_id)
        .maybeSingle();

      let targetMerchantName = "Unknown Merchant";
      let targetMerchantPhone = "";

      if (credential?.merchant_id) {
        const { data: merchant } = await this.db
          .from("merchant")
          .select("display_name, contact_phone")
          .eq("id", credential.merchant_id)
          .maybeSingle();

        if (merchant) {
          targetMerchantName = merchant.display_name;
          targetMerchantPhone = merchant.contact_phone;
        }
      }

      let filerMerchantName: string | undefined;
      if (row.filed_by_merchant_id) {
        const { data: filer } = await this.db
          .from("merchant")
          .select("display_name")
          .eq("id", row.filed_by_merchant_id)
          .maybeSingle();

        if (filer) {
          filerMerchantName = filer.display_name;
        }
      }

      disputes.push({
        id: row.id,
        credentialId: row.credential_id,
        filedByMerchantId: row.filed_by_merchant_id,
        status: row.status as DisputeStatus,
        evidenceSummary: row.evidence_summary,
        resolvedByAdminId: row.resolved_by_admin_id,
        resolutionReason: row.resolution_reason,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
        targetMerchantName,
        targetMerchantPhone,
        targetTrustTier: credential?.trust_tier as TrustTier | undefined,
        targetStatus: credential?.status as CredentialStatus | undefined,
        filerMerchantName,
      });
    }

    return {
      disputes,
      total,
      page,
      limit,
    };
  }

  /**
   * Resolve a dispute requiring a non-null resolution_reason.
   * If status == 'resolved_upheld': suspend credential, keep/set tier = WARNING.
   * If status == 'resolved_rejected': close dispute, restore credential tier.
   * Per ARCHITECTURE.md Section 4 & 5, and PRD.md Section 4.
   */
  async resolveDispute(
    disputeId: string,
    input: ResolveDisputeInput,
    adminId?: string
  ): Promise<ResolveDisputeResult> {
    if (!input.resolutionReason || input.resolutionReason.trim().length < 5) {
      throw new ValidationError(
        "A non-empty resolutionReason of at least 5 characters is required."
      );
    }

    // 1. Fetch dispute
    const { data: disputeRow, error: disputeError } = await this.db
      .schema("comparison")
      .from("dispute")
      .select("*")
      .eq("id", disputeId)
      .maybeSingle();

    if (disputeError || !disputeRow) {
      throw new NotFoundError(`Dispute ${disputeId} not found`);
    }

    // 2. Fetch target credential
    const { data: credential, error: credError } = await this.db
      .schema("comparison")
      .from("merchant_credential")
      .select("id, trust_tier, status, trust_score")
      .eq("id", disputeRow.credential_id)
      .maybeSingle();

    if (credError || !credential) {
      throw new NotFoundError(`Target credential ${disputeRow.credential_id} not found`);
    }

    let newTrustTier: TrustTier;
    let newStatus: CredentialStatus;

    if (input.status === "resolved_upheld") {
      newTrustTier = "warning";
      newStatus = "suspended";
    } else {
      // Resolved rejected: dispute dismissed, restore standing
      newTrustTier = credential.trust_score >= 60 ? "verified" : "unverified";
      newStatus = "active";
    }

    // 3. Update target credential
    const { error: updateCredError } = await this.db
      .schema("comparison")
      .from("merchant_credential")
      .update({
        trust_tier: newTrustTier,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", credential.id);

    if (updateCredError) {
      throw new Error(`Failed to update target credential: ${updateCredError.message}`);
    }

    // Invalidate in-memory cache for all QRs of this credential
    payloadLookupService.invalidateCredential(credential.id);

    // 4. Update dispute record
    const resolvedAt = new Date().toISOString();
    const resolvedByAdminId = adminId || "admin-system";

    const { data: updatedDispute, error: updateDisputeError } = await this.db
      .schema("comparison")
      .from("dispute")
      .update({
        status: input.status,
        resolution_reason: input.resolutionReason,
        resolved_by_admin_id: resolvedByAdminId,
        resolved_at: resolvedAt,
      })
      .eq("id", disputeId)
      .select("*")
      .single();

    if (updateDisputeError || !updatedDispute) {
      throw new Error(`Failed to update dispute record: ${updateDisputeError?.message}`);
    }

    const dispute: Dispute = {
      id: updatedDispute.id,
      credentialId: updatedDispute.credential_id,
      filedByMerchantId: updatedDispute.filed_by_merchant_id,
      status: updatedDispute.status as DisputeStatus,
      evidenceSummary: updatedDispute.evidence_summary,
      resolvedByAdminId: updatedDispute.resolved_by_admin_id,
      resolutionReason: updatedDispute.resolution_reason,
      createdAt: updatedDispute.created_at,
      resolvedAt: updatedDispute.resolved_at,
    };

    const message =
      input.status === "resolved_upheld"
        ? "Dispute upheld. Target credential has been suspended and flagged with WARNING."
        : "Dispute rejected. Target credential standing has been restored.";

    return {
      dispute,
      targetCredentialId: credential.id,
      newTrustTier,
      newStatus,
      message,
    };
  }

  /**
   * Search and filter full credential registry (metadata only, no PII).
   * Per ARCHITECTURE.md Section 5 (Admin role does NOT get raw identity documents),
   * Section 6, and TASKS.md Phase 3.
   */
  async listCredentials(
    filters: {
      search?: string;
      trustTier?: TrustTier;
      status?: CredentialStatus;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<AdminCredentialsListResult> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    let credQuery = this.db
      .schema("comparison")
      .from("merchant_credential")
      .select(
        "id, merchant_id, status, trust_tier, trust_score, activated_at, created_at",
        {
          count: "exact",
        }
      )
      .order("created_at", { ascending: false });

    if (filters.trustTier) {
      credQuery = credQuery.eq("trust_tier", filters.trustTier);
    }
    if (filters.status) {
      credQuery = credQuery.eq("status", filters.status);
    }

    const { data: credRows, error: credError, count } = await credQuery;

    if (credError) {
      throw new Error(`Failed to query credentials: ${credError.message}`);
    }

    const items: AdminCredentialItem[] = [];

    for (const cred of credRows || []) {
      // 1. Fetch merchant metadata
      const { data: merchant } = await this.db
        .from("merchant")
        .select("display_name, contact_phone")
        .eq("id", cred.merchant_id)
        .maybeSingle();

      const merchantName = merchant?.display_name || "Unknown Merchant";
      const contactPhone = merchant?.contact_phone;

      // Filter by search string if provided
      if (filters.search && filters.search.trim().length > 0) {
        const q = filters.search.toLowerCase().trim();
        const matchesName = merchantName.toLowerCase().includes(q);
        const matchesPhone = contactPhone?.toLowerCase().includes(q);
        const matchesId = cred.id.toLowerCase().includes(q);

        if (!matchesName && !matchesPhone && !matchesId) {
          continue;
        }
      }

      // 2. Fetch identity tier (metadata only, no GST or bank account number)
      const { data: identity } = await this.db
        .schema("identity")
        .from("merchant_identity")
        .select("identity_tier")
        .eq("merchant_id", cred.merchant_id)
        .maybeSingle();

      // 3. Count registered QRs
      const { data: qrs } = await this.db
        .schema("comparison")
        .from("registered_qr")
        .select("id")
        .eq("credential_id", cred.id);

      // 4. Fetch latest blockchain anchor
      const { data: anchor } = await this.db
        .schema("comparison")
        .from("blockchain_anchor")
        .select("status, tx_hash")
        .eq("credential_id", cred.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      items.push({
        id: cred.id,
        merchantId: cred.merchant_id,
        merchantName,
        contactPhone,
        identityTier: identity?.identity_tier,
        status: cred.status as CredentialStatus,
        trustTier: cred.trust_tier as TrustTier,
        trustScore: cred.trust_score ?? 0,
        qrCount: qrs?.length || 0,
        activatedAt: cred.activated_at,
        createdAt: cred.created_at,
        latestAnchorStatus: anchor?.status || null,
        latestAnchorTxHash: anchor?.tx_hash || null,
      });
    }

    const paginatedItems = items.slice(offset, offset + limit);

    return {
      credentials: paginatedItems,
      total: count ?? items.length,
      page,
      limit,
    };
  }

  /**
   * Seed the demo merchant registry with 7 realistic pilot merchants
   * spanning green, yellow, and red tiers per PRD.md Section 4 & 5.
   */
  async seedDemoRegistry(): Promise<SeedRegistryResult> {
    const demoMerchants = [
      {
        displayName: "Sharma Canteen",
        contactPhone: "+919876543210",
        identityTier: "gst_verified" as const,
        kycAddress: "Shop 4, Campus Student Center, Bengaluru, Karnataka 560001",
        status: "active" as const,
        trustTier: "verified" as const,
        trustScore: 96,
        activatedDaysAgo: 21,
        qrs: [
          {
            payload:
              "upi://pay?pa=sharmacanteen@okaxis&pn=Sharma%20Canteen&mc=5499&aid=uGICAgICAgICAgA",
            lat: 12.9716,
            lng: 77.5946,
            radiusM: 100,
          },
        ],
        anchorStatus: "confirmed" as const,
        anchorTxHash:
          "0x4a18f8e219082348cda90812349081234a908123490812349081234908123401",
      },
      {
        displayName: "ABC Petrol Pump",
        contactPhone: "+919876543211",
        identityTier: "gst_verified" as const,
        kycAddress: "Plot 12, Outer Ring Road, Bellandur, Bengaluru, Karnataka 560103",
        status: "active" as const,
        trustTier: "verified" as const,
        trustScore: 88,
        activatedDaysAgo: 12,
        qrs: [
          {
            payload:
              "upi://pay?pa=abcpetrolpump1@okhdfcbank&pn=ABC%20Petrol%20Pump%20D1&mc=5541",
            lat: 12.926,
            lng: 77.6762,
            radiusM: 150,
          },
          {
            payload:
              "upi://pay?pa=abcpetrolpump2@okhdfcbank&pn=ABC%20Petrol%20Pump%20D2&mc=5541",
            lat: 12.9261,
            lng: 77.6764,
            radiusM: 150,
          },
        ],
        anchorStatus: "confirmed" as const,
        anchorTxHash:
          "0x4a18f8e219082348cda90812349081234a908123490812349081234908123402",
      },
      {
        displayName: "Fresh Bites Quick Snacks",
        contactPhone: "+919876543212",
        identityTier: "baseline" as const,
        kycAddress:
          "Kiosk 2, Metro Station Plaza, Indiranagar, Bengaluru, Karnataka 560038",
        status: "recently_registered" as const,
        trustTier: "unverified" as const,
        trustScore: 24,
        activatedDaysAgo: 2,
        qrs: [
          {
            payload: "upi://pay?pa=freshbites@oksbi&pn=Fresh%20Bites&mc=5814",
            lat: 12.9784,
            lng: 77.6408,
            radiusM: 80,
          },
        ],
        anchorStatus: "confirmed" as const,
        anchorTxHash:
          "0x4a18f8e219082348cda90812349081234a908123490812349081234908123403",
      },
      {
        displayName: "Campus Cafe & Bakery",
        contactPhone: "+919876543213",
        identityTier: "gst_verified" as const,
        kycAddress: "Academic Block A, Engineering Campus, Bengaluru, Karnataka 560064",
        status: "active" as const,
        trustTier: "unverified" as const,
        trustScore: 45,
        activatedDaysAgo: 5,
        qrs: [
          {
            payload: "upi://pay?pa=campuscafe@okicici&pn=Campus%20Cafe&mc=5812",
            lat: 13.028,
            lng: 77.5696,
            radiusM: 100,
          },
        ],
        anchorStatus: "confirmed" as const,
        anchorTxHash:
          "0x4a18f8e219082348cda90812349081234a908123490812349081234908123404",
      },
      {
        displayName: "City Parking Stand",
        contactPhone: "+919876543214",
        identityTier: "baseline" as const,
        kycAddress: "MG Road Public Parking Lot, Bengaluru, Karnataka 560001",
        status: "active" as const,
        trustTier: "warning" as const,
        trustScore: 30,
        activatedDaysAgo: 8,
        qrs: [
          {
            payload: "upi://pay?pa=cityparking@okaxis&pn=City%20Parking&mc=7523",
            lat: 12.9752,
            lng: 77.6094,
            radiusM: 120,
          },
        ],
        anchorStatus: "confirmed" as const,
        anchorTxHash:
          "0x4a18f8e219082348cda90812349081234a908123490812349081234908123405",
        disputeEvidence:
          "Reported sticker relocation: QR code found pasted on third-party vehicle 2.4km away from registered parking lot entrance.",
      },
      {
        displayName: "Metro Chai Point",
        contactPhone: "+919876543215",
        identityTier: "baseline" as const,
        kycAddress: "Near Gate 1, Majestic Metro, Bengaluru, Karnataka 560009",
        status: "active" as const,
        trustTier: "unverified" as const,
        trustScore: 32,
        activatedDaysAgo: 3,
        qrs: [
          {
            payload: "upi://pay?pa=metrochai@okpaytm&pn=Metro%20Chai%20Point&mc=5499",
            lat: 12.9767,
            lng: 77.5713,
            radiusM: 50,
          },
        ],
        anchorStatus: "pending" as const,
        anchorTxHash: null,
      },
      {
        displayName: "Quick Xerox & Stationery",
        contactPhone: "+919876543216",
        identityTier: "gst_verified" as const,
        kycAddress: "Opposite Library, University Campus, Bengaluru, Karnataka 560056",
        status: "active" as const,
        trustTier: "verified" as const,
        trustScore: 82,
        activatedDaysAgo: 10,
        qrs: [
          {
            payload: "upi://pay?pa=quickxerox@okhdfcbank&pn=Quick%20Xerox&mc=5943",
            lat: 12.9345,
            lng: 77.505,
            radiusM: 80,
          },
        ],
        anchorStatus: "confirmed" as const,
        anchorTxHash:
          "0x4a18f8e219082348cda90812349081234a908123490812349081234908123407",
      },
    ];

    const seededList: Array<{
      name: string;
      credentialId: string;
      trustTier: TrustTier;
      status: CredentialStatus;
    }> = [];

    if (!isSupabaseConfigured()) {
      for (const m of demoMerchants) {
        for (const qr of m.qrs) {
          const qrPayloadHash = payloadLookupService.hashPayload(qr.payload);
          payloadLookupService.primeCache(qrPayloadHash, {
            id: `qr-${m.displayName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
            credentialId: `cred-${m.displayName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
            qrPayloadHash,
            boundLat: qr.lat,
            boundLng: qr.lng,
            boundRadiusM: qr.radiusM,
            trustTier: m.trustTier,
            credentialStatus: m.status,
            trustScore: m.trustScore,
            merchantId: `merch-${m.displayName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          });
        }
        seededList.push({
          name: m.displayName,
          credentialId: `cred-${m.displayName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          trustTier: m.trustTier,
          status: m.status,
        });
      }
      return {
        message: "Successfully primed demo registry in mock environment",
        seededCount: seededList.length,
        merchants: seededList,
      };
    }

    // Synthesize dummy 768-dim normalized embedding for reference records
    const dummyEmbedding = new Array(768).fill(0.036);

    for (const m of demoMerchants) {
      // 1. Find or create merchant
      const { data: existingMerchant } = await this.db
        .from("merchant")
        .select("id")
        .eq("contact_phone", m.contactPhone)
        .maybeSingle();

      let merchantId = existingMerchant?.id;

      if (!merchantId) {
        const { data: newMerchant, error: mError } = await this.db
          .from("merchant")
          .insert({
            display_name: m.displayName,
            contact_phone: m.contactPhone,
          })
          .select("id")
          .single();

        if (mError) throw mError;
        merchantId = newMerchant.id;
      }

      // 2. Upsert identity
      const { data: existingIdentity } = await this.db
        .schema("identity")
        .from("merchant_identity")
        .select("id")
        .eq("merchant_id", merchantId)
        .maybeSingle();

      if (!existingIdentity) {
        await this.db
          .schema("identity")
          .from("merchant_identity")
          .insert({
            merchant_id: merchantId,
            identity_tier: m.identityTier,
            gst_udyam_number:
              m.identityTier === "gst_verified"
                ? `29AAACP${Math.floor(1000 + Math.random() * 9000)}M1Z5`
                : null,
            bank_vpa_masked: `${m.displayName.toLowerCase().replace(/[^a-z]/g, "")}***@bank`,
            kyc_address: m.kycAddress,
            otp_confirmed: true,
          });
      }

      // 3. Upsert credential
      const activatedAt = new Date(
        Date.now() - m.activatedDaysAgo * 86400000
      ).toISOString();
      const { data: existingCred } = await this.db
        .schema("comparison")
        .from("merchant_credential")
        .select("id")
        .eq("merchant_id", merchantId)
        .maybeSingle();

      let credentialId = existingCred?.id;

      if (!credentialId) {
        const { data: newCred, error: credErr } = await this.db
          .schema("comparison")
          .from("merchant_credential")
          .insert({
            merchant_id: merchantId,
            status: m.status,
            trust_tier: m.trustTier,
            trust_score: m.trustScore,
            activated_at: activatedAt,
          })
          .select("id")
          .single();

        if (credErr) throw credErr;
        credentialId = newCred.id;
      } else {
        // Update existing credential standing
        await this.db
          .schema("comparison")
          .from("merchant_credential")
          .update({
            status: m.status,
            trust_tier: m.trustTier,
            trust_score: m.trustScore,
            activated_at: activatedAt,
          })
          .eq("id", credentialId);
      }

      // 4. Seed registered QRs
      for (const qr of m.qrs) {
        const qrHash = crypto.createHash("sha256").update(qr.payload).digest("hex");

        const { data: existingQr } = await this.db
          .schema("comparison")
          .from("registered_qr")
          .select("id")
          .eq("qr_payload_hash", qrHash)
          .maybeSingle();

        let registeredQrId = existingQr?.id;

        if (!registeredQrId) {
          const { data: newQr } = await this.db
            .schema("comparison")
            .from("registered_qr")
            .insert({
              credential_id: credentialId,
              qr_payload_hash: qrHash,
              bound_lat: qr.lat,
              bound_lng: qr.lng,
              bound_radius_m: qr.radiusM,
            })
            .select("id")
            .single();

          registeredQrId = newQr?.id;

          if (registeredQrId) {
            await this.db.schema("comparison").from("reference_embedding").insert({
              registered_qr_id: registeredQrId,
              embedding: dummyEmbedding,
            });
          }
        }

        // Cache lookup entry
        payloadLookupService.setCache(qrHash, {
          id: registeredQrId || "mock-qr-id",
          credentialId,
          qrPayloadHash: qrHash,
          boundLat: qr.lat,
          boundLng: qr.lng,
          boundRadiusM: qr.radiusM,
          merchantId,
          credentialStatus: m.status,
          trustTier: m.trustTier,
          trustScore: m.trustScore,
        });
      }

      // 5. Seed blockchain anchor
      const { data: existingAnchor } = await this.db
        .schema("comparison")
        .from("blockchain_anchor")
        .select("id")
        .eq("credential_id", credentialId)
        .maybeSingle();

      if (!existingAnchor) {
        const canonicalHash = crypto
          .createHash("sha256")
          .update(`anchor-${credentialId}`)
          .digest("hex");
        await this.db
          .schema("comparison")
          .from("blockchain_anchor")
          .insert({
            credential_id: credentialId,
            tx_hash: m.anchorTxHash,
            network: "amoy",
            status: m.anchorStatus,
            credential_hash: `0x${canonicalHash}`,
            submitted_at: activatedAt,
            confirmed_at: m.anchorStatus === "confirmed" ? activatedAt : null,
          });
      }

      // 6. If City Parking Stand, attach an open dispute
      if ("disputeEvidence" in m && m.disputeEvidence) {
        const { data: existingDispute } = await this.db
          .schema("comparison")
          .from("dispute")
          .select("id")
          .eq("credential_id", credentialId)
          .eq("status", "open")
          .maybeSingle();

        if (!existingDispute) {
          await this.db.schema("comparison").from("dispute").insert({
            credential_id: credentialId,
            status: "open",
            evidence_summary: m.disputeEvidence,
          });
        }
      }

      seededList.push({
        name: m.displayName,
        credentialId,
        trustTier: m.trustTier,
        status: m.status,
      });
    }

    return {
      message:
        "Demo merchant registry seeded successfully with 7 fictional pilot merchants.",
      seededCount: seededList.length,
      merchants: seededList,
    };
  }
}

export const adminService = new AdminService();
