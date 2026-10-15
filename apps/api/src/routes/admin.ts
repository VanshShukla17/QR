import { Router, Request, Response, NextFunction } from "express";
import {
  CredentialStatus,
  DisputeStatus,
  ResolveDisputeSchema,
  TrustTier,
} from "@qraksha/shared";

import { validateBody } from "../middleware/validate.middleware.js";
import { requireAdmin } from "../middleware/auth.middleware.js";
import { adminService } from "../services/admin.service.js";
import { ValidationError } from "../middleware/error.middleware.js";

export const adminRouter = Router();

// Protect all admin endpoints with requireAdmin middleware per ARCHITECTURE.md Section 6 & 7
adminRouter.use(requireAdmin);

/**
 * GET /api/v1/admin/disputes
 * Admin disputes queue: List open and historical disputes.
 * Per ARCHITECTURE.md Section 6 and TASKS.md Phase 3.
 */
adminRouter.get(
  "/disputes",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status =
        typeof req.query.status === "string"
          ? (req.query.status as DisputeStatus)
          : undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await adminService.listDisputes({
        status,
        page,
        limit,
      });

      res.status(200).json({
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/disputes/:id
 * Admin dispute resolution: Upheld (suspend) or Rejected (restore) with non-null reason.
 * Per ARCHITECTURE.md Section 5 & 6, and TASKS.md Phase 3.
 */
adminRouter.patch(
  "/disputes/:id",
  validateBody(ResolveDisputeSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawDisputeId = req.params.id;
      const disputeId = Array.isArray(rawDisputeId) ? rawDisputeId[0] : rawDisputeId;

      if (!disputeId) {
        throw new ValidationError("disputeId parameter is required");
      }

      const adminId = req.user?.id || "admin-system";
      const result = await adminService.resolveDispute(disputeId, req.body, adminId);

      res.status(200).json({
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/credentials
 * Admin credential registry search/filter (metadata only, no PII).
 * Per ARCHITECTURE.md Section 5 & 6, and TASKS.md Phase 3.
 */
adminRouter.get(
  "/credentials",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const search = req.query.search as string | undefined;
      const trustTier =
        typeof req.query.trustTier === "string"
          ? (req.query.trustTier as TrustTier)
          : undefined;
      const status =
        typeof req.query.status === "string"
          ? (req.query.status as CredentialStatus)
          : undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await adminService.listCredentials({
        search,
        trustTier,
        status,
        page,
        limit,
      });

      res.status(200).json({
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/registry/seed
 * Demo registry seeding endpoint: seeds 5-10 fictional merchants.
 * Per ARCHITECTURE.md Section 6, PRD.md Section 4, and TASKS.md Phase 3.
 */
adminRouter.post(
  "/registry/seed",
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminService.seedDemoRegistry();

      res.status(200).json({
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);
