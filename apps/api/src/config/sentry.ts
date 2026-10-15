import * as Sentry from "@sentry/node";

let sentryInitialized = false;

/**
 * Sanitizes any sensitive PII (GST, bank VPA, raw photo bytes) from Sentry events
 * per ARCHITECTURE.md Section 8 and AGENTS.md Security Rules.
 */
function sanitizeEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (!event) return event;

  const sanitizeValue = (val: unknown): unknown => {
    if (typeof val === "string") {
      let strVal = val;
      // Redact base64 photo buffers
      if (
        strVal.startsWith("data:image/") ||
        (strVal.length > 500 && /^[A-Za-z0-9+/=]+$/.test(strVal))
      ) {
        return "[REDACTED_PHOTO_BYTES]";
      }
      // Redact GSTIN (e.g. 29ABCDE1234F1Z5)
      strVal = strVal.replace(
        /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{3}\b/g,
        "[REDACTED_GSTIN]"
      );
      // Redact Udyam number
      strVal = strVal.replace(/\bUDYAM-[A-Z]{2}-\d{2}-\d{7}\b/gi, "[REDACTED_UDYAM]");
      // Redact bank VPA
      strVal = strVal.replace(
        /\b[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}\b/g,
        "[REDACTED_VPA]"
      );
      return strVal;
    }
    if (val && typeof val === "object") {
      if (Array.isArray(val)) {
        return val.map(sanitizeValue);
      }
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val)) {
        if (/photo|image|base64|password|secret|key|private/i.test(k)) {
          cleaned[k] = "[REDACTED_FIELD]";
        } else {
          cleaned[k] = sanitizeValue(v);
        }
      }
      return cleaned;
    }
    return val;
  };

  if (event.extra) {
    event.extra = sanitizeValue(event.extra) as Record<string, unknown>;
  }

  return event;
}

/**
 * Initialize Sentry for staging and production environments
 */
export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN;
  const env = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development";

  if (!dsn || dsn.includes("placeholder")) {
    sentryInitialized = false;
    return false;
  }

  try {
    Sentry.init({
      dsn,
      environment: env,
      tracesSampleRate: env === "production" ? 0.2 : 1.0,
      beforeSend(event) {
        return sanitizeEvent(event);
      },
    });

    sentryInitialized = true;
    console.log(`[QRaksha API] Sentry initialized for environment: ${env}`);
    return true;
  } catch (err) {
    console.error("[QRaksha API] Failed to initialize Sentry:", err);
    sentryInitialized = false;
    return false;
  }
}

export function isSentryEnabled(): boolean {
  return sentryInitialized;
}

/**
 * Captures an exception with optional correlation context and PII guards
 */
export function captureSentryException(
  err: Error | unknown,
  context?: { correlationId?: string; [key: string]: unknown }
): void {
  if (!sentryInitialized) return;

  Sentry.withScope((scope) => {
    if (context?.correlationId) {
      scope.setTag("correlationId", context.correlationId);
    }
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(err);
  });
}
