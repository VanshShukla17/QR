import { z } from "zod";

export const RegisterIdentitySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("gst_udyam"),
    displayName: z.string().min(2).max(100),
    contactPhone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format"),
    gstUdyamNumber: z.string().min(5).max(30),
    kycAddress: z.string().min(5).max(255),
    otp: z.string().length(6, "OTP must be 6 digits"),
  }),
  z.object({
    type: z.literal("penny_drop"),
    displayName: z.string().min(2).max(100),
    contactPhone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format"),
    bankVpa: z.string().min(3).max(100),
    kycAddress: z.string().min(5).max(255),
  }),
]);

export type RegisterIdentityInput = z.infer<typeof RegisterIdentitySchema>;

export const RegisterReferenceSchema = z.object({
  merchantId: z.string().uuid().optional(),
  qrPayload: z.string().min(1).max(2048),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  boundRadiusM: z.number().int().positive().default(100),
  photoBase64: z.string().min(10),
});

export type RegisterReferenceInput = z.infer<typeof RegisterReferenceSchema>;

export const ProofOfPossessionSchema = z.object({
  credentialId: z.string().uuid(),
  simulationPassed: z.boolean().default(true),
});

export type ProofOfPossessionInput = z.infer<typeof ProofOfPossessionSchema>;

export const AddQrSchema = z.object({
  qrPayload: z.string().min(1).max(2048),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  boundRadiusM: z.number().int().positive().default(100),
  photoBase64: z.string().min(10),
});

export type AddQrInput = z.infer<typeof AddQrSchema>;
