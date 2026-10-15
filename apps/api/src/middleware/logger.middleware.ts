import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  correlationId: string;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

const PII_KEYS = [
  "gstudyamnumber",
  "gst_udyam_number",
  "gst",
  "bankvpa",
  "bank_vpa",
  "bankvpamasked",
  "bank_vpa_masked",
  "vpa",
  "photobase64",
  "photo_base64",
  "photo",
  "password",
  "secret",
  "privatekey",
  "private_key",
  "chainprivatekey",
  "chain_private_key",
];

/**
 * Recursively scrubs PII and secret values from log metadata
 * per ARCHITECTURE.md Section 8 and AGENTS.md Rule 8.
 */
export function sanitizeLogMeta<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    // Redact base64 image strings if accidentally passed
    if (
      obj.startsWith("data:image/") ||
      (obj.length > 500 && /^[A-Za-z0-9+/=]+$/.test(obj))
    ) {
      return "[PHOTO_BYTES_REDACTED]" as unknown as T;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeLogMeta(item)) as unknown as T;
  }

  if (typeof obj === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      const isSensitive = PII_KEYS.some((pk) => lowerKey.includes(pk));
      if (isSensitive) {
        sanitized[key] = "[REDACTED_PII]";
      } else {
        sanitized[key] = sanitizeLogMeta(value);
      }
    }
    return sanitized as unknown as T;
  }

  return obj;
}

class StructuredLogger {
  log(
    level: LogLevel,
    message: string,
    correlationId?: string,
    meta?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      level,
      correlationId: correlationId || crypto.randomUUID(),
      message,
      timestamp: new Date().toISOString(),
      ...sanitizeLogMeta(meta || {}),
    };

    const serialized = JSON.stringify(entry);

    if (level === "error") {
      console.error(serialized);
    } else if (level === "warn") {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  }

  info(message: string, correlationId?: string, meta?: Record<string, unknown>): void {
    this.log("info", message, correlationId, meta);
  }

  warn(message: string, correlationId?: string, meta?: Record<string, unknown>): void {
    this.log("warn", message, correlationId, meta);
  }

  error(message: string, correlationId?: string, meta?: Record<string, unknown>): void {
    this.log("error", message, correlationId, meta);
  }
}

export const logger = new StructuredLogger();

/**
 * Express middleware to tag requests with correlation IDs and log request completions.
 * Per ARCHITECTURE.md Section 12.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const correlationId =
    (req.headers["x-correlation-id"] as string) || crypto.randomUUID();
  req.correlationId = correlationId;
  res.setHeader("X-Correlation-Id", correlationId);

  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;

    logger.info("HTTP Request Completed", correlationId, {
      type: "http_request",
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      durationMs,
    });
  });

  next();
}
