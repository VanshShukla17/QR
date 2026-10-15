"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";

interface NavLinkItem {
  label: string;
  href: string;
  id: string;
}

const NAV_LINKS: NavLinkItem[] = [
  { label: "How It Works", href: "#pipeline", id: "pipeline" },
  { label: "Threats", href: "#threat-model", id: "threat-model" },
  { label: "Verdicts", href: "#verdicts", id: "verdicts" },
  { label: "Demo", href: "#demo", id: "demo" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Shrink navbar slightly and enhance border on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track active section as user scrolls
  useEffect(() => {
    const sectionIds = NAV_LINKS.map((link) => link.id);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(`#${entry.target.id}`);
          }
        });
      },
      {
        rootMargin: "-25% 0px -55% 0px",
        threshold: 0,
      }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Close mobile menu on Esc key or resize
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      <header className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 sm:px-6 pointer-events-none">
        <div
          className={`pointer-events-auto w-full max-w-[1100px] backdrop-blur-md bg-black/50 rounded-full transition-all duration-200 flex items-center justify-between border ${
            isScrolled
              ? "py-2 px-5 sm:px-6 border-white/[0.16] shadow-[0_8px_32px_rgba(0,0,0,0.6)] bg-black/75"
              : "py-3 px-5 sm:px-7 border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
          }`}
        >
          {/* Left: Logo mark + QRaksha wordmark only */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-lg"
            aria-label="QRaksha Home"
          >
            <div className="w-8 h-8 rounded-[6px] bg-brand flex items-center justify-center text-ink font-bold text-base shadow-[0_0_14px_rgba(255,75,31,0.45)] group-hover:bg-brand-soft transition-colors select-none">
              Q
            </div>
            <span className="text-[17px] font-medium tracking-tight text-text group-hover:text-brand transition-colors">
              QRaksha
            </span>
          </Link>

          {/* Center: Max 4 desktop links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-8 text-[14px]"
          >
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setActiveSection(link.href)}
                  className={`relative font-medium py-1 px-1.5 transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-md ${
                    isActive ? "text-white" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand"
                      aria-hidden="true"
                    />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Right: Primary CTA only */}
          <div className="hidden md:flex items-center">
            <Link
              href="/audit/run"
              className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand text-ink text-[14px] font-semibold hover:bg-brand-soft hover:shadow-[0_0_20px_rgba(255,75,31,0.4)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <span>Run Self-Audit</span>
              <ArrowUpRight
                size={14}
                className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>

          {/* Mobile hamburger trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            className="md:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {mobileMenuOpen ? (
              <X
                size={22}
                className="transition-transform duration-200 rotate-90 scale-105"
              />
            ) : (
              <Menu size={22} className="transition-transform duration-200" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile full-width sheet */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="md:hidden fixed inset-x-0 top-0 pt-24 pb-8 px-6 bg-[#120907]/95 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl z-40 flex flex-col gap-6"
        >
          <nav
            aria-label="Mobile menu"
            className="flex flex-col gap-4 text-base font-medium"
          >
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    setActiveSection(link.href);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between py-2 transition-colors duration-[120ms] ${
                    isActive
                      ? "text-brand font-semibold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-brand"
                      aria-hidden="true"
                    />
                  )}
                </a>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-white/[0.08] flex flex-col gap-3">
            <Link
              href="/audit/run"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand text-ink font-semibold text-sm hover:bg-brand-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <span>Run Self-Audit</span>
              <ArrowUpRight size={14} className="transition-transform duration-200" />
            </Link>

            {/* Customer Check in mobile menu only */}
            <Link
              href="/check"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-white/[0.12] text-neutral-300 hover:text-white hover:border-brand font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <span>Customer Check</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
