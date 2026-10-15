import type { AgentOutput } from "@qraksha/shared";

import { visionService } from "../services/vision.service.js";

export interface VisionAgentInput {
  photoBase64?: string;
  referenceEmbedding?: number[];
}

/**
 * Vision Agent:
 * Extracts a live embedding from the audit photo and cosine-compares to the stored reference embedding.
 * Returns a soft similarity score (never a standalone red flag) per ARCHITECTURE.md Section 2 & 8.
 */
export async function runVisionAgent(input: VisionAgentInput): Promise<AgentOutput> {
  const { photoBase64, referenceEmbedding } = input;

  // 1. If photo was omitted (e.g. optional check without photo)
  if (!photoBase64) {
    return {
      status: "pass",
      reason: "Visual verification skipped (no audit photo provided)",
      metadata: { skipped: true },
    };
  }

  // 2. If reference embedding is missing
  if (!referenceEmbedding || referenceEmbedding.length === 0) {
    return {
      status: "warn",
      score: 0,
      reason: "No reference embedding found for this registered QR sticker",
    };
  }

  try {
    // 3. Extract live embedding
    const { buffer, mimeType } = visionService.validateAndParsePhoto(photoBase64);
    const liveEmbedding = await visionService.extractEmbedding(buffer, mimeType);

    // 4. Compute cosine similarity
    const similarity = visionService.cosineSimilarity(liveEmbedding, referenceEmbedding);
    const threshold = 0.7;

    // Soft signal only: visual difference is a warning, NEVER a standalone fail/red flag
    if (similarity >= threshold) {
      return {
        status: "pass",
        score: similarity,
        reason: `Visual characteristics match registered reference (similarity: ${(similarity * 100).toFixed(1)}%)`,
        metadata: { similarity, threshold },
      };
    } else {
      return {
        status: "warn", // SOFT SIGNAL
        score: similarity,
        reason: `Visual variance detected between live scan and reference sticker (similarity: ${(similarity * 100).toFixed(1)}%)`,
        metadata: { similarity, threshold },
      };
    }
  } catch (err) {
    // Graceful fallback for malformed or unprocessable photos
    return {
      status: "warn",
      reason: `Could not process audit photo: ${(err as Error).message}`,
      metadata: { error: true },
    };
  }
}
