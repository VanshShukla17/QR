"use client";

import React from "react";

import { VoiceLanguageCode, SUPPORTED_VOICE_LANGUAGES } from "@qraksha/shared";
import { SpeakerHigh } from "@phosphor-icons/react";

const STORAGE_KEY = "qraksha_voice_lang";

export function getInitialVoiceLanguage(): VoiceLanguageCode {
  if (typeof window === "undefined") {
    return "en-IN";
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY) as VoiceLanguageCode | null;
    if (saved && SUPPORTED_VOICE_LANGUAGES[saved]) {
      return saved;
    }
  } catch {
    // Ignore localStorage errors
  }

  // Detect from browser language
  if (typeof navigator !== "undefined" && navigator.language) {
    const navLang = navigator.language.toLowerCase();
    if (navLang.startsWith("kn")) return "kn-IN";
    if (navLang.startsWith("hi")) return "hi-IN";
  }

  return "en-IN";
}

export function saveVoiceLanguage(lang: VoiceLanguageCode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Ignore localStorage errors
  }
}

export interface LanguageSelectorProps {
  currentLang: VoiceLanguageCode;
  onSelectLang: (lang: VoiceLanguageCode) => void;
  className?: string;
}

export function LanguageSelector({
  currentLang,
  onSelectLang,
  className = "",
}: LanguageSelectorProps) {
  const languages: VoiceLanguageCode[] = ["en-IN", "hi-IN", "kn-IN"];

  const handleSelect = (lang: VoiceLanguageCode) => {
    saveVoiceLanguage(lang);
    onSelectLang(lang);
  };

  return (
    <div
      role="group"
      aria-label="Select voice assistant language"
      className={`flex items-center gap-1 p-1 rounded-[12px] bg-[var(--box-mono-bg)] border border-[var(--box-mono-border)] ${className}`}
    >
      <div className="flex items-center pl-1.5 pr-1 text-[var(--text-secondary)] text-xs">
        <SpeakerHigh
          className="w-3.5 h-3.5 text-[#E0262F]"
          weight="duotone"
          aria-hidden="true"
        />
      </div>
      {languages.map((lang) => {
        const isSelected = currentLang === lang;
        const meta = SUPPORTED_VOICE_LANGUAGES[lang];
        return (
          <button
            key={lang}
            type="button"
            onClick={() => handleSelect(lang)}
            aria-pressed={isSelected}
            className={`px-2.5 py-1 text-xs font-mono rounded-[8px] transition-all cursor-pointer ${
              isSelected
                ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-sm border border-[var(--surface-border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {meta.nativeLabel}
          </button>
        );
      })}
    </div>
  );
}
