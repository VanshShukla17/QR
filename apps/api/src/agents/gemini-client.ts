import { assertAiDataBoundary, sanitizeAiPayload } from "@qraksha/shared";

export interface GeminiCallParams {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  metadata?: Record<string, unknown>;
}

export type GeminiMockHandler = (params: GeminiCallParams) => Promise<string>;

let activeMockHandler: GeminiMockHandler | null = null;

export function setGeminiMockHandler(handler: GeminiMockHandler | null): void {
  activeMockHandler = handler;
}

/**
 * GeminiClientWrapper enforces the AI Data Boundary Guard,
 * structured JSON output, and 1-attempt transient error retry.
 * Per ARCHITECTURE.md Section 8 and Section 10.
 */
export class GeminiClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model = "gemini-2.0-flash") {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || "";
    this.model = model;
  }

  /**
   * Generates structured JSON from Gemini.
   * Guaranteed to pass through AI data-boundary guard first.
   */
  async generateStructuredJson<T>(params: GeminiCallParams): Promise<T> {
    // 1. Enforce AI data-boundary guard (Rule 8 & Task 8)
    // First, verify incoming params do not contain forbidden identity fields
    assertAiDataBoundary(params.systemPrompt);
    assertAiDataBoundary(params.userPrompt);
    if (params.metadata) {
      assertAiDataBoundary(params.metadata);
    }

    // Additionally sanitize and round coordinates to ~100m precision (defense in depth)
    const sanitizedUserPrompt = sanitizeAiPayload(params.userPrompt);
    const sanitizedMetadata = sanitizeAiPayload(params.metadata);

    const sanitizedParams: GeminiCallParams = {
      ...params,
      userPrompt: sanitizedUserPrompt,
      metadata: sanitizedMetadata,
    };

    // 2. If a mock handler is configured (e.g. during unit tests), use it
    if (activeMockHandler) {
      const mockResponseText = await activeMockHandler(sanitizedParams);
      return JSON.parse(mockResponseText) as T;
    }

    // 3. If no API key configured or mock/offline mode active, use fallback structured response
    if (
      !this.apiKey ||
      this.apiKey === "your-gemini-api-key" ||
      process.env.MOCK_GEMINI === "true" ||
      process.env.OFFLINE_MODE === "true"
    ) {
      return this.generateDevFallback<T>(sanitizedParams);
    }

    // 4. Live API call with one immediate retry on transient failure
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await this.callGeminiApi(sanitizedParams);
        return JSON.parse(response) as T;
      } catch (err) {
        lastError = err as Error;
        if (attempt === 1) {
          // Wait 150ms before one immediate retry per ARCHITECTURE.md Section 10
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }
    }

    throw lastError || new Error("Gemini API call failed after retry");
  }

  private async callGeminiApi(params: GeminiCallParams): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: `${params.systemPrompt}\n\nTask Input:\n${params.userPrompt}` },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: params.temperature ?? 0.1,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(2000),
    });

    if (!res.ok) {
      throw new Error(`Gemini API returned status ${res.status}: ${res.statusText}`);
    }

    const json = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Empty response from Gemini API");
    }

    return text;
  }

  private generateDevFallback<T>(params: GeminiCallParams): T {
    // If prompt contains mismatch/unknown hints, output accordingly
    const prompt = params.userPrompt.toLowerCase();
    if (prompt.includes("unknown") || prompt.includes("unrecognized")) {
      return {
        status: "fail",
        reason: "Unrecognized QR payload",
        isRegistered: false,
      } as unknown as T;
    }
    if (prompt.includes("mismatch") || prompt.includes("relocated")) {
      return {
        status: "fail",
        reason: "Location mismatch detected",
      } as unknown as T;
    }
    return {
      status: "pass",
      reason: "Agent verification passed (dev fallback)",
    } as unknown as T;
  }
}

export const geminiClient = new GeminiClient();
