import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { voiceService, VoiceService } from "../services/voice.service.js";
import { resetRateLimitStore } from "../middleware/rate-limit.middleware.js";

describe("Voice API & Service (/api/v1/voice/verdict)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetRateLimitStore();
    voiceService.clearCache();
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("POST /api/v1/voice/verdict Validation", () => {
    it("returns 400 VALIDATION_ERROR when verdict is invalid", async () => {
      const res = await request(app).post("/api/v1/voice/verdict").send({
        verdict: "INVALID_VERDICT",
        lang: "en-IN",
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 VALIDATION_ERROR when lang is unsupported", async () => {
      const res = await request(app).post("/api/v1/voice/verdict").send({
        verdict: "VERIFIED",
        lang: "fr-FR",
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/v1/voice/verdict Synthesis & Caching", () => {
    it("synthesizes audio for VERIFIED in en-IN with merchant name", async () => {
      const res = await request(app)
        .post("/api/v1/voice/verdict")
        .set("x-bypass-rate-limit", "true")
        .send({
          verdict: "VERIFIED",
          lang: "en-IN",
          merchantDisplayName: "Sharma Kirana",
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.audioBase64).toBeTruthy();
      expect(res.body.data.mimeType).toBe("audio/wav");
      expect(res.body.data.textSpoken).toBe(
        "You are about to pay Sharma Kirana. This merchant is verified. You can pay safely."
      );
      expect(res.body.data.cached).toBe(false);
    });

    it("serves repeated requests from in-memory cache with cached: true", async () => {
      // First request (synthesizes / sets cache)
      await request(app)
        .post("/api/v1/voice/verdict")
        .set("x-bypass-rate-limit", "true")
        .send({
          verdict: "VERIFIED",
          lang: "en-IN",
          merchantDisplayName: "Sharma Kirana",
        });

      // Second request (hits in-memory cache)
      const cachedRes = await request(app)
        .post("/api/v1/voice/verdict")
        .set("x-bypass-rate-limit", "true")
        .send({
          verdict: "VERIFIED",
          lang: "en-IN",
          merchantDisplayName: "Sharma Kirana",
        });

      expect(cachedRes.status).toBe(200);
      expect(cachedRes.body.data.cached).toBe(true);
      expect(cachedRes.body.data.textSpoken).toContain("Sharma Kirana");
    });

    it("synthesizes static UNVERIFIED template in hi-IN without merchant name", async () => {
      const res = await request(app)
        .post("/api/v1/voice/verdict")
        .set("x-bypass-rate-limit", "true")
        .send({
          verdict: "UNVERIFIED",
          lang: "hi-IN",
          merchantDisplayName: "Attacker Shop",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.textSpoken).toBe(
        "यह क्यूआर कोड सत्यापित नहीं है। हम पुष्टि नहीं कर सकते कि यह किसका है। भुगतान से पहले दुकानदार से पूछ लें।"
      );
      // Malicious/unregistered name is NEVER included in UNVERIFIED template
      expect(res.body.data.textSpoken).not.toContain("Attacker Shop");
    });

    it("synthesizes static WARNING template in kn-IN without merchant name", async () => {
      const res = await request(app)
        .post("/api/v1/voice/verdict")
        .set("x-bypass-rate-limit", "true")
        .send({
          verdict: "WARNING",
          lang: "kn-IN",
          merchantDisplayName: "Attacker Shop",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.textSpoken).toBe(
        "ಎಚ್ಚರಿಕೆ! ಈ ಕ್ಯೂಆರ್ ಕೋಡ್ನಲ್ಲಿ ಸಮಸ್ಯೆ ಕಂಡುಬಂದಿದೆ. ಪಾವತಿ ಮಾಡಬೇಡಿ."
      );
      expect(res.body.data.textSpoken).not.toContain("Attacker Shop");
    });
  });

  describe("Sarvam API Mocking, Timeout & Error Behavior", () => {
    it("handles live Sarvam API response when API key is provided", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          audios: [
            "UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==",
          ],
          request_id: "test-req-123",
        }),
      });
      global.fetch = mockFetch;

      const testService = new VoiceService({
        apiKey: "test-sarvam-key",
      });

      const result = await testService.getVerdictAudio("VERIFIED", "en-IN", "Cafe Green");
      expect(result.audioBase64).toBeTruthy();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("transliterates Latin merchant name into Kannada native script", async () => {
      const mockFetch = vi
        .fn()
        // First call: transliterate
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            transliterated_text: "ಶರ್ಮಾ ಕಿರಾಣಿ",
          }),
        })
        // Second call: text-to-speech
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            audios: [
              "UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==",
            ],
            request_id: "test-req-kn",
          }),
        });
      global.fetch = mockFetch;

      const testService = new VoiceService({
        apiKey: "test-sarvam-key",
      });

      const result = await testService.getVerdictAudio(
        "VERIFIED",
        "kn-IN",
        "Sharma Kirana"
      );
      expect(result.textSpoken).toContain("ಶರ್ಮಾ ಕಿರಾಣಿ");
      expect(result.transliteratedName).toBe("ಶರ್ಮಾ ಕಿರಾಣಿ");
    });

    it("falls back cleanly to original Latin name when transliteration fails", async () => {
      const mockFetch = vi
        .fn()
        // Transliterate fails with 500
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => "Internal server error",
        })
        // TTS succeeds with fallback name
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            audios: [
              "UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==",
            ],
            request_id: "test-req-fallback",
          }),
        });
      global.fetch = mockFetch;

      const testService = new VoiceService({
        apiKey: "test-sarvam-key",
      });

      const result = await testService.getVerdictAudio("VERIFIED", "hi-IN", "Cafe Green");
      expect(result.textSpoken).toContain("Cafe Green");
    });

    it("throws error when Sarvam TTS fails or times out so client can invoke SpeechSynthesis fallback", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network timeout > 2s"));
      global.fetch = mockFetch;

      const testService = new VoiceService({
        apiKey: "test-sarvam-key",
      });

      await expect(testService.getVerdictAudio("WARNING", "en-IN")).rejects.toThrow(
        /Network timeout/
      );
    });
  });

  describe("Voice Rate Limiting", () => {
    it("enforces 5 requests per 10s per client on /api/v1/voice/verdict", async () => {
      const clientId = "client-rate-limit-test";

      // 5 requests succeed
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post("/api/v1/voice/verdict")
          .set("x-test-client-id", clientId)
          .send({
            verdict: "WARNING",
            lang: "en-IN",
          });
        expect(res.status).toBe(200);
      }

      // 6th request is rate-limited (HTTP 429)
      const limitedRes = await request(app)
        .post("/api/v1/voice/verdict")
        .set("x-test-client-id", clientId)
        .send({
          verdict: "WARNING",
          lang: "en-IN",
        });

      expect(limitedRes.status).toBe(429);
      expect(limitedRes.body.error.code).toBe("RATE_LIMITED");
    });
  });
});
