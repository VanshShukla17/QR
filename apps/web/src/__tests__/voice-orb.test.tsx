import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VoiceOrb } from "../components/voice-orb";
import { LanguageSelector } from "../components/language-selector";

describe("VoiceOrb Thinking Orb Component Tests", () => {
  it("renders in IDLE state with play cue and accessible button", () => {
    const html = renderToStaticMarkup(
      <VoiceOrb
        voiceState="idle"
        verdict="VERIFIED"
        lang="en-IN"
        onTogglePlay={() => {}}
      />
    );

    expect(html).toContain("<button");
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("Play verdict in English");
    expect(html).toContain("Tap to replay");
    // Semantic VERIFIED color: #2FBF71
    expect(html).toContain("#2FBF71");
  });

  it("renders in THINKING state while audio request is in flight", () => {
    const html = renderToStaticMarkup(
      <VoiceOrb
        voiceState="thinking"
        verdict="RECENTLY_REGISTERED"
        lang="hi-IN"
        onTogglePlay={() => {}}
      />
    );

    expect(html).toContain("<button");
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("Preparing audio…");
    // Semantic RECENTLY_REGISTERED color: #F2B531
    expect(html).toContain("#F2B531");
  });

  it("renders in SPEAKING state with active aria-pressed and stop cue", () => {
    const html = renderToStaticMarkup(
      <VoiceOrb
        voiceState="speaking"
        verdict="WARNING"
        lang="kn-IN"
        amplitude={0.75}
        onTogglePlay={() => {}}
      />
    );

    expect(html).toContain("<button");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Stop playing verdict in ಕನ್ನಡ");
    expect(html).toContain("Speaking (tap to stop)");
    // Semantic WARNING color: #E5384F
    expect(html).toContain("#E5384F");
  });

  it("renders in ERROR state with retry cue and dimmed opacity", () => {
    const html = renderToStaticMarkup(
      <VoiceOrb
        voiceState="error"
        verdict="UNVERIFIED"
        lang="en-IN"
        onTogglePlay={() => {}}
      />
    );

    expect(html).toContain("<button");
    expect(html).toContain("Audio unavailable (tap to retry)");
    expect(html).toContain("opacity-60");
    // Retry exclamation badge
    expect(html).toContain("!");
  });

  it("ensures state is never conveyed by color alone: includes visible text status", () => {
    const states = ["idle", "thinking", "speaking", "error"] as const;
    for (const state of states) {
      const html = renderToStaticMarkup(
        <VoiceOrb
          voiceState={state}
          verdict="VERIFIED"
          lang="en-IN"
          onTogglePlay={() => {}}
        />
      );

      // Must have aria-live region with text status
      expect(html).toContain('aria-live="polite"');
    }
  });

  it("LanguageSelector renders English, Hindi, and Kannada buttons", () => {
    const html = renderToStaticMarkup(
      <LanguageSelector currentLang="en-IN" onSelectLang={() => {}} />
    );

    expect(html).toContain("English");
    expect(html).toContain("हिन्दी");
    expect(html).toContain("ಕನ್ನಡ");
    expect(html).toContain('role="group"');
  });
});
