import { z } from "zod";

export const VoiceVerdictInputSchema = z.object({
  verdict: z.enum(["VERIFIED", "RECENTLY_REGISTERED", "UNVERIFIED", "WARNING"] as const),
  lang: z.enum(["en-IN", "hi-IN", "kn-IN"] as const),
  merchantDisplayName: z.string().trim().max(100).optional(),
});

export type VoiceVerdictInput = z.infer<typeof VoiceVerdictInputSchema>;

export interface VoiceVerdictResponse {
  audioBase64: string;
  mimeType: string;
  textSpoken: string;
  cached: boolean;
  transliteratedName?: string;
}
