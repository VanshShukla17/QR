import { Router, Request, Response, NextFunction } from "express";
import { CreateDisputeSchema } from "@qraksha/shared";

import { validateBody } from "../middleware/validate.middleware.js";
import { disputeRateLimiter } from "../middleware/rate-limit.middleware.js";
import { disputeService } from "../services/dispute.service.js";

export const disputesRouter = Router();

/**
 * POST /api/v1/disputes
 * Merchant or public dispute filing against a target credential.
 * Rate-limited to 3 per day per merchant against the same credential per ARCHITECTURE.md Section 6.
 * Automatically downgrades the target credential to 🔴 WARNING pending admin review,
 * per ARCHITECTURE.md Section 4 & 6, and TASKS.md Task 13.
 */
disputesRouter.post(
  "/",
  disputeRateLimiter,
  validateBody(CreateDisputeSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const merchantId = (req as any).user?.id || req.body.filedByMerchantId;

      const result = await disputeService.fileDispute(
        {
          credentialId: req.body.credentialId,
          evidenceSummary: req.body.evidenceSummary,
        },
        merchantId
      );

      res.status(201).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);
