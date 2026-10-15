import { describe, it, expect } from "vitest";

import {
  sanitizeAiPayload,
  assertAiDataBoundary,
  AiDataBoundaryError,
  roundGpsForAi,
} from "../utils/ai-boundary-guard.js";

describe("AI Data Boundary Guard (Task 8)", () => {
  it("strips forbidden identity fields (GST, bank VPA, KYC address, phone)", () => {
    const rawPayload = {
      qrPayload: "upi://pay?pa=store@sbi&pn=Store",
      latitude: 12.9715987,
      longitude: 77.5945621,
      gst_udyam_number: "29ABCDE1234F1Z5",
      bank_vpa: "secret@hdfcbank",
      kyc_address: "123 Main Street, Bangalore",
      contact_phone: "+919876543210",
      validExtraField: "safe_metadata",
    };

    const sanitized = sanitizeAiPayload(rawPayload);

    expect(sanitized).toHaveProperty("qrPayload", "upi://pay?pa=store@sbi&pn=Store");
    expect(sanitized).toHaveProperty("validExtraField", "safe_metadata");
    // Ensure forbidden identity fields were stripped
    expect(sanitized).not.toHaveProperty("gst_udyam_number");
    expect(sanitized).not.toHaveProperty("bank_vpa");
    expect(sanitized).not.toHaveProperty("kyc_address");
    expect(sanitized).not.toHaveProperty("contact_phone");
    // Coordinates are rounded to ~100m precision (3 decimal places)
    expect(sanitized.latitude).toBe(12.972);
    expect(sanitized.longitude).toBe(77.595);
  });

  it("redacts raw GSTIN pattern in plain text strings", () => {
    const rawString = "Merchant verification for GST 29ABCDE1234F1Z5 status ok";
    const sanitized = sanitizeAiPayload(rawString);

    expect(sanitized).not.toContain("29ABCDE1234F1Z5");
    expect(sanitized).toContain("[REDACTED_GSTIN]");
  });

  it("throws an error when assertAiDataBoundary encounters forbidden fields", () => {
    const dirtyPayload = {
      qrPayload: "upi://pay?pa=test@upi",
      gstUdyamNumber: "29ABCDE1234F1Z5",
    };

    expect(() => assertAiDataBoundary(dirtyPayload)).toThrow(AiDataBoundaryError);
    expect(() => assertAiDataBoundary(dirtyPayload)).toThrow(
      /Forbidden field 'gstUdyamNumber'/
    );
  });

  it("throws an error when assertAiDataBoundary encounters an unredacted GST number in text", () => {
    const dirtyText = "User registered with 29ABCDE1234F1Z5";

    expect(() => assertAiDataBoundary(dirtyText)).toThrow(AiDataBoundaryError);
    expect(() => assertAiDataBoundary(dirtyText)).toThrow(/GST\/Udyam number/);
  });

  it("passes clean payloads without error", () => {
    const cleanPayload = {
      qrPayload: "upi://pay?pa=merchant@upi&pn=Store",
      latitude: roundGpsForAi(12.97159),
      longitude: roundGpsForAi(77.59456),
      referenceEmbedding: [0.1, 0.2, 0.3],
    };

    expect(() => assertAiDataBoundary(cleanPayload)).not.toThrow();
  });
});
