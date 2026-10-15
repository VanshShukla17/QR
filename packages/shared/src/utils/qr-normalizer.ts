/**
 * QR Payload Normalization Utility
 * Standardizes UPI and custom QR payloads so identical payloads
 * produce identical cryptographic hashes regardless of whitespace,
 * case variations, URL parameter ordering, or encoding quirks.
 * Per ARCHITECTURE.md Section 3 & 5.
 */

export function normalizeQrPayload(rawPayload: string): string {
  if (!rawPayload || typeof rawPayload !== "string") {
    return "";
  }

  const trimmed = rawPayload.trim();

  // Handle standard UPI URL scheme: upi://pay?...
  if (/^upi:\/\/pay(\/|\?)?/i.test(trimmed)) {
    try {
      // Split scheme/path and query string
      const qIndex = trimmed.indexOf("?");
      if (qIndex === -1) {
        return "upi://pay";
      }

      const queryString = trimmed.slice(qIndex + 1);
      const params = new URLSearchParams(queryString);

      // Collect, canonicalize, and sort query parameters
      const normalizedEntries: Array<[string, string]> = [];

      for (const [key, value] of params.entries()) {
        const lowerKey = key.trim().toLowerCase();
        let normalizedVal = value.trim();

        // Virtual Payment Address (VPA) is case-insensitive
        if (lowerKey === "pa") {
          normalizedVal = normalizedVal.toLowerCase();
        }

        normalizedEntries.push([lowerKey, normalizedVal]);
      }

      // Sort by key ascending, then value ascending for deterministic ordering
      normalizedEntries.sort((a, b) => {
        if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
        return a[1].localeCompare(b[1]);
      });

      // Construct canonical query string
      const canonicalParams = new URLSearchParams();
      for (const [k, v] of normalizedEntries) {
        canonicalParams.append(k, v);
      }

      return `upi://pay?${canonicalParams.toString()}`;
    } catch {
      // If URL parsing fails for an unusual UPI format, fall back to trimmed lowercase scheme
      return trimmed.replace(/^upi:\/\/pay/i, "upi://pay");
    }
  }

  // Non-UPI raw string: return trimmed
  return trimmed;
}
