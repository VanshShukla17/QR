import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { VerdictCard } from "../components/verdict-card";
import { AuditResult } from "../lib/api";

describe("Phase 5 — Verdict Card Component Tests (All 3 Tiers & Evidence Rows)", () => {
  const baseVerifiedResult: AuditResult = {
    verdict: "VERIFIED",
    reason: "OK",
    message: "Physical sticker matches registered location, embedding, and identity.",
    credentialId: "550e8400-e29b-41d4-a716-446655440000",
    auditRunId: "run-12345678-abcd",
    agentOutputs: {
      identity: { status: "pass", reason: "Payload matched registered credential" },
      vision: { status: "pass", score: 0.94, reason: "Visual embedding compared" },
      context: { status: "pass", reason: "GPS proximity verified" },
    },
    degradedCheck: false,
  };

  const baseUnverifiedResult: AuditResult = {
    verdict: "RECENTLY_REGISTERED",
    reason: "OK",
    message: "Sticker is active and clean, currently building trust ramp.",
    credentialId: "550e8400-e29b-41d4-a716-446655440001",
    auditRunId: "run-22345678-abcd",
    agentOutputs: {
      identity: { status: "pass", reason: "Payload matched registered credential" },
      vision: { status: "pass", score: 0.88, reason: "Visual embedding compared" },
      context: { status: "pass", reason: "GPS proximity verified" },
    },
    degradedCheck: false,
  };

  const baseWarningResult: AuditResult = {
    verdict: "WARNING",
    reason: "UNKNOWN_QR",
    message:
      "Unknown QR sticker: This payload is not registered to any merchant in QRaksha.",
    credentialId: undefined,
    auditRunId: "run-32345678-abcd",
    agentOutputs: {
      identity: { status: "fail", reason: "QR payload unknown in registry" },
      vision: { status: "pass", metadata: { skipped: true } },
      context: { status: "pass", reason: "GPS proximity verified" },
    },
    degradedCheck: false,
  };

  describe("Tier 1: 🟢 VERIFIED Result Card", () => {
    it("renders semantic green styling, ShieldCheck, and VERIFIED label", () => {
      const html = renderToStaticMarkup(<VerdictCard result={baseVerifiedResult} />);

      // Green semantic border & text tokens per DESIGN.md Section 2
      expect(html).toContain("border-l-ok");
      expect(html).toContain("text-ok");
      expect(html).toContain("VERIFIED");
      expect(html).toContain("REASON // OK");
      expect(html).toContain("run-1234");
      expect(html).toContain("Physical sticker matches registered location");

      // Evidence breakdown
      expect(html).toContain("Identity Agent");
      expect(html).toContain("Vision Agent");
      expect(html).toContain("Context Agent");
      expect(html).toContain("PASS");
    });
  });

  describe("Tier 2: 🟡 RECENTLY_REGISTERED / UNVERIFIED Result Card", () => {
    it("renders semantic yellow styling, Shield, and BUILDING TRUST label for merchant view", () => {
      const html = renderToStaticMarkup(
        <VerdictCard result={baseUnverifiedResult} isCustomerView={false} />
      );

      // Yellow semantic border & text tokens per DESIGN.md Section 2
      expect(html).toContain("border-l-warn");
      expect(html).toContain("text-warn");
      expect(html).toContain("BUILDING TRUST");
      expect(html).toContain("Security State");
      expect(html).toContain("Sticker is active and clean");
    });

    it("renders NOT ENROLLED label when isUnregistered is true for customer view", () => {
      const customerUnregistered: AuditResult = {
        ...baseUnverifiedResult,
        isUnregistered: true,
        message: "This merchant is not yet registered with QRaksha.",
      };

      const html = renderToStaticMarkup(
        <VerdictCard result={customerUnregistered} isCustomerView={true} />
      );

      expect(html).toContain("border-l-warn");
      expect(html).toContain("NOT ENROLLED");
      expect(html).toContain("Merchant Status");
    });
  });

  describe("Tier 3: 🔴 WARNING Result Card", () => {
    it("renders semantic red styling, ShieldAlert, and WARNING label", () => {
      const html = renderToStaticMarkup(<VerdictCard result={baseWarningResult} />);

      // Red semantic border & text tokens per DESIGN.md Section 2
      expect(html).toContain("border-l-danger");
      expect(html).toContain("text-danger");
      expect(html).toContain("WARNING");
      expect(html).toContain("REASON // UNKNOWN_QR");
      expect(html).toContain("FLAG");
    });

    it("NEVER uses brand orange for WARNING state (DESIGN.md Section 10 Rule)", () => {
      const html = renderToStaticMarkup(<VerdictCard result={baseWarningResult} />);

      // Verify that warning header/badge/border does NOT use brand orange
      // The card container must have border-l-danger, not border-l-brand
      expect(html).not.toContain("border-l-brand");
      expect(html).not.toContain("text-brand");
      // The card container background badge must not be brand
      expect(html).toContain("bg-danger/15 text-[#FF6B81] border-danger/40");
    });

    it("renders distinct SUSPENDED label when reason is CREDENTIAL_SUSPENDED", () => {
      const suspendedResult: AuditResult = {
        ...baseWarningResult,
        reason: "CREDENTIAL_SUSPENDED",
        message:
          "Credential has been suspended or revoked. Payments to this QR are disabled.",
      };
      const html = renderToStaticMarkup(<VerdictCard result={suspendedResult} />);

      expect(html).toContain("SUSPENDED");
      expect(html).toContain("border-l-danger");
      expect(html).toContain("REASON // CREDENTIAL_SUSPENDED");
    });

    it("renders distinct LOCATION MISMATCH label when reason is LOCATION_MISMATCH", () => {
      const locationMismatchResult: AuditResult = {
        ...baseWarningResult,
        reason: "LOCATION_MISMATCH",
        message: "QR relocation detected: scan outside authorized radius",
      };
      const html = renderToStaticMarkup(<VerdictCard result={locationMismatchResult} />);

      expect(html).toContain("LOCATION MISMATCH");
      expect(html).toContain("border-l-danger");
      expect(html).toContain("REASON // LOCATION_MISMATCH");
    });
  });

  describe("Degraded Check Badge & Evidence Variations", () => {
    it("renders DEGRADED CHECK badge when degradedCheck is true", () => {
      const degradedResult: AuditResult = {
        ...baseVerifiedResult,
        degradedCheck: true,
      };

      const html = renderToStaticMarkup(<VerdictCard result={degradedResult} />);

      expect(html).toContain("DEGRADED CHECK");
    });

    it("renders SOFT WARN chip for vision agent when score is low", () => {
      const softWarnResult: AuditResult = {
        ...baseVerifiedResult,
        agentOutputs: {
          ...baseVerifiedResult.agentOutputs,
          vision: { status: "warn", score: 0.55, reason: "Visual variance detected" },
        },
      };

      const html = renderToStaticMarkup(<VerdictCard result={softWarnResult} />);

      expect(html).toContain("SOFT WARN");
      expect(html).toContain("Visual variance detected");
    });

    it("renders RELOCATED chip for context agent when location is outside radius", () => {
      const relocatedResult: AuditResult = {
        ...baseWarningResult,
        reason: "LOCATION_MISMATCH",
        agentOutputs: {
          identity: { status: "pass", reason: "Registered genuine QR" },
          context: {
            status: "fail",
            reason: "QR relocation detected (2.4km outside premises)",
          },
        },
      };

      const html = renderToStaticMarkup(<VerdictCard result={relocatedResult} />);

      expect(html).toContain("RELOCATED");
      expect(html).toContain("QR relocation detected");
    });

    it("renders action reset button when onReset callback is provided", () => {
      const html = renderToStaticMarkup(
        <VerdictCard result={baseVerifiedResult} onReset={() => {}} />
      );

      expect(html).toContain("Scan Another QR Sticker");
    });

    it("renders translated Hindi verdict label and subtitle when lang is hi-IN", () => {
      const html = renderToStaticMarkup(
        <VerdictCard result={baseVerifiedResult} lang="hi-IN" />
      );

      expect(html).toContain("सत्यापित");
      expect(html).toContain("सत्यापित व्यापारी • भुगतान सुरक्षित है");
    });

    it("renders translated Kannada verdict label and subtitle when lang is kn-IN", () => {
      const html = renderToStaticMarkup(
        <VerdictCard result={baseWarningResult} lang="kn-IN" />
      );

      expect(html).toContain("ಎಚ್ಚರಿಕೆ");
      expect(html).toContain("ಅನುಮಾನಾಸ್ಪದ ಕ್ಯೂಆರ್ ಕೋಡ್ • ಪಾವತಿ ಮಾಡಬೇಡಿ");
    });
  });
});
