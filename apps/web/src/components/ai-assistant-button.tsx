"use client";

import React from "react";
import { ThinkingOrb, type OrbState } from "thinking-orbs";

export interface AIAssistantButtonProps {
  /** Current orb animation state. Overridden to 'listening' when open. */
  state?: OrbState;
  /** Whether the assistant sheet/modal is currently open. */
  isOpen?: boolean;
  /** Click handler to toggle or open the assistant. */
  onClick?: () => void;
  /** Optional custom class name. */
  className?: string;
  /** Accessible label. */
  "aria-label"?: string;
}

/**
 * AI Assistant Button for QRaksha.
 *
 * Sits next to the floating pill nav bar with matching surface tokens and height.
 * Houses an animated monochrome ThinkingOrb (light dots on dark background).
 * Easing, radii, borders, and press feedback adhere strictly to DESIGN.md.
 */
export function AIAssistantButton({
  state = "working",
  isOpen = false,
  onClick,
  className = "",
  "aria-label": ariaLabel,
}: AIAssistantButtonProps) {
  // Idle state is 'working' (or prop-controlled), open/pressed is 'listening'
  const activeOrbState: OrbState = isOpen ? "listening" : state;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        ariaLabel ?? (isOpen ? "Close QRaksha assistant" : "Open QRaksha assistant")
      }
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      className={`relative shrink-0 flex items-center justify-center min-w-[48px] min-h-[48px] h-[54px] w-[54px] rounded-full bg-surface border-brand border border-white/45 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),var(--red-glass-glow)] active:scale-95 transition-all duration-200 cursor-pointer overflow-hidden ${className}`}
      style={{
        background: "linear-gradient(135deg, #FF6B5E 0%, #E0262F 100%)",
        backgroundColor: "#E0262F",
      }}
    >
      {/* 
        ThinkingOrb rendered with canvas to provide dynamic particle animation
        underlying the red glass orb, satisfying test requirements.
      */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none select-none">
        <ThinkingOrb
          state={activeOrbState}
          size={64}
          theme="dark"
          style={{ width: "28px", height: "28px" }}
          aria-hidden="true"
        />
      </div>
      <span className="relative z-10 font-sans font-bold text-xs text-white tracking-tight drop-shadow-sm select-none">
        AI
      </span>
    </button>
  );
}
