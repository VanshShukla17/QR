import { describe, expect, it, vi } from "vitest";
import request from "supertest";

import { app } from "../app.js";
import { logger, sanitizeLogMeta } from "../middleware/logger.middleware.js";
import { runAgentPipeline } from "../agents/orchestrator.js";

describe("Phase 4 — Structured Logging & Correlation IDs (ARCHITECTURE.md Section 8 & 12)", () => {
  describe("Correlation ID Tracking on HTTP Requests", () => {
    it("generates a new correlationId if none provided in request headers", async () => {
      const res = await request(app).get("/api/v1/health");

      expect(res.status).toBe(200);
      expect(res.headers["x-correlation-id"]).toBeDefined();
      expect(res.headers["x-correlation-id"]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it("propagates client-supplied x-correlation-id in response header", async () => {
      const customCorrelationId = "test-corr-id-123456789";

      const res = await request(app)
        .get("/api/v1/health")
        .set("x-correlation-id", customCorrelationId);

      expect(res.status).toBe(200);
      expect(res.headers["x-correlation-id"]).toBe(customCorrelationId);
    });
  });

  describe("Structured JSON format and PII Sanitization", () => {
    it("emits structured JSON containing level, correlationId, message, and timestamp", () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const corrId = "corr-test-abc";
      logger.info("Test message", corrId, { testField: "value123" });

      expect(logSpy).toHaveBeenCalled();
      const rawLog = logSpy.mock.calls[0][0];
      const parsed = JSON.parse(rawLog);

      expect(parsed.level).toBe("info");
      expect(parsed.correlationId).toBe(corrId);
      expect(parsed.message).toBe("Test message");
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.testField).toBe("value123");

      logSpy.mockRestore();
    });

    it("CONFIRMS PII fields (GST, bank VPA, photo bytes) are redacted and never leaked to logs", () => {
      const sensitiveMeta = {
        displayName: "Ramesh General Store",
        gstUdyamNumber: "27AAAAA0000A1Z5",
        bankVpa: "ramesh@okaxis",
        photoBase64: "data:image/jpeg;base64," + "A".repeat(600),
        rawPhotoBytes: "B".repeat(600),
        secretToken: "secret_xyz",
      };

      const sanitized = sanitizeLogMeta(sensitiveMeta);

      expect(sanitized.displayName).toBe("Ramesh General Store");
      expect(sanitized.gstUdyamNumber).toBe("[REDACTED_PII]");
      expect(sanitized.bankVpa).toBe("[REDACTED_PII]");
      expect(sanitized.photoBase64).toBe("[REDACTED_PII]");
      expect(sanitized.secretToken).toBe("[REDACTED_PII]");

      // Check log serialization does not contain raw sensitive values
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      logger.info("Registration attempt", "corr-pii", sensitiveMeta);

      const logOutput = logSpy.mock.calls[0][0];
      expect(logOutput).not.toContain("27AAAAA0000A1Z5");
      expect(logOutput).not.toContain("ramesh@okaxis");
      expect(logOutput).not.toContain("secret_xyz");

      logSpy.mockRestore();
    });
  });

  describe("Agent Pipeline Execution Logging", () => {
    it("logs agent-pipeline failure with specific agent name when degraded mode triggers", async () => {
      const warnSpy = vi.spyOn(logger, "warn");
      const infoSpy = vi.spyOn(logger, "info");

      const correlationId = "corr-degraded-test";

      const dummyPhoto =
        "data:image/jpeg;base64," + Buffer.from("test photo").toString("base64");

      const res = await runAgentPipeline(
        "upi://pay?pa=store@upi&pn=Store",
        12.9716,
        77.5946,
        dummyPhoto,
        {
          simulateFailAgent: "vision",
          correlationId,
        }
      );

      expect(res.degradedCheck).toBe(true);

      // Verify degraded mode warning was logged with correlation ID and agent name
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Vision agent"),
        correlationId,
        expect.objectContaining({
          failedAgent: "vision",
          degradedCheck: true,
        })
      );

      // Verify verdict completion was logged with correlation ID
      expect(infoSpy).toHaveBeenCalledWith(
        "Agent pipeline verdict computed",
        correlationId,
        expect.objectContaining({
          type: "audit_verdict",
          degradedCheck: true,
        })
      );

      warnSpy.mockRestore();
      infoSpy.mockRestore();
    });
  });
});
