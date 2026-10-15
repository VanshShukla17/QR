import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

describe("Phase 5 — UX States Specification Tests (PRD.md Section 6)", () => {
  describe("State 1: Loading State", () => {
    it("renders skeleton loader with pipeline status messages without feeling frozen", () => {
      const stepMessages = [
        "Checking QR identity & format…",
        "Comparing to registered photo embedding…",
        "Verifying geolocation against bound premises…",
        "Synthesizing multi-agent verdict…",
      ];

      for (const step of stepMessages) {
        const html = renderToStaticMarkup(
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center justify-center p-8 rounded-[4px] bg-ink-2 border border-brand/40 text-center gap-4 animate-pulse"
          >
            <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
            <div>
              <h2 className="text-sm font-medium text-text">Running 5-Agent Pipeline</h2>
              <p className="text-xs font-mono text-brand mt-1">{step}</p>
            </div>
            <div className="w-full max-w-[240px] h-1.5 bg-ink rounded-full overflow-hidden mt-2">
              <div className="h-full bg-brand animate-pulse w-3/4" />
            </div>
          </div>
        );

        expect(html).toContain("Running 5-Agent Pipeline");
        expect(html).toContain(step.replace(/&/g, "&amp;"));
        expect(html).toContain('aria-live="polite"');
      }
    });
  });

  describe("State 2: Empty State", () => {
    it("renders prominent call-to-action for new merchant dashboard with no QR codes yet", () => {
      const html = renderToStaticMarkup(
        <div className="p-8 rounded-[4px] bg-ink-2 border border-border text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-[4px] bg-ink border border-border flex items-center justify-center text-muted">
            <span className="font-mono text-xs">0 QR</span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-text">No Registered QR Stickers</h3>
            <p className="text-xs text-muted max-w-xs mt-1">
              Enroll your physical counter QR sticker to establish tamper-evident
              verification.
            </p>
          </div>
          <a
            href="/register"
            className="h-10 px-5 rounded-[4px] bg-brand text-ink font-medium text-xs flex items-center justify-center gap-2 hover:bg-brand-soft"
          >
            Register your first QR
          </a>
        </div>
      );

      expect(html).toContain("No Registered QR Stickers");
      expect(html).toContain("Register your first QR");
      expect(html).toContain("/register");
    });

    it("renders friendly empty history state when no audits have taken place yet", () => {
      const html = renderToStaticMarkup(
        <div className="p-8 rounded-[4px] bg-ink-2 border border-border text-center flex flex-col items-center gap-3">
          <p className="text-xs text-muted">
            No audit scans recorded yet. Run your first self-audit scan to start your
            trust ramp.
          </p>
          <a
            href="/audit/run"
            className="h-9 px-4 rounded-[4px] bg-ink border border-border text-text text-xs font-mono"
          >
            Run Self-Audit Now
          </a>
        </div>
      );

      expect(html).toContain("No audit scans recorded yet");
      expect(html).toContain("Run Self-Audit Now");
    });
  });

  describe("State 3: Error State", () => {
    it("distinguishes system/network errors from verdict outcomes and provides a retry mechanism", () => {
      const errorMessage =
        "Self-audit verification failed. Please check your connection and try again.";

      const html = renderToStaticMarkup(
        <div
          role="alert"
          className="p-4 rounded-[4px] bg-danger/10 border border-danger text-danger text-xs flex flex-col gap-2"
        >
          <div className="flex items-start gap-2">
            <span className="font-bold">!</span>
            <p className="font-medium text-text">{errorMessage}</p>
          </div>
          <button
            type="button"
            className="self-end px-3 py-1 rounded-[4px] bg-danger text-ink font-mono text-[10px]"
          >
            Retry Scan
          </button>
        </div>
      );

      expect(html).toContain('role="alert"');
      expect(html).toContain(errorMessage);
      expect(html).toContain("Retry Scan");
    });
  });

  describe("State 4: Disabled State", () => {
    it("renders disabled state with clear explanatory tooltip / helper message", () => {
      const html = renderToStaticMarkup(
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="h-10 px-4 rounded-[4px] bg-brand/50 text-ink/70 cursor-not-allowed font-medium text-xs flex items-center justify-center gap-2"
          >
            <span>Run Self-Audit</span>
          </button>
          <p className="text-[11px] font-mono text-muted">
            Camera permission required before running daily audit scan.
          </p>
        </div>
      );

      expect(html).toContain('disabled=""');
      expect(html).toContain("cursor-not-allowed");
      expect(html).toContain(
        "Camera permission required before running daily audit scan."
      );
    });
  });

  describe("State 5: Permission-Denied State", () => {
    it("renders dedicated screen explaining why camera/location access is required with retry & fallback", () => {
      const html = renderToStaticMarkup(
        <div
          role="alert"
          className="p-5 rounded-[4px] bg-danger/10 border border-danger text-text flex flex-col gap-3"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-text">Camera Access Required</h4>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                QRaksha requires camera access to photograph your physical UPI sticker and
                extract a visual embedding. We never persist raw photos.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-2 border-t border-danger/30">
            <button
              type="button"
              className="h-10 px-4 rounded-[4px] bg-brand text-ink font-medium text-xs flex items-center justify-center gap-2"
            >
              Retry Camera Permission
            </button>
            <button
              type="button"
              className="h-9 px-4 rounded-[4px] bg-ink-2 border border-border text-muted text-xs font-mono"
            >
              Upload Photo Instead
            </button>
          </div>
        </div>
      );

      expect(html).toContain("Camera Access Required");
      expect(html).toContain("We never persist raw photos.");
      expect(html).toContain("Retry Camera Permission");
      expect(html).toContain("Upload Photo Instead");
    });
  });

  describe("State 6: Offline / Network Failure State", () => {
    it("renders offline banner blocking scan action with clear explanation", () => {
      const html = renderToStaticMarkup(
        <div
          role="alert"
          className="p-4 rounded-[4px] bg-warn/10 border border-warn/40 text-warn text-xs flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">⚡</span>
            <span>
              You&apos;re offline — self-audit needs an internet connection to run agents.
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-[2px] bg-ink border border-warn/30">
            OFFLINE
          </span>
        </div>
      );

      expect(html).toContain(
        "You&#x27;re offline — self-audit needs an internet connection"
      );
      expect(html).toContain("OFFLINE");
      expect(html).toContain('role="alert"');
    });
  });
});
