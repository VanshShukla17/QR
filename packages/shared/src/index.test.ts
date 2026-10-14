import { describe, expect, it } from "vitest";

import {
  RegisterIdentityGstSchema,
  RegisterIdentityPennyDropSchema,
  RegisterIdentityRequestSchema,
  RegisterReferenceRequestSchema,
  VerdictSchema,
} from "./index.js";

describe("Shared Schemas", () => {
  it("validates GST identity registration correctly", () => {
    const validGst = {
      path: "gst_udyam" as const,
      gstUdyamNumber: "27AAPFU0939F1ZV",
      contactPhone: "+919876543210",
      otp: "123456",
      displayName: "Sharma Canteen",
      kycAddress: "Shop 4, Campus Market, IIT Bombay, Mumbai",
    };

    const parsed = RegisterIdentityGstSchema.safeParse(validGst);
    expect(parsed.success).toBe(true);

    const unionParsed = RegisterIdentityRequestSchema.safeParse(validGst);
    expect(unionParsed.success).toBe(true);
  });

  it("rejects invalid GST OTP", () => {
    const invalidGst = {
      path: "gst_udyam" as const,
      gstUdyamNumber: "27AAPFU0939F1ZV",
      contactPhone: "+919876543210",
      otp: "12", // too short
      displayName: "Sharma Canteen",
      kycAddress: "Shop 4, Campus Market, IIT Bombay, Mumbai",
    };

    const parsed = RegisterIdentityGstSchema.safeParse(invalidGst);
    expect(parsed.success).toBe(false);
  });

  it("validates penny-drop VPA registration correctly", () => {
    const validPennyDrop = {
      path: "penny_drop" as const,
      contactPhone: "+919876543210",
      bankVpa: "sharmacanteen@okaxis",
      displayName: "Sharma Canteen",
      kycAddress: "Shop 4, Campus Market, IIT Bombay, Mumbai",
    };

    const parsed = RegisterIdentityPennyDropSchema.safeParse(validPennyDrop);
    expect(parsed.success).toBe(true);
  });

  it("rejects malformed VPA", () => {
    const invalidPennyDrop = {
      path: "penny_drop" as const,
      contactPhone: "+919876543210",
      bankVpa: "not-a-vpa",
      displayName: "Sharma Canteen",
      kycAddress: "Shop 4, Campus Market, IIT Bombay, Mumbai",
    };

    const parsed = RegisterIdentityPennyDropSchema.safeParse(invalidPennyDrop);
    expect(parsed.success).toBe(false);
  });

  it("validates verdict enum values", () => {
    expect(VerdictSchema.options).toEqual(["VERIFIED", "RECENTLY_REGISTERED", "WARNING"]);
  });

  it("validates reference registration request correctly", () => {
    const validRef = {
      merchantId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      qrPayload: "upi://pay?pa=sharmacanteen@okaxis&pn=Sharma%20Canteen",
      photoBase64: "aGVsbG8gd29ybGQ=",
      mimeType: "image/jpeg" as const,
      latitude: 19.076,
      longitude: 72.8777,
      boundRadiusM: 100,
    };

    const parsed = RegisterReferenceRequestSchema.safeParse(validRef);
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid reference coordinates or missing photo", () => {
    const invalidRef = {
      merchantId: "not-a-uuid",
      qrPayload: "",
      photoBase64: "",
      latitude: 100, // invalid latitude > 90
      longitude: 72.8777,
    };

    const parsed = RegisterReferenceRequestSchema.safeParse(invalidRef);
    expect(parsed.success).toBe(false);
  });
});
