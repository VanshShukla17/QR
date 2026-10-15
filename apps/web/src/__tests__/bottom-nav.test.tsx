import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BottomNav } from "../components/bottom-nav";
import { AIAssistantButton } from "../components/ai-assistant-button";
import { AIAssistantSheet } from "../components/ai-assistant-sheet";

// Mock next/navigation
const mockPathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

describe("BottomNav & AI Assistant Redesign", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/dashboard");
  });

  describe("BottomNav Component", () => {
    it("renders floating navigation with four items and assistant button on merchant dashboard", () => {
      mockPathname.mockReturnValue("/dashboard");
      const html = renderToStaticMarkup(<BottomNav />);

      expect(html).toContain('aria-label="Main Navigation"');
      expect(html).toContain('href="/dashboard"');
      expect(html).toContain('href="/audit/run"');
      expect(html).toContain('href="/audit/history"');
      expect(html).toContain('href="/settings"');
      expect(html).toContain('aria-current="page"');
      expect(html).toContain('aria-label="Open QRaksha assistant"');
    });

    it("hides navigation on landing page ('/') and admin routes", () => {
      mockPathname.mockReturnValue("/");
      const landingHtml = renderToStaticMarkup(<BottomNav />);
      expect(landingHtml).toBe("");

      mockPathname.mockReturnValue("/admin/credentials");
      const adminHtml = renderToStaticMarkup(<BottomNav />);
      expect(adminHtml).toBe("");
    });

    it("correctly identifies active route on audit run", () => {
      mockPathname.mockReturnValue("/audit/run");
      const html = renderToStaticMarkup(<BottomNav />);

      expect(html).toContain('href="/audit/run"');
      expect(html).toContain('aria-current="page"');
      expect(html).toContain('aria-label="Verify"');
    });

    it("correctly identifies active route on audit history", () => {
      mockPathname.mockReturnValue("/audit/history");
      const html = renderToStaticMarkup(<BottomNav />);

      expect(html).toContain('href="/audit/history"');
      expect(html).toContain('aria-current="page"');
      expect(html).toContain('aria-label="History"');
    });

    it("correctly identifies active route on settings / merchant profile", () => {
      mockPathname.mockReturnValue("/settings");
      const html = renderToStaticMarkup(<BottomNav />);

      expect(html).toContain('href="/settings"');
      expect(html).toContain('aria-current="page"');
      expect(html).toContain('aria-label="Merchant"');
    });
  });

  describe("AIAssistantButton Component", () => {
    it("renders a circular button with 48px/52px sizing, surface tokens, and thinking orb", () => {
      const html = renderToStaticMarkup(<AIAssistantButton />);

      expect(html).toContain('aria-label="Open QRaksha assistant"');
      expect(html).toContain("rounded-full");
      expect(html).toContain("bg-surface");
      expect(html).toContain("border-brand");
      expect(html).toContain("<canvas");
    });

    it("switches aria-label and state to listening when open", () => {
      const html = renderToStaticMarkup(<AIAssistantButton isOpen={true} />);

      expect(html).toContain('aria-label="Close QRaksha assistant"');
      expect(html).toContain('aria-expanded="true"');
    });

    it("supports custom state prop for future verification/replies", () => {
      const html = renderToStaticMarkup(<AIAssistantButton state="searching" />);
      expect(html).toContain("<canvas");
    });
  });

  describe("AIAssistantSheet Component", () => {
    it("does not render when isOpen is false", () => {
      const html = renderToStaticMarkup(
        <AIAssistantSheet isOpen={false} onClose={() => {}} />
      );
      expect(html).toBe("");
    });

    it("renders dialog with title, eyebrow, and close button when isOpen is true", () => {
      const html = renderToStaticMarkup(
        <AIAssistantSheet isOpen={true} onClose={() => {}} />
      );

      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain("AI ASSISTANT");
      expect(html).toContain("QRaksha Assistant");
      expect(html).toContain("Sarvam Bulbul AI Voice Copilot");
      expect(html).toContain('aria-label="Close assistant"');
    });
  });
});
