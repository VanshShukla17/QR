"use client";

import React, { useEffect, useState } from "react";
import { ThinkingOrb, type OrbState } from "thinking-orbs";
import {
  VoiceVerdictType,
  VoiceLanguageCode,
  SUPPORTED_VOICE_LANGUAGES,
} from "@qraksha/shared";
import { VoiceState } from "../lib/voice-player";

export interface VoiceOrbProps {
  voiceState: VoiceState;
  verdict: VoiceVerdictType;
  lang: VoiceLanguageCode;
  amplitude?: number; // 0.0 to 1.0
  onTogglePlay: () => void;
  className?: string;
  size?: number; // default 64
}

/**
 * Semantic verdict colors strictly adhering to DESIGN.md Section 2:
 * - VERIFIED: --ok (#2FBF71)
 * - RECENTLY_REGISTERED / UNVERIFIED: --warn (#F2B531)
 * - WARNING: --danger (#E5384F)
 */
const VERDICT_COLOR_MAP: Record<VoiceVerdictType, { hex: string; glowRgba: string }> = {
  VERIFIED: { hex: "#2FBF71", glowRgba: "rgba(47, 191, 113, 0.45)" },
  RECENTLY_REGISTERED: { hex: "#F2B531", glowRgba: "rgba(242, 181, 49, 0.45)" },
  UNVERIFIED: { hex: "#F2B531", glowRgba: "rgba(242, 181, 49, 0.45)" },
  WARNING: { hex: "#E5384F", glowRgba: "rgba(229, 56, 79, 0.55)" },
};

/**
 * Thinking Orb Voice Button for QRaksha.
 * Sits prominently beside or under the verdict card (at least 64px, thumb-reachable).
 *
 * States (driven by voiceState):
 * - idle: soft slow breathing glow. Tap to play or replay the verdict.
 * - thinking: swirling shifting gradient.
 * - speaking: pulses in sync with amplitude (via Web Audio AnalyserNode). Tap to stop.
 * - error: static dimmed state with small retry cue. Tap to retry.
 *
 * Accessibility & prefers-reduced-motion:
 * - Real <button> with aria-label & aria-pressed.
 * - Visible text status accompanying the orb so state is never conveyed by color alone.
 */
export function VoiceOrb({
  voiceState,
  verdict,
  lang,
  amplitude = 0,
  onTogglePlay,
  className = "",
  size = 64,
}: VoiceOrbProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "matchMedia" in window) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, []);

  // Haptic buzz on WARNING state when speaking starts
  useEffect(() => {
    if (voiceState === "speaking" && verdict === "WARNING") {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([100, 50, 100]);
        } catch {
          // Ignore vibration errors
        }
      }
    }
  }, [voiceState, verdict]);

  const colorConfig = VERDICT_COLOR_MAP[verdict] || VERDICT_COLOR_MAP.WARNING;
  const langName = SUPPORTED_VOICE_LANGUAGES[lang]?.nativeLabel || "Audio";

  // Map voiceState to ThinkingOrb state
  let orbInternalState: OrbState = "breathing";
  let speedMultiplier = verdict === "WARNING" ? 1.6 : 1.0;

  if (voiceState === "thinking") {
    orbInternalState = "working";
    speedMultiplier = 1.3;
  } else if (voiceState === "speaking") {
    orbInternalState = "listening";
    speedMultiplier = verdict === "WARNING" ? 2.0 : 1.4;
  } else if (voiceState === "error") {
    orbInternalState = "breathing";
  }

  // Dynamic scale and glow driven by amplitude (or static if reduced motion)
  const isSpeaking = voiceState === "speaking";
  const scale = !prefersReducedMotion && isSpeaking ? 1 + amplitude * 0.18 : 1.0;
  const glowBlur = !prefersReducedMotion && isSpeaking ? 12 + amplitude * 24 : 12;

  // Status text for accessibility and clarity
  let statusText = "Tap to listen";
  if (voiceState === "thinking") {
    statusText = "Preparing audio…";
  } else if (voiceState === "speaking") {
    statusText = "Speaking (tap to stop)";
  } else if (voiceState === "error") {
    statusText = "Audio unavailable (tap to retry)";
  } else if (voiceState === "idle") {
    statusText = "Tap to replay";
  }

  const ariaLabel = isSpeaking
    ? `Stop playing verdict in ${langName}`
    : `Play verdict in ${langName}`;

  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={ariaLabel}
        aria-pressed={isSpeaking}
        className={`group relative flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-4 ${
          voiceState === "error" ? "opacity-60 grayscale" : "opacity-100"
        }`}
        style={{
          width: `${Math.max(64, size)}px`,
          height: `${Math.max(64, size)}px`,
          backgroundColor: "#1C0F0B", // --bg-ink-2
          border: `1.5px solid ${colorConfig.hex}`,
          boxShadow:
            voiceState === "error" ? "none" : `0 0 ${glowBlur}px ${colorConfig.glowRgba}`,
          transform: `scale(${scale})`,
        }}
      >
        <div className="pointer-events-none select-none flex items-center justify-center">
          <ThinkingOrb
            state={orbInternalState}
            size={64}
            theme="dark"
            color={colorConfig.hex}
            speed={prefersReducedMotion ? 0 : speedMultiplier}
            paused={prefersReducedMotion || voiceState === "error"}
            aria-hidden="true"
            style={{
              width: `${Math.max(56, size - 8)}px`,
              height: `${Math.max(56, size - 8)}px`,
            }}
          />
        </div>

        {/* Small retry cue icon on error */}
        {voiceState === "error" && (
          <span
            className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-danger text-ink flex items-center justify-center text-[10px] font-bold"
            aria-hidden="true"
          >
            !
          </span>
        )}
      </button>

      {/* Accompanying text status: never rely on color alone */}
      <span
        aria-live="polite"
        className="text-[11px] font-mono tracking-tight text-center text-muted select-none"
      >
        {statusText}
      </span>
    </div>
  );
}
