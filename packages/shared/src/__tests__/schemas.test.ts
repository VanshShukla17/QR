import { describe, expect, it } from "vitest";
import {
  RegisterIdentitySchema,
  RegisterReferenceSchema,
  AuditRunSchema,
} from "../index.js";

describe("Shared Zod Schemas", () => {
  it("validates GST/Udyam identity registration input", () => {
    const validGst = {
      type: "gst_udyam" as const,
      displayName: "Sharma Canteen",
      contactPhone: "+919876543210",
      gstUdyamNumber: "27AAPFU0939L1ZV",
      kycAddress: "Shop 12, Campus Market, Pune",
      otp: "123456",
    };

    const result = RegisterIdentitySchema.safeParse(validGst);
    expect(result.success).toBe(true);
  });

  it("validates Penny Drop identity registration input", () => {
    const validPennyDrop = {
      type: "penny_drop" as const,
      displayName: "Ramesh Chai",
      contactPhone: "+919876543211",
      bankVpa: "ramesh@oksbi",
      kycAddress: "Stall 4, Near Gate 2, Pune",
    };

    const result = RegisterIdentitySchema.safeParse(validPennyDrop);
    expect(result.success).toBe(true);
  });

  it("rejects invalid phone or missing fields", () => {
    const invalidPhone = {
      type: "penny_drop" as const,
      displayName: "Ramesh Chai",
      contactPhone: "invalid-phone",
      bankVpa: "ramesh@oksbi",
      kycAddress: "Stall 4",
    };

    const result = RegisterIdentitySchema.safeParse(invalidPhone);
    expect(result.success).toBe(false);
  });

  it("validates reference registration input", () => {
    const validRef = {
      qrPayload: "upi://pay?pa=sharma@sbi&pn=SharmaCanteen&cu=INR",
      latitude: 18.5204,
      longitude: 73.8567,
      boundRadiusM: 100,
      photoBase64: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
    };

    const result = RegisterReferenceSchema.safeParse(validRef);
    expect(result.success).toBe(true);
  });

  it("validates audit run input", () => {
    const validAudit = {
      qrPayload: "upi://pay?pa=sharma@sbi&pn=SharmaCanteen&cu=INR",
      latitude: 18.5204,
      longitude: 73.8567,
      photoBase64: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
    };

    const result = AuditRunSchema.safeParse(validAudit);
    expect(result.success).toBe(true);
  });
});
