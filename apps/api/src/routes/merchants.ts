import { Router, Request, Response, NextFunction } from "express";
import {
  RegisterIdentitySchema,
  RegisterReferenceSchema,
  ProofOfPossessionSchema,
} from "@qraksha/shared";

import { validateBody } from "../middleware/validate.middleware.js";
import { otpRateLimiter } from "../middleware/rate-limit.middleware.js";
import { ValidationError } from "../middleware/error.middleware.js";

import { merchantService } from "../services/merchant.service.js";

export const merchantRouter = Router();

/**
 * POST /api/v1/merchants/register/identity
 * Public endpoint to start merchant registration via GST/Udyam+OTP or VPA penny-drop.
 * Rate-limited to max 5 OTP attempts per phone number per 15 minutes per ARCHITECTURE.md Section 8.
 * Per ARCHITECTURE.md Section 6 and PRD.md Section 4 (Feature: Merchant Registration).
 */
merchantRouter.post(
  "/register/identity",
  otpRateLimiter,
  validateBody(RegisterIdentitySchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await merchantService.registerIdentity(req.body);
      res.status(201).json({
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/merchants/register/reference
 * Uploads reference photo & GPS, extracts embedding synchronously,
 * deletes photo immediately, binds to geocoded KYC address,
 * and creates credential + registered_qr + reference_embedding.
 * Per ARCHITECTURE.md Section 6 and PRD.md Section 4 (Feature: Reference Capture & Location Binding).
 */
merchantRouter.post(
  "/register/reference",
  validateBody(RegisterReferenceSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const merchantId = req.user?.id || req.body.merchantId;
      if (!merchantId) {
        throw new ValidationError("merchantId is required for reference registration");
      }

      const result = await merchantService.registerReference(merchantId, req.body);
      res.status(201).json({
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/merchants/register/proof-of-possession
 * Confirms ₹1 proof-of-possession micro-transaction.
 * Transitions credential status from pending_activation to recently_registered.
 * Per ARCHITECTURE.md Section 6 and PRD.md Section 4 (Feature: Proof-of-Possession Micro-Transaction).
 */
merchantRouter.post(
  "/register/proof-of-possession",
  validateBody(ProofOfPossessionSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await merchantService.confirmProofOfPossession(
        req.body.credentialId,
        req.body.simulationPassed
      );
      res.status(200).json({
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/merchants/:id/stats
 * Returns canonical merchant stats from comparison.get_merchant_stats SQL function.
 * Single source of truth for active QRs and clean audits.
 */
merchantRouter.get(
  "/:id/stats",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const merchantId = String(req.params.id);
      const stats = await merchantService.getMerchantStats(merchantId);
      res.status(200).json({
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }
);
