"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "@phosphor-icons/react";
import { useTheme } from "@/context/theme-context";

interface ThemeToggleButtonProps {
  className?: string;
}

export function ThemeToggleButton({ className = "" }: ThemeToggleButtonProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? theme === "dark" : false;
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`relative min-w-[44px] min-h-[44px] w-11 h-11 rounded-[14px] bg-[var(--header-btn-bg)] border border-[var(--header-btn-border)] shadow-[var(--header-btn-shadow)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--header-btn-border-hover)] flex items-center justify-center transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2 select-none group ${className}`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden">
        {/* Sun Icon (shown when dark) */}
        <Sun
          className={`w-5 h-5 absolute transition-all duration-200 ease-in-out transform ${
            isDark
              ? "opacity-100 rotate-0 scale-100 text-amber-400"
              : "opacity-0 -rotate-90 scale-50 pointer-events-none"
          }`}
          weight="regular"
          aria-hidden="true"
        />
        {/* Moon Icon (shown when light) */}
        <Moon
          className={`w-5 h-5 absolute transition-all duration-200 ease-in-out transform ${
            !isDark
              ? "opacity-100 rotate-0 scale-100 text-[#4B5563] group-hover:text-[#111113]"
              : "opacity-0 rotate-90 scale-50 pointer-events-none"
          }`}
          weight="regular"
          aria-hidden="true"
        />
      </div>
    </button>
  );
}
