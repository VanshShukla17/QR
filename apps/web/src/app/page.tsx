import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldWarning,
  QrCode,
  Warning,
  Check,
  Lock,
  ArrowRight,
  Cpu,
  Terminal,
  ArrowSquareOut,
  Stack,
  Eye,
  MapPin,
  WarningCircle,
  CheckCircle,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import { Navbar } from "@/components/navbar";
import { CredentialHashChip } from "@/components/credential-hash-chip";
import { InteractiveDemo } from "@/components/interactive-demo";

import { RisographGrainWave } from "@/components/risograph-grain-wave";

export default function HomePage() {
  return (
    <div className="landing-page min-h-screen bg-ink text-text flex flex-col w-full selection:bg-brand selection:text-ink">
      {/* Floating Capsule Navbar */}
      <Navbar />

      {/* SECTION 1: HERO (Dark: --bg-ink) */}
      <section className="relative w-full overflow-hidden pt-28 md:pt-36 lg:pt-40 pb-8 md:pb-10 bg-ink border-b border-border flex flex-col justify-center min-h-[calc(100vh-4rem)]">
        {/* Animated risograph grain wave gradient background */}
        <RisographGrainWave />

        {/* Ambient brand glow */}
        <div
          aria-hidden="true"
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand/10 rounded-full blur-[140px] pointer-events-none"
        />

        <div className="relative w-full flex-1 max-w-[1200px] mx-auto px-6 md:px-12 flex flex-col items-center text-center">
          {/* Hero H1 */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-medium tracking-tight text-text max-w-4xl leading-[1.08] mb-8 md:mb-12">
            Know the QR is real before you pay.
          </h1>

          {/* Hero visual: final, fixed asset — rendered as-is (no filters/masks). mt-auto + negative
              bottom margin (equal to the section's pb) pin it flush to the hero's bottom edge so the
              phone bleeds off; the section's overflow-hidden does the clipping. */}
          <div className="mt-auto -mb-8 md:-mb-10 w-full flex justify-center">
            <Image
              src="/hero-phone.png"
              alt="QRaksha scanner verifying a physical UPI QR sticker"
              width={1024}
              height={682}
              priority
              className="block w-full max-w-[680px] h-auto animate-hero-float"
            />
          </div>
        </div>
      </section>

      {/* Marquee Ticker Bar */}
      <aside
        aria-label="Real-time protocol notice"
        className="w-full h-8 bg-brand text-ink flex items-center overflow-hidden border-b border-brand-deep select-none"
      >
        <div className="animate-marquee whitespace-nowrap flex items-center text-xs font-mono font-medium tracking-wider">
          <span className="mx-6">
            UPI CONFIRMS WHO GETS PAID. QRAKSHA CONFIRMS THE QR IS REAL.
          </span>
          <span className="mx-2">•</span>
          <span className="mx-6">5-AGENT AI PIPELINE</span>
          <span className="mx-2">•</span>
          <span className="mx-6">POLYGON AMOY PUBLIC ANCHOR</span>
          <span className="mx-2">•</span>
          <span className="mx-6">ZERO SEED PHRASE</span>
          <span className="mx-2">•</span>
          <span className="mx-6">SUB-SECOND SCAN VERDICT</span>
          <span className="mx-2">•</span>
          <span className="mx-6">
            UPI CONFIRMS WHO GETS PAID. QRAKSHA CONFIRMS THE QR IS REAL.
          </span>
          <span className="mx-2">•</span>
          <span className="mx-6">5-AGENT AI PIPELINE</span>
          <span className="mx-2">•</span>
          <span className="mx-6">POLYGON AMOY PUBLIC ANCHOR</span>
          <span className="mx-2">•</span>
          <span className="mx-6">ZERO SEED PHRASE</span>
          <span className="mx-2">•</span>
          <span className="mx-6">SUB-SECOND SCAN VERDICT</span>
        </div>
      </aside>

      {/* SECTION 2: TRUST STRIP (Dark: --bg-ink) */}
      <aside
        aria-label="System properties and trust standards"
        className="w-full bg-ink border-b border-border py-4"
      >
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 flex flex-wrap items-center justify-center md:justify-between gap-4 font-mono text-xs text-muted uppercase tracking-widest">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            UPI-COMPATIBLE
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            NO NEW PAYMENT APP
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            TAMPER-EVIDENT ANCHOR
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            POLYGON AMOY ANCHORED
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            ZERO PII LEAKAGE
          </span>
        </div>
      </aside>

      {/* SECTION 3: THE PROBLEM (Peach: --bg-peach) */}
      <section
        id="problem"
        className="w-full bg-peach text-ink py-20 md:py-28 border-b border-border"
      >
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Text (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase text-brand-deep tracking-widest mb-4">
              <WarningCircle className="w-4 h-4 text-brand-deep" weight="duotone" />
              <span>THE PROBLEM</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-ink leading-tight mb-5">
              UPI tells you who receives the money, not whether this physical QR belongs
              here.
            </h2>
            <p className="text-sm md:text-base text-[#5E4036] leading-relaxed mb-6 font-sans">
              NPCI verifies bank accounts and handles digital transaction routing with
              world-class speed. But payments begin at a piece of laminated paper or
              plastic resting on a shop counter.
            </p>
            <p className="text-sm md:text-base text-[#5E4036] leading-relaxed font-sans">
              When an attacker sticks a new QR code over your merchant stand, or carries
              your stand outside to an unauthorized location, UPI processes the payment
              without knowing the sticker was stolen or swapped.
            </p>
          </div>

          {/* Right Cards (7 cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-6 rounded-[4px] bg-peach-2 border border-[rgba(26,13,9,0.15)] flex flex-col justify-between hover:border-brand transition-colors">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs text-brand-deep font-semibold">
                    01
                  </span>
                  <Warning className="w-4 h-4 text-brand-deep" weight="duotone" />
                </div>
                <h3 className="text-lg font-medium text-ink mb-2">Swapped Sticker</h3>
                <p className="text-xs text-[#5E4036] leading-relaxed">
                  A counterfeit printed sticker pasted over the genuine merchant stand.
                  Customers scan and pay the attacker directly.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[rgba(26,13,9,0.1)] text-[11px] font-mono text-brand-deep uppercase">
                Threat: Replacement
              </div>
            </div>

            <div className="p-6 rounded-[4px] bg-peach-2 border border-[rgba(26,13,9,0.15)] flex flex-col justify-between hover:border-brand transition-colors">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs text-brand-deep font-semibold">
                    02
                  </span>
                  <MapPin className="w-4 h-4 text-brand-deep" weight="duotone" />
                </div>
                <h3 className="text-lg font-medium text-ink mb-2">Relocated Stand</h3>
                <p className="text-xs text-[#5E4036] leading-relaxed">
                  A genuine merchant QR stand physically relocated away from the
                  registered shop address to siphon off-premise payments.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[rgba(26,13,9,0.1)] text-[11px] font-mono text-brand-deep uppercase">
                Threat: Relocation
              </div>
            </div>

            <div className="p-6 rounded-[4px] bg-peach-2 border border-[rgba(26,13,9,0.15)] flex flex-col justify-between hover:border-brand transition-colors">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs text-brand-deep font-semibold">
                    03
                  </span>
                  <Stack className="w-4 h-4 text-brand-deep" weight="duotone" />
                </div>
                <h3 className="text-lg font-medium text-ink mb-2">Cloned Counter</h3>
                <p className="text-xs text-[#5E4036] leading-relaxed">
                  High-resolution photo clone deployed at unauthorized street stalls
                  without merchant knowledge or geocoded consent.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[rgba(26,13,9,0.1)] text-[11px] font-mono text-brand-deep uppercase">
                Threat: Duplication
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: THE SOLUTION (Dark: --bg-ink) */}
      <section
        id="solution"
        className="w-full bg-ink text-text py-20 md:py-28 border-b border-border"
      >
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase text-brand tracking-widest mb-4">
              <ShieldCheck className="w-4 h-4 text-brand" weight="duotone" />
              <span>THE TWO-SIDED DEFENSE</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-text leading-tight mb-5">
              Merchant registers once. Customer checks optionally before paying.
            </h2>
            <p className="text-sm md:text-base text-muted leading-relaxed mb-6 font-sans">
              QRaksha does not replace UPI or introduce new payment apps. We add a
              physical verification layer that confirms physical sticker authenticity and
              GPS binding before transactions take place.
            </p>
            <div className="flex flex-col gap-3 font-mono text-xs">
              <div className="p-3.5 rounded-[4px] bg-ink-2 border border-border flex items-start gap-3">
                <span className="text-brand font-bold">01</span>
                <div>
                  <span className="text-text font-medium block">
                    Morning 5-Second Merchant Self-Audit
                  </span>
                  <span className="text-muted text-[11px] font-sans mt-0.5 block">
                    Merchant snaps a photo of their counter QR each morning. AI verifies
                    wear patina, confirms shop GPS coordinates, and refreshes the public
                    anchor.
                  </span>
                </div>
              </div>
              <div className="p-3.5 rounded-[4px] bg-ink-2 border border-border flex items-start gap-3">
                <span className="text-brand font-bold">02</span>
                <div>
                  <span className="text-text font-medium block">
                    Pre-Payment Customer Web Check
                  </span>
                  <span className="text-muted text-[11px] font-sans mt-0.5 block">
                    Shoppers scan camera-first from any mobile browser before high-value
                    payments. Instant green, yellow, or red verdict in under 1.4 seconds.
                    Zero app download.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Visual (7 cols) */}
          <div className="lg:col-span-7 p-6 md:p-8 rounded-[4px] bg-ink-2 border border-border relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-6 text-xs font-mono">
              <span className="text-text font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand" weight="duotone" />
                SYSTEM ARCHITECTURE // TWO-SIDED VERIFICATION
              </span>
              <span className="text-brand uppercase">[Zero-Knowledge Proof]</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-[4px] bg-ink border border-border">
                <div className="flex items-center gap-2 text-brand font-mono text-xs uppercase mb-3">
                  <QrCode className="w-4 h-4" weight="duotone" />
                  <span>Merchant Side</span>
                </div>
                <ul className="space-y-2 text-xs text-muted font-sans">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-ok shrink-0" weight="bold" />
                    <span>GSTIN / Udyam verified identity</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-ok shrink-0" weight="bold" />
                    <span>Geocoded storefront boundary (25m)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-ok shrink-0" weight="bold" />
                    <span>Daily multi-agent visual patina audit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-ok shrink-0" weight="bold" />
                    <span>₹1 proof-of-possession micro-transaction</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-[4px] bg-ink border border-border">
                <div className="flex items-center gap-2 text-ok font-mono text-xs uppercase mb-3">
                  <Eye className="w-4 h-4" weight="duotone" />
                  <span>Customer Side</span>
                </div>
                <ul className="space-y-2 text-xs text-muted font-sans">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-ok shrink-0" weight="bold" />
                    <span>Open in any mobile web browser</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-ok shrink-0" weight="bold" />
                    <span>Zero app install, zero login needed</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-ok shrink-0" weight="bold" />
                    <span>Instant 1.4s multi-agent verdict</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-ok shrink-0" weight="bold" />
                    <span>Cryptographic proof-of-tamper check</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-[4px] bg-ink/60 border border-brand/30 flex items-center justify-between text-xs font-mono">
              <span className="text-muted">PUBLIC ANCHOR:</span>
              <span className="text-text">
                Polygon Amoy Testnet (ERC-721 Anchor / Hash Queue)
              </span>
              <span className="text-ok font-medium">LIVE</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: HOW IT WORKS / AGENT PIPELINE (Peach: --bg-peach) */}
      <section
        id="pipeline"
        className="w-full bg-peach text-ink py-20 md:py-28 border-b border-border"
      >
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 flex flex-col">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase text-brand-deep tracking-widest mb-4">
            <Cpu className="w-4 h-4 text-brand-deep" weight="duotone" />
            <span>HOW IT WORKS</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-ink leading-tight mb-4 max-w-2xl">
            Five specialized AI agents inspecting every scan in 1.4 seconds.
          </h2>
          <p className="text-sm md:text-base text-[#5E4036] leading-relaxed max-w-2xl mb-12 font-sans">
            Every audit runs through an isolated verification pipeline. AI agents never
            see raw PII or banking credentials—only cryptographically masked VPAs and
            mathematical visual embeddings.
          </p>

          {/* 4 Pipeline Nodes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="p-6 rounded-[4px] bg-peach-2 border border-[rgba(26,13,9,0.15)] flex flex-col justify-between hover:border-brand transition-colors">
              <div>
                <span className="font-mono text-xs text-brand-deep font-semibold block mb-2">
                  01 // VISION AGENT
                </span>
                <h3 className="text-base font-medium text-ink mb-2">
                  Physical Wear Patina
                </h3>
                <p className="text-xs text-[#5E4036] leading-relaxed">
                  Evaluates 768-dim visual embedding for sticker scratches, edge peel,
                  angle distortion, and sticker-over-sticker overlays.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[rgba(26,13,9,0.1)] text-[10px] font-mono text-brand-deep uppercase">
                Threshold: Cosine Sim &gt; 0.70
              </div>
            </div>

            <div className="p-6 rounded-[4px] bg-peach-2 border border-[rgba(26,13,9,0.15)] flex flex-col justify-between hover:border-brand transition-colors">
              <div>
                <span className="font-mono text-xs text-brand-deep font-semibold block mb-2">
                  02 // CONTEXT & MISBINDING
                </span>
                <h3 className="text-base font-medium text-ink mb-2">Geocoded Geofence</h3>
                <p className="text-xs text-[#5E4036] leading-relaxed">
                  Cross-checks device GPS against registered KYC storefront coordinates.
                  Flags scans occurring outside 25m boundary.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[rgba(26,13,9,0.1)] text-[10px] font-mono text-brand-deep uppercase">
                Tolerance: 25m Radius
              </div>
            </div>

            <div className="p-6 rounded-[4px] bg-peach-2 border border-[rgba(26,13,9,0.15)] flex flex-col justify-between hover:border-brand transition-colors">
              <div>
                <span className="font-mono text-xs text-brand-deep font-semibold block mb-2">
                  03 // ATTESTATION & IDENTITY
                </span>
                <h3 className="text-base font-medium text-ink mb-2">
                  GSTIN & Proof of VPA
                </h3>
                <p className="text-xs text-[#5E4036] leading-relaxed">
                  Validates government registry data, confirms ₹1 proof-of-possession
                  history, and authenticates merchant tier.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[rgba(26,13,9,0.1)] text-[10px] font-mono text-brand-deep uppercase">
                Registry: NPCI + GST Portal
              </div>
            </div>

            <div className="p-6 rounded-[4px] bg-peach-2 border border-[rgba(26,13,9,0.15)] flex flex-col justify-between hover:border-brand transition-colors">
              <div>
                <span className="font-mono text-xs text-brand-deep font-semibold block mb-2">
                  04 // TRUST RAMP ENGINE
                </span>
                <h3 className="text-base font-medium text-ink mb-2">
                  Deterministic Scoring
                </h3>
                <p className="text-xs text-[#5E4036] leading-relaxed">
                  Mathematical formula with 3-day probation gate and 14-day baseline cap.
                  Single warning caps score strictly to 4.0.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[rgba(26,13,9,0.1)] text-[10px] font-mono text-brand-deep uppercase">
                Output: 0-100 Score
              </div>
            </div>
          </div>

          {/* Credential Hash Chip */}
          <CredentialHashChip />
        </div>
      </section>

      {/* SECTION 6: ATTACKS COVERED (Dark: --bg-ink) */}
      <section
        id="threat-model"
        className="w-full bg-ink text-text py-20 md:py-28 border-b border-border"
      >
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 flex flex-col">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase text-brand tracking-widest mb-4">
            <Lock className="w-4 h-4 text-brand" weight="duotone" />
            <span>THREAT MODEL</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-text leading-tight mb-4 max-w-2xl">
            Comprehensive coverage against real-world physical UPI fraud.
          </h2>
          <p className="text-sm md:text-base text-muted leading-relaxed max-w-2xl mb-12 font-sans">
            Tested against both physical storefront attack vectors and digital forgery
            techniques encountered by India’s retail merchants.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-[4px] bg-ink-2 border border-border flex flex-col justify-between hover:border-brand transition-colors">
              <div>
                <span className="font-mono text-xs text-brand font-semibold block mb-2">
                  01 // REPLACEMENT
                </span>
                <h3 className="text-lg font-medium text-text mb-2">Sticker Overlays</h3>
                <p className="text-xs text-muted leading-relaxed font-sans">
                  Detects counterfeit printed stickers pasted over soundbox speakers,
                  paper standees, and glass counter panels.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-border text-[11px] font-mono text-ok uppercase">
                Mitigation: Vision Patina Match
              </div>
            </div>

            <div className="p-6 rounded-[4px] bg-ink-2 border border-border flex flex-col justify-between hover:border-brand transition-colors">
              <div>
                <span className="font-mono text-xs text-brand font-semibold block mb-2">
                  02 // RELOCATION
                </span>
                <h3 className="text-lg font-medium text-text mb-2">
                  Stand Theft / Relocation
                </h3>
                <p className="text-xs text-muted leading-relaxed font-sans">
                  Prevents genuine QR stands from being carried outside authorized shop
                  bounds to collect illicit off-site payments.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-border text-[11px] font-mono text-ok uppercase">
                Mitigation: 25m Geocoded Geofence
              </div>
            </div>

            <div className="p-6 rounded-[4px] bg-ink-2 border border-border flex flex-col justify-between hover:border-brand transition-colors">
              <div>
                <span className="font-mono text-xs text-brand font-semibold block mb-2">
                  03 // DUPLICATION
                </span>
                <h3 className="text-lg font-medium text-text mb-2">
                  Digital Photo Clones
                </h3>
                <p className="text-xs text-muted leading-relaxed font-sans">
                  Identifies digital screen re-photographing and forged duplicates
                  deployed across unregistered pop-up stalls.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-border text-[11px] font-mono text-ok uppercase">
                Mitigation: Surface Texture Model
              </div>
            </div>

            <div className="p-6 rounded-[4px] bg-ink-2 border border-border flex flex-col justify-between hover:border-brand transition-colors">
              <div>
                <span className="font-mono text-xs text-brand font-semibold block mb-2">
                  04 // TAMPERING
                </span>
                <h3 className="text-lg font-medium text-text mb-2">
                  Physical Scratch / Mutilation
                </h3>
                <p className="text-xs text-muted leading-relaxed font-sans">
                  Differentiates natural wear and tear from malicious tape strips,
                  scratched error correction blocks, and partial obscuring.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-border text-[11px] font-mono text-ok uppercase">
                Mitigation: Attestation Time Decay
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: VERDICTS (Peach: --bg-peach) */}
      <section
        id="verdicts"
        className="w-full bg-peach text-ink py-20 md:py-28 border-b border-border"
      >
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 flex flex-col">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase text-brand-deep tracking-widest mb-4">
            <CheckCircle className="w-4 h-4 text-brand-deep" weight="duotone" />
            <span>THREE-TIER VERDICT ENGINE</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-ink leading-tight mb-4 max-w-2xl">
            Calm, unambiguous outcomes. Never color alone.
          </h2>
          <p className="text-sm md:text-base text-[#5E4036] leading-relaxed max-w-2xl mb-12 font-sans">
            Every scan returns an explicit text badge, unambiguous reason code, and
            three-part evidence breakdown. Verdict colors are strictly semantic and never
            used decoratively.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* VERIFIED */}
            <div className="p-6 rounded-[4px] bg-ink-2 border-l-4 border-l-ok border border-border text-text flex flex-col justify-between shadow-xl hover:border-brand/50 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded-[2px] bg-ok/10 text-ok border border-ok/30 font-mono text-xs font-semibold uppercase flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" weight="duotone" />
                    <span>🟢 VERIFIED</span>
                  </span>
                  <span className="font-mono text-xs text-muted">TIER 1</span>
                </div>
                <h3 className="text-xl font-medium text-text mb-2">
                  Verified Credential
                </h3>
                <p className="text-xs text-muted leading-relaxed mb-4">
                  Credential has completed standard 3-day probation, identity verified via
                  GSTIN / bank penny-drop, and all AI agents confirm physical & GPS
                  fidelity.
                </p>
                <div className="p-3 rounded-[4px] bg-ink border border-border text-xs font-mono space-y-1.5">
                  <div className="flex justify-between text-muted">
                    <span>Identity:</span>
                    <span className="text-ok font-medium">PASS</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Vision Patina:</span>
                    <span className="text-ok font-medium">PASS</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Context (GPS):</span>
                    <span className="text-ok font-medium">PASS (&lt; 25m)</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-3 border-t border-border text-[11px] font-mono text-ok">
                Safe to proceed with payment
              </div>
            </div>

            {/* BUILDING TRUST / RECENTLY REGISTERED */}
            <div className="p-6 rounded-[4px] bg-ink-2 border-l-4 border-l-warn border border-border text-text flex flex-col justify-between shadow-xl hover:border-brand/50 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded-[2px] bg-warn/15 text-warn border border-warn/40 font-mono text-xs font-semibold uppercase flex items-center gap-1.5">
                    <Warning className="w-3.5 h-3.5" weight="duotone" />
                    <span>🟡 BUILDING TRUST</span>
                  </span>
                  <span className="font-mono text-xs text-muted">TIER 2</span>
                </div>
                <h3 className="text-xl font-medium text-text mb-2">
                  Recently Registered
                </h3>
                <p className="text-xs text-muted leading-relaxed mb-4">
                  Valid QR code under standard 3-day probation or baseline ramp. All
                  physical checks pass, but the merchant has not yet accumulated
                  longitudinal audit history.
                </p>
                <div className="p-3 rounded-[4px] bg-ink border border-border text-xs font-mono space-y-1.5">
                  <div className="flex justify-between text-muted">
                    <span>Identity:</span>
                    <span className="text-ok font-medium">PASS</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Vision Patina:</span>
                    <span className="text-ok font-medium">PASS</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Probation Gate:</span>
                    <span className="text-warn font-medium">DAY 1 OF 3</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-3 border-t border-border text-[11px] font-mono text-warn">
                Valid QR under standard ramp
              </div>
            </div>

            {/* WARNING */}
            <div className="p-6 rounded-[4px] bg-ink-2 border-l-4 border-l-danger border border-border text-text flex flex-col justify-between shadow-xl hover:border-brand/50 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded-[2px] bg-danger/15 text-[#FF546B] border border-danger/40 font-mono text-xs font-semibold uppercase flex items-center gap-1.5">
                    <ShieldWarning className="w-3.5 h-3.5" weight="duotone" />
                    <span>🔴 WARNING</span>
                  </span>
                  <span className="font-mono text-xs text-muted">TIER 3</span>
                </div>
                <h3 className="text-xl font-medium text-text mb-2">Tamper Detected</h3>
                <p className="text-xs text-muted leading-relaxed mb-4">
                  Physical replacement detected, location coordinates deviate beyond shop
                  radius, or counterfeit VPA detected. Score capped strictly at 4.0.
                </p>
                <div className="p-3 rounded-[4px] bg-ink border border-border text-xs font-mono space-y-1.5">
                  <div className="flex justify-between text-muted">
                    <span>Identity / VPA:</span>
                    <span className="text-[#FF546B] font-medium">MISMATCH</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Context (GPS):</span>
                    <span className="text-[#FF546B] font-medium">&gt; 1,000m DEV</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Action:</span>
                    <span className="text-[#FF546B] font-bold">DO NOT PAY</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-3 border-t border-border text-[11px] font-mono text-[#FF546B] font-semibold">
                High-confidence fraud signal
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: INTERACTIVE DEMO (Dark: --bg-ink) */}
      <section
        id="demo"
        className="w-full bg-ink text-text py-20 md:py-28 border-b border-border"
      >
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 flex flex-col">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase text-brand tracking-widest mb-4">
            <Terminal className="w-4 h-4 text-brand" weight="duotone" />
            <span>INTERACTIVE DEMO</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-text leading-tight mb-4 max-w-2xl">
            Test the detection engine in action.
          </h2>
          <p className="text-sm md:text-base text-muted leading-relaxed max-w-2xl mb-10 font-sans">
            Toggle between our two flagship fraud scenarios and a genuine in-store scan to
            inspect the multi-agent verdict response in real time.
          </p>

          {/* Interactive Demo */}
          <InteractiveDemo />
        </div>
      </section>

      {/* SECTION 9: PITCH BAND (Dark: --bg-ink-2) */}
      <section
        aria-label="Core mission quote"
        className="w-full bg-ink-2 text-text py-20 md:py-28 border-b border-border"
      >
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 text-center flex flex-col items-center">
          <span className="font-mono text-xs uppercase text-brand tracking-widest mb-6">
            — THE QRAKSHA PRINCIPLE
          </span>
          <blockquote className="text-2xl sm:text-3xl md:text-4xl font-mono uppercase text-text max-w-4xl leading-snug tracking-tight font-medium">
            “A UPI APP CAN TELL YOU WHO RECEIVES THE MONEY. QRAKSHA TELLS YOU WHETHER THE
            QR IN FRONT OF YOU WAS SUPPOSED TO BE THERE.”
          </blockquote>
          <span className="text-xs font-mono text-muted mt-6 uppercase tracking-wider">
            MERCHANT INTEGRITY • ZERO TRUST ARCHITECTURE • TAMPER-EVIDENT RECORD-KEEPING
          </span>
        </div>
      </section>

      {/* SECTION 10: CTA + FOOTER (Dark: --bg-ink) */}
      <section className="w-full bg-ink text-text pt-20 pb-12">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 flex flex-col">
          {/* Top CTA Row */}
          <div className="p-8 md:p-12 rounded-[4px] bg-ink-2 border border-border flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
            <div className="max-w-xl text-center md:text-left">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase text-brand mb-2">
                <Sparkle className="w-3.5 h-3.5" weight="duotone" />
                <span>PILOT PROGRAM ENROLLMENT</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-medium text-text mb-3">
                Secure your storefront QR in less than three minutes.
              </h2>
              <p className="text-sm text-muted leading-relaxed font-sans">
                Set up your merchant credential with GSTIN / Udyam identity binding,
                capture your reference patina, and start daily tamper-evident audits.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <Link
                href="/register"
                className="w-full sm:w-auto h-11 px-6 rounded-[4px] bg-brand text-ink text-sm font-semibold flex items-center justify-center gap-2 hover:bg-brand-soft hover:shadow-[0_0_20px_rgba(255,75,31,0.5)] transition-all"
              >
                <span>Register Credential</span>
                <ArrowRight className="w-4 h-4" weight="bold" />
              </Link>
              <Link
                href="/audit/run"
                className="w-full sm:w-auto h-11 px-6 rounded-[4px] border border-border text-text hover:border-brand text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <span>Run Self-Audit</span>
              </Link>
            </div>
          </div>

          {/* Quick Action Directory */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-16 border-b border-border text-xs font-mono">
            <div>
              <span className="text-brand uppercase font-medium block mb-3">
                Merchant Flows
              </span>
              <ul className="space-y-2 text-muted">
                <li>
                  <Link href="/audit/run" className="hover:text-text transition-colors">
                    Morning Self-Audit
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-text transition-colors">
                    Register New QR
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-text transition-colors">
                    Merchant Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/audit/history"
                    className="hover:text-text transition-colors"
                  >
                    Audit Log History
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <span className="text-brand uppercase font-medium block mb-3">
                Customer Flows
              </span>
              <ul className="space-y-2 text-muted">
                <li>
                  <Link href="/check" className="hover:text-text transition-colors">
                    Pre-Payment Scanner
                  </Link>
                </li>
                <li>
                  <a href="#demo" className="hover:text-text transition-colors">
                    Interactive Demo
                  </a>
                </li>
                <li>
                  <a href="#verdicts" className="hover:text-text transition-colors">
                    Verdict Explainer
                  </a>
                </li>
                <li>
                  <Link href="/settings" className="hover:text-text transition-colors">
                    App Settings
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <span className="text-brand uppercase font-medium block mb-3">
                Administration
              </span>
              <ul className="space-y-2 text-muted">
                <li>
                  <Link
                    href="/admin/registry"
                    className="hover:text-text transition-colors"
                  >
                    Merchant Registry
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/disputes"
                    className="hover:text-text transition-colors"
                  >
                    Dispute Desk
                  </Link>
                </li>
                <li>
                  <a
                    href="https://amoy.polygonscan.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-text transition-colors flex items-center gap-1"
                  >
                    <span>Polygon Explorer</span>
                    <ArrowSquareOut className="w-3 h-3" weight="bold" />
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <span className="text-brand uppercase font-medium block mb-3">
                Security & Docs
              </span>
              <ul className="space-y-2 text-muted">
                <li>
                  <span className="text-muted">Zero PII Architecture</span>
                </li>
                <li>
                  <span className="text-muted">5-Agent Verification</span>
                </li>
                <li>
                  <span className="text-muted">WCAG 2.1 AA Compliant</span>
                </li>
                <li>
                  <span className="text-muted">Polygon Amoy Testnet</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright Line */}
          <footer className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] font-mono text-muted">
            <div className="flex items-center gap-3">
              <span className="text-text font-medium">QRaksha</span>
              <span>•</span>
              <span>PHYSICAL-TO-MERCHANT UPI TAMPER DEFENSE</span>
            </div>
            <div>
              <span>BUILT FOR INDIA&apos;S 60M+ QR MERCHANTS • 2026</span>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}
