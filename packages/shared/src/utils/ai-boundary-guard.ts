/**
 * AI Data Boundary Guard
 * Enforces ARCHITECTURE.md Section 8 and AGENTS.md Rule 8.
 *
 * Allowed to reach Gemini:
 * - QR payload hash / decoded payload string
 * - Live audit photo (transient, in-request only)
 * - Reference embedding vector
 * - GPS coordinates (rounded to ~100m precision)
 *
 * Never reaches Gemini:
 * - GST/Udyam number
 * - Bank VPA / bank-linked name
 * - Any admin credentials or internal secrets
 * - Other merchants' data outside the current audit run
 */

export class AiDataBoundaryError extends Error {
  constructor(message: string) {
    super(`[AI Data Boundary Violation] ${message}`);
    this.name = "AiDataBoundaryError";
  }
}

const FORBIDDEN_KEY_SUBSTRINGS = [
  "gst",
  "udyam",
  "bank_vpa",
  "bankvpa",
  "kyc_address",
  "kycaddress",
  "contact_phone",
  "phone",
  "password",
  "secret",
  "private_key",
  "service_role",
];

// GSTIN format: 2 digits + 5 chars + 4 digits + 1 char + 1 char/digit + 'Z' + 1 char/digit
const GSTIN_REGEX = /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/i;

/**
 * Rounds coordinate to 3 decimal places (~111m precision) per ARCHITECTURE.md Section 8.
 */
export function roundGpsForAi(coord: number): number {
  return Number(coord.toFixed(3));
}

/**
 * Recursively inspects and sanitizes an object destined for Gemini API.
 * Strips sensitive identity schema fields and rounds GPS coordinates.
 */
export function sanitizeAiPayload<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === "string") {
    // If a raw GSTIN pattern is found, redact it
    return input.replace(GSTIN_REGEX, "[REDACTED_GSTIN]") as unknown as T;
  }

  if (typeof input === "number") {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeAiPayload(item)) as unknown as T;
  }

  if (typeof input === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();

      // Check if key contains forbidden identity or secret substrings
      const isForbidden = FORBIDDEN_KEY_SUBSTRINGS.some((forbidden) =>
        lowerKey.includes(forbidden)
      );

      if (isForbidden) {
        continue; // Strip forbidden identity field
      }

      // Round latitude and longitude to ~100m precision
      if (
        (lowerKey === "latitude" ||
          lowerKey === "longitude" ||
          lowerKey === "lat" ||
          lowerKey === "lng") &&
        typeof value === "number"
      ) {
        result[key] = roundGpsForAi(value);
      } else {
        result[key] = sanitizeAiPayload(value);
      }
    }

    return result as T;
  }

  return input;
}

/**
 * Validates that an outgoing AI prompt or payload does NOT contain any
 * sensitive identity fields or unredacted GST/PII numbers.
 * Throws AiDataBoundaryError on any violation.
 */
export function assertAiDataBoundary(payload: unknown): void {
  if (!payload) return;

  if (typeof payload === "string") {
    if (GSTIN_REGEX.test(payload)) {
      throw new AiDataBoundaryError(
        "Detected unredacted GST/Udyam number in outgoing AI payload"
      );
    }
    return;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      assertAiDataBoundary(item);
    }
    return;
  }

  if (typeof payload === "object") {
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();

      const isForbidden = FORBIDDEN_KEY_SUBSTRINGS.some((forbidden) =>
        lowerKey.includes(forbidden)
      );

      if (isForbidden) {
        throw new AiDataBoundaryError(
          `Forbidden field '${key}' detected in outgoing AI payload. Identity data must never reach Gemini.`
        );
      }

      assertAiDataBoundary(value);
    }
  }
}

/**
 * Sarvam Voice Privacy Guard
 *
 * Allowed to reach Sarvam:
 * - Spoken template text / transliteration input
 * - Target language code / source language code
 * - Merchant display name (from verified registry only)
 * - TTS model / speaker configuration options
 *
 * Strictly FORBIDDEN to reach Sarvam:
 * - GST/Udyam numbers
 * - Raw VPAs / bank account details
 * - KYC address
 * - Contact phone
 * - GPS coordinates
 * - Raw photo bytes or embeddings
 * - Audit internals, agent scores, or secrets
 */
const SARVAM_ALLOWED_KEYS = new Set([
  "verdict",
  "lang",
  "target_language_code",
  "source_language_code",
  "merchantdisplayname",
  "merchant_display_name",
  "displayname",
  "display_name",
  "text",
  "input",
  "speaker",
  "model",
  "mode",
  "speech_sample_rate",
  "enable_preprocessing",
  "pace",
  "pitch",
  "loudness",
  "numerals_format",
  "spoken_form",
  "spoken_form_numerals_language",
  "output_audio_codec",
]);

const SARVAM_FORBIDDEN_KEY_SUBSTRINGS = [
  "gst",
  "udyam",
  "vpa",
  "bank",
  "account",
  "ifsc",
  "kyc",
  "address",
  "phone",
  "contact",
  "lat",
  "lng",
  "gps",
  "coord",
  "photo",
  "image",
  "embedding",
  "vector",
  "secret",
  "key",
  "token",
  "password",
  "agent_output",
  "agentoutputs",
  "score",
  "misbinding",
  "attestation",
];

export function assertSarvamVoiceDataBoundary(payload: unknown): void {
  if (payload === null || payload === undefined) return;

  if (typeof payload === "string") {
    if (GSTIN_REGEX.test(payload)) {
      throw new AiDataBoundaryError(
        "Detected unredacted GST/Udyam number in outgoing Sarvam voice payload"
      );
    }
    return;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      assertSarvamVoiceDataBoundary(item);
    }
    return;
  }

  if (typeof payload === "object") {
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();

      // Check if key is explicitly forbidden
      const isForbidden = SARVAM_FORBIDDEN_KEY_SUBSTRINGS.some((forbidden) =>
        lowerKey.includes(forbidden)
      );

      if (isForbidden) {
        throw new AiDataBoundaryError(
          `Forbidden field '${key}' detected in outgoing Sarvam voice payload. PII, GPS, photos, and audit internals must never reach Sarvam.`
        );
      }

      // Check if key is in the allowed whitelist
      const isAllowed = SARVAM_ALLOWED_KEYS.has(lowerKey);
      if (!isAllowed) {
        throw new AiDataBoundaryError(
          `Disallowed field '${key}' in outgoing Sarvam voice payload. Only text, language, verified merchant display name, and TTS settings are permitted.`
        );
      }

      assertSarvamVoiceDataBoundary(value);
    }
  }
}
