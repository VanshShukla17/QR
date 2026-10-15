import { Router, Request, Response, NextFunction } from "express";
import { AddQrSchema } from "@qraksha/shared";

import { validateBody } from "../middleware/validate.middleware.js";
import { merchantService } from "../services/merchant.service.js";
import { supabaseAdmin } from "../db/client.js";
import { NotFoundError } from "../middleware/error.middleware.js";

export const credentialsRouter = Router();

/**
 * GET /api/v1/credentials/me
 * Merchant endpoint: Returns own credentials, trust tier, and registered QR list.
 * Per ARCHITECTURE.md Section 6.
 */
credentialsRouter.get(
  "/me",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const merchantId = req.user?.id || (req.query.merchantId as string);

      let query = supabaseAdmin
        .schema("comparison")
        .from("merchant_credential")
        .select(
          `
          id,
          merchant_id,
          status,
          trust_tier,
          trust_score,
          activated_at,
          created_at
        `
        )
        .order("created_at", { ascending: false });

      if (merchantId) {
        query = query.eq("merchant_id", merchantId);
      }

      const { data: credentials, error: credError } = await query;
      if (credError) throw credError;

      // If credentials exist, enrich the first one with QRs
      const firstCred = credentials?.[0];
      let qrs: unknown[] = [];
      if (firstCred) {
        const { data: qrsData } = await supabaseAdmin
          .schema("comparison")
          .from("registered_qr")
          .select("id, qr_payload_hash, bound_lat, bound_lng, bound_radius_m, created_at")
          .eq("credential_id", firstCred.id);
        qrs = qrsData || [];
      }

      res.status(200).json({
        data: {
          credentials: credentials || [],
          activeCredential: firstCred || null,
          qrs,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/credentials/:id/qrs
 * Lists registered QR stickers for a credential.
 * Per ARCHITECTURE.md Section 6 and TASKS.md Task 12.
 */
credentialsRouter.get(
  "/:id/qrs",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawId = req.params.id;
      const credentialId = Array.isArray(rawId) ? rawId[0] : rawId;

      const { data: qrs, error } = await supabaseAdmin
        .schema("comparison")
        .from("registered_qr")
        .select("id, qr_payload_hash, bound_lat, bound_lng, bound_radius_m, created_at")
        .eq("credential_id", credentialId);

      if (error) throw error;

      res.status(200).json({
        data: qrs || [],
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/credentials/:id/qrs
 * Adds an additional QR sticker under an existing credential.
 * Inherits abbreviated ramp if credential is already verified (🟢).
 * Per ARCHITECTURE.md Section 4 & 6 and TASKS.md Task 12.
 */
credentialsRouter.post(
  "/:id/qrs",
  validateBody(AddQrSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawId = req.params.id;
      const credentialId = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!credentialId) {
        throw new NotFoundError("Credential ID is required");
      }

      const result = await merchantService.addQrToCredential(credentialId, req.body);

      res.status(201).json({
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);
