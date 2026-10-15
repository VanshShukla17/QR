"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Compass, Warning, Check, CaretRight } from "@phosphor-icons/react";
import { VerdictCard } from "@/components/verdict-card";
import { AuditResult } from "@/lib/api";

const DEMO_SCENARIOS: Record<
  "replacement" | "relocation" | "genuine",
  {
    title: string;
    subtitle: string;
    auditResult: AuditResult;
    scenarioInfo: {
      location: string;
      distance: string;
      payload: string;
      registeredVpa: string;
      scannedVpa: string;
    };
  }
> = {
  relocation: {
    title: "Demo 2 — QR Relocation Detected (The Killer Demo)",
    subtitle:
      "Legitimate QR stand moved 1.2km away to an unauthorized roadside cart. Location mismatch triggers 🔴 WARNING.",
    scenarioInfo: {
      location: "Koramangala 4th Block (Unauthorized Staging)",
      distance: "1,240m away (Bound: 25m)",
      payload: "upi://pay?pa=sharmacanteen@okaxis&pn=Sharma%20Canteen&mc=5499",
      registeredVpa: "sharmacanteen@okaxis",
      scannedVpa: "sharmacanteen@okaxis (Genuine VPA, Wrong Location)",
    },
    auditResult: {
      verdict: "WARNING",
      reason: "LOCATION_MISMATCH",
      message:
        "Relocation detected: QR scanned 1,240m outside bound shop premises (Shop 12, Market Road).",
      degradedCheck: false,
      isUnregistered: false,
      credentialId: "cred-sharma-canteen",
      agentOutputs: {
        identity: {
          status: "pass",
          score: 0.95,
          message: "Merchant identity matches KYC records.",
        },
        vision: {
          status: "pass",
          score: 0.92,
          message: "Physical sticker surface patina matches reference embedding.",
        },
        context: {
          status: "flag",
          score: 0.05,
          message:
            "Scan coordinates (12.9352, 77.6245) deviate 1.24km from registered premises.",
        },
      },
    },
  },
  replacement: {
    title: "Demo 1 — QR Replacement Detected",
    subtitle:
      "Counterfeit overlay sticker pasted over legitimate merchant counter board. Detected via vision & payload mismatch.",
    scenarioInfo: {
      location: "Shop 12, Market Road, Bengaluru (At Shop Counter)",
      distance: "4m away (Within 25m bound)",
      payload: "upi://pay?pa=attacker@scam&pn=FraudulentReplacement",
      registeredVpa: "sharmacanteen@okaxis",
      scannedVpa: "attacker@scam (Unauthorized VPA)",
    },
    auditResult: {
      verdict: "WARNING",
      reason: "MISBINDING",
      message:
        "Counterfeit replacement sticker detected: Scanned VPA does not match registered merchant credential.",
      degradedCheck: false,
      isUnregistered: false,
      credentialId: "cred-sharma-canteen",
      agentOutputs: {
        identity: {
          status: "flag",
          score: 0.0,
          message:
            "Scanned VPA attacker@scam does not match merchant VPA sharmacanteen@okaxis.",
        },
        vision: {
          status: "flag",
          score: 0.2,
          message: "Physical edge seam and surface misalignment detected on QR border.",
        },
        context: {
          status: "pass",
          score: 0.98,
          message: "Scan coordinates within registered shop radius.",
        },
      },
    },
  },
  genuine: {
    title: "Demo 3 — Genuine In-Store Scan",
    subtitle:
      "Authorized merchant QR sticker scanned inside registered shop boundary. All 5 agents pass cleanly.",
    scenarioInfo: {
      location: "Shop 12, Market Road, Bengaluru (At Shop Counter)",
      distance: "6m away (Within 25m bound)",
      payload: "upi://pay?pa=sharmacanteen@okaxis&pn=Sharma%20Canteen&mc=5499",
      registeredVpa: "sharmacanteen@okaxis",
      scannedVpa: "sharmacanteen@okaxis",
    },
    auditResult: {
      verdict: "VERIFIED",
      reason: "OK",
      message:
        "QR sticker verified. Matches physical baseline and registered shop location.",
      degradedCheck: false,
      isUnregistered: false,
      credentialId: "cred-sharma-canteen",
      agentOutputs: {
        identity: {
          status: "pass",
          score: 0.99,
          message: "Merchant identity matches NPCI and GSTIN records.",
        },
        vision: {
          status: "pass",
          score: 0.96,
          message: "Physical patina, lighting, and wear match reference embedding.",
        },
        context: {
          status: "pass",
          score: 0.99,
          message: "Device GPS matches registered premises (12.9716, 77.5946).",
        },
      },
    },
  },
};

export function InteractiveDemo() {
  const [activeDemoTab, setActiveDemoTab] = useState<
    "replacement" | "relocation" | "genuine"
  >("relocation");

  return (
    <>
      {/* Tab Selector */}
      <div className="flex flex-wrap gap-2.5 mb-8 border-b border-border pb-4">
        <button
          onClick={() => setActiveDemoTab("relocation")}
          className={`h-10 px-5 rounded-[4px] font-medium text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeDemoTab === "relocation"
              ? "bg-brand text-ink font-semibold shadow-[0_0_16px_rgba(255,75,31,0.4)]"
              : "bg-ink-2 border border-border text-muted hover:text-text hover:border-brand/40"
          }`}
        >
          <Compass className="w-4 h-4" weight="bold" />
          <span>Demo 2: QR Relocation (Killer Demo)</span>
        </button>

        <button
          onClick={() => setActiveDemoTab("replacement")}
          className={`h-10 px-5 rounded-[4px] font-medium text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeDemoTab === "replacement"
              ? "bg-brand text-ink font-semibold shadow-[0_0_16px_rgba(255,75,31,0.4)]"
              : "bg-ink-2 border border-border text-muted hover:text-text hover:border-brand/40"
          }`}
        >
          <Warning className="w-4 h-4" weight="bold" />
          <span>Demo 1: QR Replacement (Sticker Swap)</span>
        </button>

        <button
          onClick={() => setActiveDemoTab("genuine")}
          className={`h-10 px-5 rounded-[4px] font-medium text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeDemoTab === "genuine"
              ? "bg-brand text-ink font-semibold shadow-[0_0_16px_rgba(255,75,31,0.4)]"
              : "bg-ink-2 border border-border text-muted hover:text-text hover:border-brand/40"
          }`}
        >
          <Check className="w-4 h-4" weight="bold" />
          <span>Demo 3: Genuine Scan</span>
        </button>
      </div>

      {/* Active Demo Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Scenario Telemetry (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-[4px] bg-ink-2 border border-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-muted mb-3">
              <span className="text-brand uppercase font-medium">
                SIMULATION PARAMETERS
              </span>
              <span>RUN ID: #SIM-094</span>
            </div>
            <h3 className="text-xl font-medium text-text mb-2">
              {DEMO_SCENARIOS[activeDemoTab].title}
            </h3>
            <p className="text-xs text-muted leading-relaxed font-sans mb-6">
              {DEMO_SCENARIOS[activeDemoTab].subtitle}
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-[2px] bg-ink border border-border">
                <span className="text-muted block text-[10px] uppercase">
                  Physical Location:
                </span>
                <span className="text-text font-medium mt-0.5 block">
                  {DEMO_SCENARIOS[activeDemoTab].scenarioInfo.location}
                </span>
              </div>

              <div className="p-3 rounded-[2px] bg-ink border border-border">
                <span className="text-muted block text-[10px] uppercase">
                  GPS Radius Offset:
                </span>
                <span
                  className={`font-medium mt-0.5 block ${
                    activeDemoTab === "relocation" ? "text-danger" : "text-ok"
                  }`}
                >
                  {DEMO_SCENARIOS[activeDemoTab].scenarioInfo.distance}
                </span>
              </div>

              <div className="p-3 rounded-[2px] bg-ink border border-border">
                <span className="text-muted block text-[10px] uppercase">
                  Scanned UPI Payload:
                </span>
                <span className="text-text font-medium mt-0.5 block truncate">
                  {DEMO_SCENARIOS[activeDemoTab].scenarioInfo.payload}
                </span>
              </div>

              <div className="p-3 rounded-[2px] bg-ink border border-border">
                <span className="text-muted block text-[10px] uppercase">
                  VPA Authentication:
                </span>
                <span
                  className={`font-medium mt-0.5 block ${
                    activeDemoTab === "replacement" ? "text-danger" : "text-ok"
                  }`}
                >
                  {DEMO_SCENARIOS[activeDemoTab].scenarioInfo.scannedVpa}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-border flex items-center justify-between">
            <Link
              href="/audit/run"
              className="text-xs font-mono text-brand hover:text-brand-soft flex items-center gap-1.5"
            >
              <span>Open live camera viewfinder</span>
              <CaretRight className="w-3.5 h-3.5" weight="bold" />
            </Link>
            <span className="text-[10px] font-mono text-muted uppercase">
              Simulated via Mock Pipeline
            </span>
          </div>
        </div>

        {/* Verdict Result Card (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <VerdictCard
            result={DEMO_SCENARIOS[activeDemoTab].auditResult}
            title="Simulated Scan Outcome"
          />
        </div>
      </div>
    </>
  );
}
