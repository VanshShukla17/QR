import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initSentry, isSentryEnabled, captureSentryException } from "../config/sentry.js";

describe("Phase 7 — Sentry Integration & PII Boundary Tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("remains inert when SENTRY_DSN is not configured", () => {
    delete process.env.SENTRY_DSN;
    const initialized = initSentry();
    expect(initialized).toBe(false);
    expect(isSentryEnabled()).toBe(false);
  });

  it("safely handles captureSentryException when Sentry is unconfigured without throwing", () => {
    delete process.env.SENTRY_DSN;
    initSentry();

    expect(() => {
      captureSentryException(new Error("Test simulation"), {
        correlationId: "test-corr-123",
        photoBase64: "data:image/jpeg;base64,sensitive_bytes",
      });
    }).not.toThrow();
  });

  it("initializes when a valid SENTRY_DSN is configured", () => {
    process.env.SENTRY_DSN =
      "https://1234567890abcdef1234567890abcdef@o123456.ingest.sentry.io/1234567";
    process.env.SENTRY_ENVIRONMENT = "staging";

    const initialized = initSentry();
    expect(initialized).toBe(true);
    expect(isSentryEnabled()).toBe(true);
  });
});
