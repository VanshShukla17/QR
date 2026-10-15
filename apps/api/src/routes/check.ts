import { Router, Request, Response, NextFunction } from "express";
import { CustomerCheckSchema } from "@qraksha/shared";

import { validateBody } from "../middleware/validate.middleware.js";
import { scanRateLimiter } from "../middleware/rate-limit.middleware.js";
import { runAgentPipeline } from "../agents/orchestrator.js";
import { supabaseAdmin, isSupabaseConfigured } from "../db/client.js";

export const checkRouter = Router();

/**
 * POST /api/v1/check
 * Public customer check endpoint (no auth required).
 * Rate-limited to 1 request per 5 seconds per client per ARCHITECTURE.md Section 6.
 * Per ARCHITECTURE.md Section 6 and TASKS.md Task 11.
 * For customers, an unregistered QR produces a non-alarming 🟡 (RECENTLY_REGISTERED / UNVERIFIED)
 * message explaining the vendor hasn't enrolled with QRaksha yet, rather than a scary red flag.
 */
checkRouter.post(
  "/",
  scanRateLimiter,
  validateBody(CustomerCheckSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { qrPayload, latitude, longitude, photoBase64 } = req.body;

      const verdictResult = await runAgentPipeline(
        qrPayload,
        latitude,
        longitude,
        photoBase64,
        {
          initiatedBy: "customer",
          correlationId: req.correlationId,
        }
      );

      // Handle the "QR not registered with QRaksha at all" case for customers
      // per PRD.md Feature: Customer Optional Check & TASKS.md Task 11
      if (verdictResult.verdict === "WARNING" && verdictResult.reason === "UNKNOWN_QR") {
        // Transform to non-alarming 🟡 message for customer pre-pay check
        res.status(200).json({
          data: {
            ...verdictResult,
            verdict: "RECENTLY_REGISTERED", // Non-alarming 🟡 for customer
            reason: "OK",
            message:
              "This merchant is not yet registered with QRaksha. This is very common for smaller vendors and does not mean the sticker is fake.",
            isUnregistered: true,
          },
        });
        return;
      }

      // Fetch verified merchant display name ONLY from the trusted database registry
      // (NEVER from the untrusted scanned QR payload)
      let merchantDisplayName: string | undefined;
      if (
        verdictResult.credentialId &&
        (verdictResult.verdict === "VERIFIED" ||
          verdictResult.verdict === "RECENTLY_REGISTERED") &&
        isSupabaseConfigured()
      ) {
        try {
          const { data: cred } = await supabaseAdmin
            .schema("comparison")
            .from("merchant_credential")
            .select("merchant_id")
            .eq("id", verdictResult.credentialId)
            .maybeSingle();

          if (cred?.merchant_id) {
            const { data: m } = await supabaseAdmin
              .from("merchant")
              .select("display_name")
              .eq("id", cred.merchant_id)
              .maybeSingle();

            merchantDisplayName = m?.display_name || undefined;
          }
        } catch {
          // Best effort non-blocking
        }
      }

      res.status(200).json({
        data: {
          ...verdictResult,
          merchantDisplayName,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
