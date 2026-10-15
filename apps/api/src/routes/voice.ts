import { Router, Request, Response, NextFunction } from "express";
import { VoiceVerdictInputSchema } from "@qraksha/shared";

import { validateBody } from "../middleware/validate.middleware.js";
import { voiceRateLimiter } from "../middleware/rate-limit.middleware.js";
import { voiceService } from "../services/voice.service.js";

export const voiceRouter = Router();

/**
 * POST /api/v1/voice/verdict
 * Synthesizes or retrieves cached Indic audio verdict (en-IN, hi-IN, kn-IN).
 * Rate-limited per client to protect Sarvam API quota.
 * Privacy boundary is strictly enforced on all outgoing requests.
 */
voiceRouter.post(
  "/verdict",
  voiceRateLimiter,
  validateBody(VoiceVerdictInputSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { verdict, lang, merchantDisplayName } = req.body;

      const result = await voiceService.getVerdictAudio(
        verdict,
        lang,
        merchantDisplayName,
        req.correlationId
      );

      res.status(200).json({
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);
