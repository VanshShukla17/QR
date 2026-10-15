import { Request, Response, NextFunction } from "express";

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator: (req: Request) => string;
  message?: string;
  skip?: (req: Request) => boolean;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStores = new Map<string, Map<string, RateLimitRecord>>();

/**
 * Resets all rate limit stores. Useful in automated tests.
 */
export function resetRateLimitStore(): void {
  for (const store of rateLimitStores.values()) {
    store.clear();
  }
}

/**
 * Creates an in-memory rate limiting middleware per ARCHITECTURE.md Section 6 and Section 8.
 */
export function createRateLimiter(namespace: string, options: RateLimitOptions) {
  if (!rateLimitStores.has(namespace)) {
    rateLimitStores.set(namespace, new Map<string, RateLimitRecord>());
  }
  const store = rateLimitStores.get(namespace)!;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Allow bypassing rate limit via explicit test bypass header or env var
    if (
      process.env.DISABLE_RATE_LIMIT === "true" ||
      req.headers["x-bypass-rate-limit"] === "true"
    ) {
      next();
      return;
    }

    if (options.skip && options.skip(req)) {
      next();
      return;
    }

    const key = options.keyGenerator(req);
    const now = Date.now();
    const existing = store.get(key);

    if (!existing || now >= existing.resetTime) {
      store.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      next();
      return;
    }

    if (existing.count >= options.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetTime - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message:
            options.message || "Too many requests. Please wait before trying again.",
          retryAfterSeconds,
        },
      });
      return;
    }

    existing.count += 1;
    next();
  };
}

/**
 * Scan rate limiter: 1 request per 5 seconds per client (IP + session/user).
 * Protects /api/v1/audit/run and /api/v1/check per ARCHITECTURE.md Section 6.
 */
export const scanRateLimiter = createRateLimiter("scan", {
  windowMs: 5 * 1000,
  max: 1,
  keyGenerator: (req: Request) => {
    const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const clientId =
      (req.headers["x-test-client-id"] as string) ||
      req.user?.id ||
      (req.headers["x-client-session"] as string) ||
      clientIp;
    return `${clientIp}:${clientId}`;
  },
  message:
    "Scan rate limit exceeded. Please wait 5 seconds before submitting another check.",
});

/**
 * Dispute rate limiter: 3 requests per day per merchant against the same credential.
 * Protects POST /api/v1/disputes per ARCHITECTURE.md Section 6.
 */
export const disputeRateLimiter = createRateLimiter("disputes", {
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req: Request) => {
    const merchantId =
      req.user?.id ||
      req.body?.filedByMerchantId ||
      (req.headers["x-test-merchant-id"] as string) ||
      req.ip ||
      "anonymous-merchant";
    const credentialId = req.body?.credentialId || "unknown-credential";
    return `${merchantId}:${credentialId}`;
  },
  message:
    "Dispute limit reached. You can file at most 3 disputes per day against the same credential.",
});

/**
 * OTP rate limiter: max 5 attempts per phone number per 15 minutes.
 * Protects OTP endpoints per ARCHITECTURE.md Section 8.
 */
export const otpRateLimiter = createRateLimiter("otp", {
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: (req: Request) => {
    // Only apply when the request is submitting OTP / gst_udyam path or phone verification
    const isOtpPath =
      req.body?.type === "gst_udyam" ||
      Boolean(req.body?.otp) ||
      req.body?.path === "gst_otp";
    return !isOtpPath;
  },
  keyGenerator: (req: Request) => {
    const phone =
      req.body?.contactPhone ||
      req.body?.phone ||
      (req.headers["x-test-phone"] as string) ||
      req.ip ||
      "unknown-phone";
    return String(phone).trim();
  },
  message:
    "Too many OTP attempts for this phone number. Please wait 15 minutes before trying again.",
});

/**
 * Voice synthesis rate limiter: max 5 requests per 10 seconds per client.
 * Protects POST /api/v1/voice/verdict from spamming the external Sarvam API.
 */
export const voiceRateLimiter = createRateLimiter("voice", {
  windowMs: 10 * 1000,
  max: 5,
  keyGenerator: (req: Request) => {
    const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const clientId =
      (req.headers["x-test-client-id"] as string) ||
      req.user?.id ||
      (req.headers["x-client-session"] as string) ||
      clientIp;
    return `${clientIp}:${clientId}`;
  },
  message:
    "Voice synthesis rate limit exceeded. Please wait a moment before requesting audio again.",
});
