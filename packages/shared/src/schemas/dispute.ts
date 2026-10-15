import { z } from "zod";

export const CreateDisputeSchema = z.object({
  credentialId: z.string().uuid(),
  evidenceSummary: z.string().min(10).max(2000),
});

export type CreateDisputeInput = z.infer<typeof CreateDisputeSchema>;

export const ResolveDisputeSchema = z.object({
  status: z.enum(["resolved_upheld", "resolved_rejected"]),
  resolutionReason: z.string().min(5).max(1000),
});

export type ResolveDisputeInput = z.infer<typeof ResolveDisputeSchema>;
