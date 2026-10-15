import { describe, expect, it } from "vitest";
import { calculateTrustScore } from "../services/trust-ramp.service.js";

describe("Phase 5 — Trust Ramp Scoring Formula & Boundary Thresholds", () => {
  describe("Component Maximum Value Caps", () => {
    it("caps time component at exactly 40 points (10 days * 4)", () => {
      // 9 days * 4 = 36
      const res9 = calculateTrustScore({
        identityTier: "gst_verified",
        daysSinceActivation: 9,
        cleanAuditCount: 0,
        attestationDiversityScore: 0,
        hasUnresolvedWarning: false,
      });
      expect(res9.score).toBe(36);

      // 10 days * 4 = 40 (exact cap)
      const res10 = calculateTrustScore({
        identityTier: "gst_verified",
        daysSinceActivation: 10,
        cleanAuditCount: 0,
        attestationDiversityScore: 0,
        hasUnresolvedWarning: false,
      });
      expect(res10.score).toBe(40);

      // 11 days (would be 44) capped at 40
      const res11 = calculateTrustScore({
        identityTier: "gst_verified",
        daysSinceActivation: 11,
        cleanAuditCount: 0,
        attestationDiversityScore: 0,
        hasUnresolvedWarning: false,
      });
      expect(res11.score).toBe(40);

      // 365 days capped at 40
      const res365 = calculateTrustScore({
        identityTier: "gst_verified",
        daysSinceActivation: 365,
        cleanAuditCount: 0,
        attestationDiversityScore: 0,
        hasUnresolvedWarning: false,
      });
      expect(res365.score).toBe(40);
    });

    it("caps audit component at exactly 30 points (10 audits * 3)", () => {
      // 9 audits * 3 = 27
      const res9 = calculateTrustScore({
        identityTier: "gst_verified",
        daysSinceActivation: 0,
        cleanAuditCount: 9,
        attestationDiversityScore: 0,
        hasUnresolvedWarning: false,
      });
      expect(res9.score).toBe(27);

      // 10 audits * 3 = 30 (exact cap)
      const res10 = calculateTrustScore({
        identityTier: "gst_verified",
        daysSinceActivation: 0,
        cleanAuditCount: 10,
        attestationDiversityScore: 0,
        hasUnresolvedWarning: false,
      });
      expect(res10.score).toBe(30);

      // 11 audits (would be 33) capped at 30
      const res11 = calculateTrustScore({
        identityTier: "gst_verified",
        daysSinceActivation: 0,
        cleanAuditCount: 11,
        attestationDiversityScore: 0,
        hasUnresolvedWarning: false,
      });
      expect(res11.score).toBe(30);
    });

    it("caps attestation component at exactly 30 points (diversity * 30)", () => {
      // 0.5 diversity * 30 = 15
      const resHalf = calculateTrustScore({
        identityTier: "gst_verified",
        daysSinceActivation: 0,
        cleanAuditCount: 0,
        attestationDiversityScore: 0.5,
        hasUnresolvedWarning: false,
      });
      expect(resHalf.score).toBe(15);

      // 1.0 diversity * 30 = 30 (exact cap)
      const resFull = calculateTrustScore({
        identityTier: "gst_verified",
        daysSinceActivation: 0,
        cleanAuditCount: 0,
        attestationDiversityScore: 1.0,
        hasUnresolvedWarning: false,
      });
      expect(resFull.score).toBe(30);

      // >1.0 diversity capped at 30
      const resOver = calculateTrustScore({
        identityTier: "gst_verified",
        daysSinceActivation: 0,
        cleanAuditCount: 0,
        attestationDiversityScore: 1.5,
        hasUnresolvedWarning: false,
      });
      expect(resOver.score).toBe(30);
    });
  });

  describe("Score Boundary Values Around 60 Threshold", () => {
    it("keeps status UNVERIFIED when score is 59 (1 point below threshold)", () => {
      // time: 3 days * 4 = 12
      // audits: 9 audits * 3 = 27
      // attestation: 0.6667 * 30 = 20
      // 12 + 27 + 20 = 59
      const result = calculateTrustScore({
        identityTier: "gst_verified",
        daysSinceActivation: 3,
        cleanAuditCount: 9,
        attestationDiversityScore: 20 / 30,
        hasUnresolvedWarning: false,
      });

      expect(result.score).toBe(59);
      expect(result.tier).toBe("unverified");
    });

    it("promotes to VERIFIED when score is exactly 60 (exact threshold)", () => {
      // time: 3 days * 4 = 12
      // audits: 8 audits * 3 = 24
      // attestation: 0.8 * 30 = 24
      // 12 + 24 + 24 = 60
      const result = calculateTrustScore({
        identityTier: "gst_verified",
        daysSinceActivation: 3,
        cleanAuditCount: 8,
        attestationDiversityScore: 0.8,
        hasUnresolvedWarning: false,
      });

      expect(result.score).toBe(60);
      expect(result.tier).toBe("verified");
    });

    it("promotes to VERIFIED when score is 61 (1 point above threshold)", () => {
      // time: 3 days * 4 = 12
      // audits: 7 audits * 3 = 21
      // attestation: 28 points
      // 12 + 21 + 28 = 61
      const result = calculateTrustScore({
        identityTier: "gst_verified",
        daysSinceActivation: 3,
        cleanAuditCount: 7,
        attestationDiversityScore: 28 / 30,
        hasUnresolvedWarning: false,
      });

      expect(result.score).toBe(61);
      expect(result.tier).toBe("verified");
    });
  });

  describe("Day Minimum Threshold Gates (GST vs Baseline)", () => {
    it("GST Tier: blocks VERIFIED at Day 0, Day 1, and Day 2 even if score >= 60", () => {
      // audits (30) + attestation (30) = 60 points on Day 0/1/2
      for (const days of [0, 1, 2]) {
        const result = calculateTrustScore({
          identityTier: "gst_verified",
          daysSinceActivation: days,
          cleanAuditCount: 10,
          attestationDiversityScore: 1.0,
          hasUnresolvedWarning: false,
        });

        expect(result.score).toBeGreaterThanOrEqual(60);
        expect(result.tier).toBe("unverified");
      }
    });

    it("GST Tier: permits VERIFIED at exactly Day 3 when score >= 60", () => {
      const result = calculateTrustScore({
        identityTier: "gst_verified",
        daysSinceActivation: 3,
        cleanAuditCount: 10,
        attestationDiversityScore: 1.0,
        hasUnresolvedWarning: false,
      });

      // 12 + 30 + 30 = 72
      expect(result.score).toBe(72);
      expect(result.tier).toBe("verified");
    });

    it("Baseline Tier: blocks VERIFIED through Day 6 even if score is high (>= 60)", () => {
      for (const days of [0, 1, 2, 3, 4, 5, 6]) {
        const result = calculateTrustScore({
          identityTier: "baseline",
          daysSinceActivation: days,
          cleanAuditCount: 10,
          attestationDiversityScore: 1.0,
          hasUnresolvedWarning: false,
        });

        expect(result.score).toBeGreaterThanOrEqual(60);
        expect(result.tier).toBe("unverified");
      }
    });

    it("Baseline Tier: permits VERIFIED at exactly Day 7 when score >= 60", () => {
      const result = calculateTrustScore({
        identityTier: "baseline",
        daysSinceActivation: 7,
        cleanAuditCount: 10,
        attestationDiversityScore: 1.0,
        hasUnresolvedWarning: false,
      });

      // 28 + 30 + 30 = 88
      expect(result.score).toBe(88);
      expect(result.tier).toBe("verified");
    });
  });

  describe("Single WARNING Hard Override Rule", () => {
    it("immediately overrides score to 0 and tier to WARNING if unresolved warning exists", () => {
      const result = calculateTrustScore({
        identityTier: "gst_verified",
        daysSinceActivation: 100,
        cleanAuditCount: 100,
        attestationDiversityScore: 1.0,
        hasUnresolvedWarning: true,
      });

      expect(result.score).toBe(0);
      expect(result.tier).toBe("warning");
    });
  });

  describe("Extremes: Minimum (0) and Maximum (100)", () => {
    it("returns score 0 and tier unverified for fresh unactivated credential", () => {
      const result = calculateTrustScore({
        identityTier: "baseline",
        daysSinceActivation: 0,
        cleanAuditCount: 0,
        attestationDiversityScore: 0,
        hasUnresolvedWarning: false,
      });

      expect(result.score).toBe(0);
      expect(result.tier).toBe("unverified");
    });

    it("returns score 100 and tier verified when all components reach maximum cap", () => {
      const result = calculateTrustScore({
        identityTier: "gst_verified",
        daysSinceActivation: 10, // 40
        cleanAuditCount: 10, // 30
        attestationDiversityScore: 1.0, // 30
        hasUnresolvedWarning: false,
      });

      expect(result.score).toBe(100);
      expect(result.tier).toBe("verified");
    });
  });
});
