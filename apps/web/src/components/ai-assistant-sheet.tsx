"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { X, Play, Square } from "lucide-react";
import { AnimatedSparklesIcon, AnimatedQrIcon } from "@/components/icons/animated";
import { VoiceVerdictType, VoiceLanguageCode, formatVoiceScript } from "@qraksha/shared";
import { VoiceOrb } from "@/components/voice-orb";
import {
  LanguageSelector,
  getInitialVoiceLanguage,
} from "@/components/language-selector";
import { VoicePlayer, VoiceState } from "@/lib/voice-player";

export interface AIAssistantSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_MERCHANTS: Record<
  VoiceLanguageCode,
  Record<VoiceVerdictType, string | undefined>
> = {
  "en-IN": {
    VERIFIED: "Sharma General Store",
    RECENTLY_REGISTERED: "Chai Point",
    UNVERIFIED: undefined,
    WARNING: undefined,
  },
  "hi-IN": {
    VERIFIED: "शर्मा जनरल स्टोर",
    RECENTLY_REGISTERED: "चाय पॉइंट",
    UNVERIFIED: undefined,
    WARNING: undefined,
  },
  "kn-IN": {
    VERIFIED: "ಶರ್ಮಾ ಜನರಲ್ ಸ್ಟೋರ್",
    RECENTLY_REGISTERED: "ಚಾಯ್ ಪಾಯಿಂಟ್",
    UNVERIFIED: undefined,
    WARNING: undefined,
  },
};

const VERDICT_OPTIONS: Array<{
  key: VoiceVerdictType;
  label: string;
  badge: string;
  color: string;
}> = [
  {
    key: "VERIFIED",
    label: "Verified",
    badge: "🟢 Safe",
    color: "text-[#2FBF71] border-[#2FBF71]/40",
  },
  {
    key: "RECENTLY_REGISTERED",
    label: "Building Trust",
    badge: "🟡 Caution",
    color: "text-[#F2B531] border-[#F2B531]/40",
  },
  {
    key: "UNVERIFIED",
    label: "Unverified",
    badge: "⚪ Not Found",
    color: "text-[#B8A8A2] border-[#B8A8A2]/40",
  },
  {
    key: "WARNING",
    label: "Warning",
    badge: "🔴 Swap Alert",
    color: "text-[#E5384F] border-[#E5384F]/40",
  },
];

/**
 * QRaksha AI Voice Assistant Sheet.
 * Built with DESIGN.md tokens: dark warm surface (--bg-ink-2),
 * brand line border (--line-dark), mono eyebrow, and Satoshi headings.
 * Provides interactive multilingual voice assistance powered by Sarvam Bulbul TTS.
 */
export function AIAssistantSheet({ isOpen, onClose }: AIAssistantSheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Voice Assistant State
  const [selectedVerdict, setSelectedVerdict] = useState<VoiceVerdictType>("VERIFIED");
  const [voiceLang, setVoiceLang] = useState<VoiceLanguageCode>("en-IN");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [amplitude, setAmplitude] = useState<number>(0);
  const playerRef = useRef<VoicePlayer | null>(null);

  // Initialize language from preferences
  useEffect(() => {
    setVoiceLang(getInitialVoiceLanguage());
  }, []);

  // Initialize VoicePlayer
  useEffect(() => {
    const player = new VoicePlayer({
      onStateChange: (state) => setVoiceState(state),
      onAmplitudeChange: (amp) => setAmplitude(amp),
      onError: () => setVoiceState("error"),
    });
    playerRef.current = player;

    return () => {
      player.stop();
    };
  }, []);

  // Stop audio and reset state when sheet is closed
  useEffect(() => {
    if (!isOpen) {
      playerRef.current?.stop();
      setVoiceState("idle");
      setAmplitude(0);
    }
  }, [isOpen]);

  // Focus trap / keyboard accessibility (Escape closes modal)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handlePlayVoice = useCallback(
    (
      verdictKey: VoiceVerdictType = selectedVerdict,
      langKey: VoiceLanguageCode = voiceLang
    ) => {
      playerRef.current?.primeAudioContext();

      if (
        voiceState === "speaking" &&
        verdictKey === selectedVerdict &&
        langKey === voiceLang
      ) {
        playerRef.current?.stop();
        setVoiceState("idle");
        return;
      }

      playerRef.current?.playVerdict(
        verdictKey,
        langKey,
        SAMPLE_MERCHANTS[langKey]?.[verdictKey]
      );
    },
    [selectedVerdict, voiceLang, voiceState]
  );

  const handleSelectVerdict = useCallback(
    (verdictKey: VoiceVerdictType) => {
      setSelectedVerdict(verdictKey);
      handlePlayVoice(verdictKey, voiceLang);
    },
    [handlePlayVoice, voiceLang]
  );

  const handleLanguageChange = useCallback(
    (newLang: VoiceLanguageCode) => {
      setVoiceLang(newLang);
      if (voiceState === "speaking") {
        handlePlayVoice(selectedVerdict, newLang);
      }
    },
    [handlePlayVoice, selectedVerdict, voiceState]
  );

  if (!isOpen) return null;

  const activeMerchantName = SAMPLE_MERCHANTS[voiceLang]?.[selectedVerdict];
  const spokenScript = formatVoiceScript(selectedVerdict, voiceLang, activeMerchantName);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assistant-title"
      className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
        aria-hidden="true"
      />

      {/* Sheet Container with frosted glassmorphic styling */}
      <div className="relative w-full max-w-[480px] mx-auto bg-[var(--surface)]/95 backdrop-blur-2xl border-t border-x border-[var(--surface-border)] rounded-t-[28px] shadow-[0_-8px_32px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.08)] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-4 animate-in fade-in slide-in-from-bottom duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[#E0262F] font-semibold">
              <AnimatedSparklesIcon size={14} isHovered={true} className="w-3.5 h-3.5" />
              <span>AI ASSISTANT</span>
            </div>
            <h2
              id="assistant-title"
              className="text-lg font-bold text-[var(--text-primary)]"
            >
              QRaksha Assistant
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close assistant"
            className="group flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-[#E0262F] focus-visible:outline-offset-2 cursor-pointer"
          >
            <X className="w-5 h-5 transition-transform duration-200 group-hover:rotate-90 group-hover:scale-110" />
          </button>
        </div>

        {/* Top Control Bar: Language Selection */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-[16px] bg-[var(--box-mono-bg)] border border-[var(--box-mono-border)]">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-medium">
            Language
          </span>
          <LanguageSelector currentLang={voiceLang} onSelectLang={handleLanguageChange} />
        </div>

        {/* Interactive Voice Orb Hero Section */}
        <div className="p-5 rounded-[24px] bg-[var(--bg-app)] border border-[var(--surface-border)] flex flex-col items-center justify-center gap-3 text-center shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)] tracking-wider font-medium">
            Sarvam Bulbul AI Voice Copilot
          </span>

          <VoiceOrb
            voiceState={voiceState}
            verdict={selectedVerdict}
            lang={voiceLang}
            amplitude={amplitude}
            onTogglePlay={() => handlePlayVoice(selectedVerdict, voiceLang)}
            size={72}
          />

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePlayVoice(selectedVerdict, voiceLang)}
              className="flex items-center gap-1.5 text-xs font-mono px-3.5 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--surface-border)] hover:border-[#E0262F] text-[var(--text-primary)] shadow-sm transition-colors cursor-pointer"
            >
              {voiceState === "speaking" ? (
                <>
                  <Square className="w-3.5 h-3.5 text-[#E0262F] fill-current" />
                  <span>Stop Speech</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-[#E0262F] fill-current" />
                  <span>Tap to Speak</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Spoken Script Transcription */}
        <div className="p-4 rounded-[16px] bg-[var(--box-mono-bg)] border border-[var(--box-mono-border)] flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)]">
            <span className="uppercase tracking-wider font-medium">
              Voice Script ({voiceLang})
            </span>
            {activeMerchantName && (
              <span className="text-[var(--text-primary)] font-sans font-semibold text-[11px]">
                {activeMerchantName}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-primary)]/90 leading-relaxed font-sans italic">
            &ldquo;{spokenScript}&rdquo;
          </p>
        </div>

        {/* Verdict Simulation Controls */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-medium">
              Test Audio Verdicts
            </span>
            <span className="text-[10px] font-mono text-[#E0262F] font-semibold">
              Select to Preview
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {VERDICT_OPTIONS.map((opt) => {
              const isSelected = selectedVerdict === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleSelectVerdict(opt.key)}
                  aria-pressed={isSelected}
                  className={`p-3 rounded-[14px] border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? `bg-[var(--surface)] shadow-[0_4px_16px_rgba(224,38,47,0.12)] border-[#E0262F]/40`
                      : "bg-[var(--box-mono-bg)] border-[var(--box-mono-border)] text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold font-sans text-[var(--text-primary)]">
                      {opt.label}
                    </span>
                    <span className="text-[10px] font-mono">{opt.badge}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Action Navigation */}
        <div className="pt-2 border-t border-[var(--surface-border)] flex items-center justify-between gap-3">
          <Link
            href="/check"
            onClick={onClose}
            className="group flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-[16px] bg-[#E0262F] text-white font-medium text-xs hover:bg-[#E0262F]/90 transition-colors shadow-sm"
          >
            <AnimatedQrIcon size={16} isHovered={true} />
            <span>Scan & Check QR</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
