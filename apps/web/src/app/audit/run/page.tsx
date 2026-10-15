"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  SpinnerGap,
  MapPin,
  WarningCircle,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { CameraCaptureSkeleton } from "../../../components/camera-capture-skeleton";
import { VerdictCard } from "../../../components/verdict-card";

const CameraCapture = dynamic(
  () => import("../../../components/camera-capture").then((m) => m.CameraCapture),
  {
    ssr: false,
    loading: () => (
      <CameraCaptureSkeleton
        title="Capture Daily Audit Photo"
        helperText="Snap a clear photo of your counter UPI QR stand in your store."
      />
    ),
  }
);
import { runSelfAudit, AuditResult, ApiError } from "../../../lib/api";

export default function AuditRunPage() {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentAgentStep, setCurrentAgentStep] = useState<string>(
    "Checking QR identity…"
  );
  const [verdictResult, setVerdictResult] = useState<AuditResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Request GPS geolocation on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setGeoError(null);
        },
        (err) => {
          // Fallback or permission denial handling per PRD.md Section 6
          setGeoError(
            err.code === 1
              ? "Location permission was denied. Geolocation check requires permission."
              : "Unable to retrieve precise GPS. Using default premises location."
          );
          // Default fallback coordinates for test/demo environment
          setCoords({ latitude: 12.9716, longitude: 77.5946 });
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setCoords({ latitude: 12.9716, longitude: 77.5946 });
    }
  }, []);

  const handleCapture = useCallback(
    async (data: { photoBase64: string; qrPayload?: string }) => {
      if (!data.qrPayload) return;

      setIsVerifying(true);
      setApiError(null);

      // Multi-agent progress simulation labels per PRD.md Section 6
      const steps = [
        "Checking QR identity & format…",
        "Comparing to registered photo embedding…",
        "Verifying geolocation against bound premises…",
        "Synthesizing multi-agent verdict…",
      ];

      let stepIndex = 0;
      const interval = setInterval(() => {
        stepIndex = (stepIndex + 1) % steps.length;
        setCurrentAgentStep(steps[stepIndex]);
      }, 450);

      try {
        const result = await runSelfAudit({
          qrPayload: data.qrPayload,
          latitude: coords?.latitude ?? 12.9716,
          longitude: coords?.longitude ?? 77.5946,
          photoBase64: data.photoBase64,
        });

        clearInterval(interval);
        setVerdictResult(result);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("qraksha-stats-invalidate"));
        }
      } catch (err) {
        clearInterval(interval);
        const error = err as ApiError;
        setApiError(
          error.message ||
            "Self-audit verification failed. Please check your connection and try again."
        );
      } finally {
        setIsVerifying(false);
      }
    },
    [coords]
  );

  const resetAudit = useCallback(() => {
    setVerdictResult(null);
    setApiError(null);
  }, []);

  return (
    <main className="flex-1 flex flex-col p-5 sm:p-6 max-w-[440px] mx-auto w-full pb-[calc(8rem+env(safe-area-inset-bottom,0px))]">
      {/* Top Header */}
      <header className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="Back to Dashboard"
            title="Back to Dashboard"
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-[14px] bg-[var(--header-btn-bg)] border border-[var(--header-btn-border)] shadow-[var(--header-btn-shadow)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--header-btn-border-hover)] flex items-center justify-center transition-all select-none"
          >
            <ArrowLeft className="w-5 h-5" weight="bold" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Self-Audit Verification
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Daily sticker integrity loop
            </p>
          </div>
        </div>

        <Link
          href="/audit/history"
          className="btn-pill-secondary h-9 px-3.5 text-xs font-medium flex items-center gap-1.5"
        >
          <ClockCounterClockwise className="w-3.5 h-3.5 text-[#E0262F]" weight="bold" />
          <span>History</span>
        </Link>
      </header>

      {/* Geolocation Notice */}
      {coords && (
        <div className="card-glass mb-4 px-4 py-2.5 rounded-[16px] flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5">
            <MapPin
              className="w-3.5 h-3.5 text-[#1E7A3C] dark:text-[#4ADE80]"
              weight="duotone"
            />
            <span>
              GPS ACTIVE: {coords.latitude.toFixed(3)}, {coords.longitude.toFixed(3)}
            </span>
          </div>
          <span className="chip-success-pill text-[10px]">~100M RADIUS</span>
        </div>
      )}

      {geoError && (
        <div className="mb-4 p-3.5 rounded-[16px] bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
          <WarningCircle
            className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400"
            weight="duotone"
          />
          <span>{geoError}</span>
        </div>
      )}

      {/* API Error Alert */}
      {apiError && (
        <div className="mb-4 p-4 rounded-[16px] bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-[#E0262F] dark:text-[#FF6B5E] text-xs flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <WarningCircle
              className="w-4 h-4 shrink-0 mt-0.5 text-[#E0262F]"
              weight="duotone"
            />
            <p className="font-medium text-[var(--text-primary)]">{apiError}</p>
          </div>
          <button
            type="button"
            onClick={resetAudit}
            className="self-end px-3 py-1 rounded-full bg-[#E0262F] text-white font-medium text-xs cursor-pointer"
          >
            Retry Scan
          </button>
        </div>
      )}

      {/* Loading Skeleton during Multi-Agent Verification (PRD.md Section 6) */}
      {isVerifying && (
        <div className="card-glass flex-1 flex flex-col items-center justify-center p-8 text-center gap-4 animate-pulse rounded-[24px]">
          <SpinnerGap className="w-8 h-8 text-[#E0262F] animate-spin" weight="bold" />
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Running 5-Agent Pipeline
            </h2>
            <p className="text-xs font-mono text-[#E0262F] mt-1 font-medium">
              {currentAgentStep}
            </p>
          </div>
          <div className="w-full max-w-[240px] h-1.5 bg-[var(--chip-neutral-bg)] rounded-full overflow-hidden mt-2">
            <div className="h-full bg-[#E0262F] animate-pulse w-3/4 rounded-full" />
          </div>
          <p className="text-xs text-[var(--text-secondary)] max-w-[260px] leading-relaxed">
            Evaluating QR identity, visual perceptual embedding, bound GPS, and
            attestation history.
          </p>
        </div>
      )}

      {/* Verdict Result Full-screen Takeover (DESIGN.md Section 5) */}
      {!isVerifying && verdictResult && (
        <div className="flex flex-col gap-4">
          <VerdictCard
            result={verdictResult}
            onReset={resetAudit}
            title="Self-Audit Verification Outcome"
          />
          <Link
            href="/dashboard"
            className="btn-pill-secondary h-11 w-full rounded-[16px] text-xs font-medium flex items-center justify-center transition-colors"
          >
            <span>Return to Dashboard</span>
          </Link>
        </div>
      )}

      {/* Quick Sticker Selection for verification */}
      {!isVerifying && !verdictResult && (
        <div className="card-glass mb-4 p-4 rounded-[20px] flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)] uppercase font-medium">
            <span>Sticker Preset // One-Click Audit</span>
            <span className="chip-success-pill text-[10px]">REGISTERED</span>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                handleCapture({
                  photoBase64:
                    "data:image/jpeg;base64," +
                    btoa(
                      "photo-bytes-for-harshil-qr-sample-testing-12345678901234567890"
                    ),
                  qrPayload:
                    "upi://pay?pa=harshil.456.sharma@okhdfcbank&pn=Harshil%20Sharma&aid=uGICAgMCc_OiTDg",
                });
              }}
              className="w-full text-left p-3 rounded-[14px] bg-[var(--box-mono-bg)] border border-[var(--box-mono-border)] hover:border-[#E0262F]/40 transition-colors text-xs font-mono text-[var(--box-mono-text)] flex items-center justify-between cursor-pointer"
            >
              <div>
                <span className="font-semibold text-[#E0262F]">
                  Counter 2 (Harshil Sharma)
                </span>
                <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">
                  upi://pay?pa=harshil.456.sharma@okhdfcbank…
                </p>
              </div>
              <span className="chip-neutral-pill text-[10px] shrink-0 font-medium">
                AUDIT NOW
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleCapture({
                  photoBase64:
                    "data:image/jpeg;base64," +
                    btoa(
                      "photo-bytes-for-harshil-qr-sample-testing-12345678901234567890"
                    ),
                  qrPayload:
                    "upi://pay?pa=sharmacanteen@okaxis&pn=Sharma%20Canteen&mc=5499&aid=uGICAgICAgICAgA",
                });
              }}
              className="w-full text-left p-3 rounded-[14px] bg-[var(--box-mono-bg)] border border-[var(--box-mono-border)] hover:border-[#E0262F]/40 transition-colors text-xs font-mono text-[var(--box-mono-text)] flex items-center justify-between cursor-pointer"
            >
              <div>
                <span className="font-semibold text-[var(--text-primary)]">
                  Counter 1 (Sharma Canteen)
                </span>
                <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">
                  upi://pay?pa=sharmacanteen@okaxis…
                </p>
              </div>
              <span className="chip-neutral-pill text-[10px] shrink-0 font-medium">
                AUDIT NOW
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Camera Capture Viewfinder */}
      {!isVerifying && !verdictResult && (
        <CameraCapture
          title="Align Physical UPI Sticker"
          helperText="Position your billing counter sticker inside the frame. Camera captures live photo and checks payload and location."
          defaultPayload="upi://pay?pa=harshil.456.sharma@okhdfcbank&pn=Harshil%20Sharma&aid=uGICAgMCc_OiTDg"
          onCapture={handleCapture}
        />
      )}
    </main>
  );
}
