import { z } from "zod";

export const AuditRunSchema = z.object({
  qrPayload: z.string().min(1).max(2048),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  photoBase64: z.string().min(10),
});

export type AuditRunInput = z.infer<typeof AuditRunSchema>;

export const CustomerCheckSchema = z.object({
  qrPayload: z.string().min(1).max(2048),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  photoBase64: z.string().optional(),
});

export type CustomerCheckInput = z.infer<typeof CustomerCheckSchema>;
