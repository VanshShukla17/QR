import { Router, Request, Response, NextFunction } from "express";
import type { VerifyCredentialResult } from "@qraksha/shared";
import { supabaseAdmin } from "../db/client.js";
import { NotFoundError, ValidationError } from "../middleware/error.middleware.js";
import {
  blockchainService,
  computeCanonicalCredentialHash,
  CanonicalCredentialData,
} from "../services/blockchain.service.js";

export const verifyRouter = Router();

/**
 * GET /api/v1/verify/:credentialId
 * Public endpoint: Returns public credential summary + on-chain anchor verification.
 * Per ARCHITECTURE.md Section 6 and TASKS.md Task 6.
 */
verifyRouter.get(
  "/:credentialId",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawCredentialId = req.params.credentialId;
      const credentialId = Array.isArray(rawCredentialId)
        ? rawCredentialId[0]
        : rawCredentialId;

      if (!credentialId || credentialId.trim().length === 0) {
        throw new ValidationError("credentialId parameter is required");
      }

      // 1. Fetch credential
      const { data: cred, error: credError } = await supabaseAdmin
        .schema("comparison")
        .from("merchant_credential")
        .select("id, merchant_id, status, trust_tier, trust_score, activated_at")
        .eq("id", credentialId)
        .maybeSingle();

      if (credError) {
        throw credError;
      }
      if (!cred) {
        throw new NotFoundError(`Merchant credential ${credentialId} not found`);
      }

      // 2. Fetch merchant display name
      const { data: merchant } = await supabaseAdmin
        .from("merchant")
        .select("display_name")
        .eq("id", cred.merchant_id)
        .maybeSingle();

      // 3. Fetch primary registered QR
      const { data: qr } = await supabaseAdmin
        .schema("comparison")
        .from("registered_qr")
        .select("qr_payload_hash, bound_lat, bound_lng, bound_radius_m")
        .eq("credential_id", credentialId)
        .maybeSingle();

      // 4. Fetch latest blockchain anchor
      const anchor = await blockchainService.getLatestAnchor(credentialId);

      // 5. Recompute canonical credential hash locally
      const canonicalData: CanonicalCredentialData = {
        credentialId: cred.id,
        merchantId: cred.merchant_id,
        qrPayloadHash: qr?.qr_payload_hash || "none",
        boundLocation: {
          latitude: qr?.bound_lat ?? 0,
          longitude: qr?.bound_lng ?? 0,
          boundRadiusM: qr?.bound_radius_m ?? 100,
        },
        status: cred.status,
        activatedAt: cred.activated_at || null,
      };

      const canonicalCredentialHash = computeCanonicalCredentialHash(canonicalData);

      // 6. Check on-chain hash match
      const verifiedOnChain =
        anchor?.status === "confirmed" &&
        Boolean(anchor.credentialHash) &&
        anchor.credentialHash.toLowerCase() === canonicalCredentialHash.toLowerCase();

      const result: VerifyCredentialResult = {
        credentialId: cred.id,
        merchantId: cred.merchant_id,
        displayName: merchant?.display_name || "Registered Merchant",
        status: cred.status,
        trustTier: cred.trust_tier,
        trustScore: cred.trust_score,
        activatedAt: cred.activated_at,
        boundLocation: qr
          ? {
              latitude: qr.bound_lat,
              longitude: qr.bound_lng,
              boundRadiusM: qr.bound_radius_m,
            }
          : undefined,
        canonicalCredentialHash,
        anchor,
        verifiedOnChain,
      };

      res.status(200).json({
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);
