import { describe, expect, it } from "vitest";

import {
  RegisterIdentityGstSchema,
  RegisterIdentityPennyDropSchema,
  RegisterIdentityRequestSchema,
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
});
