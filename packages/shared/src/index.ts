import { z } from "zod";

// --- Enums & Core Types ---

export const IdentityTierSchema = z.enum(["gst_verified", "baseline"]);
export type IdentityTier = z.infer<typeof IdentityTierSchema>;

export const CredentialStatusSchema = z.enum([
  "pending_activation",
  "recently_registered",
  "active",
  "suspended",
]);
export type CredentialStatus = z.infer<typeof CredentialStatusSchema>;

export const TrustTierSchema = z.enum(["verified", "unverified", "warning"]);
export type TrustTier = z.infer<typeof TrustTierSchema>;

export const VerdictSchema = z.enum(["VERIFIED", "RECENTLY_REGISTERED", "WARNING"]);
export type Verdict = z.infer<typeof VerdictSchema>;

export const VerdictReasonSchema = z.enum([
  "OK",
  "UNKNOWN_QR",
  "LOCATION_MISMATCH",
  "MISBINDING",
]);
export type VerdictReason = z.infer<typeof VerdictReasonSchema>;

// --- API Request Schemas ---

export const RegisterIdentityGstSchema = z.object({
  path: z.literal("gst_udyam"),
  gstUdyamNumber: z.string().min(5).max(30),
  contactPhone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone format"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  displayName: z.string().min(2).max(100),
  kycAddress: z.string().min(5).max(300),
});

export const RegisterIdentityPennyDropSchema = z.object({
  path: z.literal("penny_drop"),
  contactPhone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone format"),
  bankVpa: z.string().regex(/^[\w.-]+@[\w.-]+$/, "Invalid UPI VPA format"),
  displayName: z.string().min(2).max(100),
  kycAddress: z.string().min(5).max(300),
});

export const RegisterIdentityRequestSchema = z.discriminatedUnion("path", [
  RegisterIdentityGstSchema,
  RegisterIdentityPennyDropSchema,
]);
export type RegisterIdentityRequest = z.infer<typeof RegisterIdentityRequestSchema>;

export const ProofOfPossessionRequestSchema = z.object({
  credentialId: z.string().uuid(),
  transactionRef: z.string().min(4).optional(),
});
export type ProofOfPossessionRequest = z.infer<typeof ProofOfPossessionRequestSchema>;

export const AuditScanRequestSchema = z.object({
  qrPayload: z.string().min(1).max(2048),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  photoBase64: z.string().optional(),
});
export type AuditScanRequest = z.infer<typeof AuditScanRequestSchema>;

export const CustomerCheckRequestSchema = z.object({
  qrPayload: z.string().min(1).max(2048),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  photoBase64: z.string().optional(),
});
export type CustomerCheckRequest = z.infer<typeof CustomerCheckRequestSchema>;

// --- Standard API Error Envelope ---

export const ApiErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
});

export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.enum([
      "VALIDATION_ERROR",
      "UNAUTHENTICATED",
      "FORBIDDEN",
      "NOT_FOUND",
      "CONFLICT",
      "RATE_LIMITED",
      "EXTERNAL_SERVICE_ERROR",
      "INTERNAL_ERROR",
    ]),
    message: z.string().optional(),
    details: z.union([z.string(), z.array(ApiErrorDetailSchema)]).optional(),
    correlationId: z.string().optional(),
    retryAfterSeconds: z.number().optional(),
  }),
});
export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;
