"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import {
  AnimatedHomeIcon,
  AnimatedQrIcon,
  AnimatedHistoryIcon,
  AnimatedUserIcon,
} from "@/components/icons/animated";
import { AIAssistantButton } from "@/components/ai-assistant-button";

const AIAssistantSheet = dynamic(
  () => import("@/components/ai-assistant-sheet").then((m) => m.AIAssistantSheet),
  { ssr: false }
);

interface NavItem {
  label: string;
  displayLabel: string;
  href: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
    isActive?: boolean;
    isHovered?: boolean;
    strokeWidth?: number;
  }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", displayLabel: "Home", href: "/dashboard", icon: AnimatedHomeIcon },
  { label: "Verify", displayLabel: "QR", href: "/audit/run", icon: AnimatedQrIcon },
  {
    label: "History",
    displayLabel: "History",
    href: "/audit/history",
    icon: AnimatedHistoryIcon,
  },
  {
    label: "Merchant",
    displayLabel: "Profile",
    href: "/settings",
    icon: AnimatedUserIcon,
  },
];

/**
 * Determines which nav item is active based on current pathname.
 */
function getActiveIndex(pathname: string): number {
  if (pathname === "/dashboard" || pathname === "/") return 0;
  if (pathname.startsWith("/audit/history")) return 2;
  if (
    pathname.startsWith("/audit") ||
    pathname.startsWith("/check") ||
    pathname.startsWith("/verify")
  )
    return 1;
  if (pathname.startsWith("/settings") || pathname.startsWith("/register")) return 3;
  return -1;
}

export function BottomNav() {
  const pathname = usePathname();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Hide bottom nav on admin routes and landing page
  if (pathname.startsWith("/admin") || pathname === "/") {
    return null;
  }

  const activeIndex = getActiveIndex(pathname);

  return (
    <>
      {/* 
        Layout spacer: ensures page content is never hidden behind the floating nav.
        Matches pill height + bottom margins + safe-area insets.
      */}
      <div className="h-28 w-full shrink-0 pointer-events-none" aria-hidden="true" />

      {/* Outer floating wrapper anchored to viewport bottom with safe-area insets */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none pb-[calc(1rem+env(safe-area-inset-bottom,0px))] px-3 sm:px-4 flex items-center justify-center">
        <div className="pointer-events-auto flex items-center gap-2.5 w-full max-w-[420px]">
          {/* Main Floating Pill Navigation fitting phone width */}
          <nav
            aria-label="Main Navigation"
            className="relative flex-1 flex items-center h-[62px] nav-dock-glass p-1.5"
          >
            {/* 
              Hardware-accelerated sliding active highlight rounded square.
              Red glass gradient matching mockup specs.
            */}
            <div
              className={`absolute top-1.5 bottom-1.5 left-0 w-1/4 pointer-events-none transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none flex items-center justify-center ${
                activeIndex === -1 ? "opacity-0" : "opacity-100"
              }`}
              style={{
                transform: `translateX(${Math.max(0, activeIndex) * 100}%)`,
              }}
              aria-hidden="true"
            >
              <div
                className="w-[84%] max-w-[68px] h-full rounded-[16px] border border-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),var(--red-glass-shadow)]"
                style={{
                  background: "linear-gradient(135deg, #FF6B5E 0%, #E0262F 100%)",
                  backgroundColor: "#E0262F",
                }}
              />
            </div>

            {/* Nav Items */}
            <div className="grid grid-cols-4 items-center w-full h-full relative z-10">
              {NAV_ITEMS.map((item, index) => {
                const Icon = item.icon;
                const isActive = activeIndex === index;
                const isHovered = hoveredIndex === index;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-label={item.label}
                    title={item.displayLabel}
                    aria-current={isActive ? "page" : undefined}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="group relative flex flex-col items-center justify-center w-full h-full min-h-[44px] rounded-[16px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[#E0262F] focus-visible:outline-offset-2 select-none"
                  >
                    <Icon
                      size={18}
                      isActive={isActive}
                      isHovered={isHovered}
                      strokeWidth={isActive ? 2.25 : 2}
                      className={`transition-colors duration-200 ${
                        isActive
                          ? "text-white"
                          : "text-[var(--nav-item-inactive)] group-hover:text-[var(--nav-item-inactive-hover)]"
                      }`}
                    />
                    <span
                      className={`text-[10px] tracking-tight leading-none mt-1 transition-colors ${
                        isActive
                          ? "text-white font-semibold"
                          : "text-[var(--nav-item-inactive)] font-medium group-hover:text-[var(--nav-item-inactive-hover)]"
                      }`}
                    >
                      {item.displayLabel}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* AI Assistant Button */}
          <AIAssistantButton
            isOpen={isAssistantOpen}
            onClick={() => setIsAssistantOpen((prev) => !prev)}
          />
        </div>
      </div>

      {/* AI Assistant Placeholder Sheet */}
      {isAssistantOpen && (
        <AIAssistantSheet
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
        />
      )}
    </>
  );
}
