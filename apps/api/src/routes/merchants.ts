import { Router, type Request, type Response } from "express";

import { RegisterIdentityRequestSchema } from "@qraksha/shared";
import { ConflictError, registerMerchantIdentity } from "../services/identity.service.js";

export const merchantsRouter = Router();

merchantsRouter.post(
  "/register/identity",
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = RegisterIdentityRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          details: parseResult.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
      });
      return;
    }

    try {
      const result = await registerMerchantIdentity(parseResult.data);
      res.status(201).json({
        data: result,
      });
    } catch (err) {
      if (err instanceof ConflictError) {
        res.status(409).json({
          error: {
            code: "CONFLICT",
            message: err.message,
            disputeUrl: err.disputeUrl,
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to register merchant identity",
        },
      });
    }
  }
);
