import { z } from "zod";

export const RequestOtpSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format"),
});

export type RequestOtpInput = z.infer<typeof RequestOtpSchema>;

export const VerifyOtpSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format"),
  token: z.string().length(6, "Token must be 6 digits"),
});

export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
