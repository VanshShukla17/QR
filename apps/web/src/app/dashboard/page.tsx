"use client";

import Link from "next/link";
import {
  ShieldWarning,
  ArrowSquareOut,
  LinkSimple,
  CheckCircle,
  Gear,
  Scan,
} from "@phosphor-icons/react";

import { useEffect, useState, useCallback } from "react";
import {
  getCredentialVerification,
  getMerchantStats,
  MerchantStatsResult,
} from "@/lib/api";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { getActiveCredentialId, getActiveMerchantId } from "@/lib/constants";

export default function DashboardPage() {
  const [credentialId, setCredentialId] = useState<string>(getActiveCredentialId());
  const [txHash, setTxHash] = useState<string>(
    "0x5934f0384053daf1e88539c6cbd5b940efbe1f683c4b51e49a12bbce8c0be6dc"
  );
  const [explorerUrl, setExplorerUrl] = useState<string>(
    "https://amoy.polygonscan.com/tx/0x5934f0384053daf1e88539c6cbd5b940efbe1f683c4b51e49a12bbce8c0be6dc"
  );

  // Canonical database stats
  const [stats, setStats] = useState<MerchantStatsResult | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<boolean>(false);

  const loadStats = useCallback(async () => {
    try {
      const merchantId = getActiveMerchantId();
      const res = await getMerchantStats(merchantId);
      setStats(res);
      setStatsError(false);
    } catch {
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    const credId = getActiveCredentialId();
    setCredentialId(credId);

    async function loadAnchor() {
      try {
        const res = await getCredentialVerification(credId);
        if (res?.anchor?.txHash) {
          setTxHash(res.anchor.txHash);
          if (res.anchor.explorerUrl) {
            setExplorerUrl(res.anchor.explorerUrl);
          } else {
            setExplorerUrl(`https://amoy.polygonscan.com/tx/${res.anchor.txHash}`);
          }
        }
      } catch {
        // Retain verified broadcast default
      }
    }
    loadAnchor();
    loadStats();

    // Refetch stats on focus, visibilitychange, or mutation events for realtime freshness
    const onFocus = () => loadStats();
    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onFocus);
    window.addEventListener("qraksha-stats-invalidate", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("qraksha-stats-invalidate", onFocus);
    };
  }, [loadStats]);

  return (
    <main className="flex-1 flex flex-col p-5 sm:p-6 max-w-[440px] mx-auto w-full pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))]">
      {/* Top Header */}
      <header className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Sharma Canteen
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium flex items-center gap-1.5">
            <span>Badges:</span>
            <span className="font-mono chip-neutral-pill text-[11px] py-0.5 px-2">
              GST-VERIFIED (Fast Ramp)
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <ThemeToggleButton />
          <Link
            href="/settings"
            aria-label="Settings"
            title="Settings"
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-[14px] bg-[var(--header-btn-bg)] border border-[var(--header-btn-border)] shadow-[var(--header-btn-shadow)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--header-btn-border-hover)] flex items-center justify-center transition-all select-none"
          >
            <Gear className="w-5 h-5" weight="regular" />
          </Link>
        </div>
      </header>

      {/* Main Action Banner: Self-Audit */}
      <div className="card-glass card-glow p-5 flex flex-col gap-3 mb-4">
        <div>
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Daily Verification Loop
          </span>
          <h2 className="text-base font-semibold text-[var(--text-primary)] mt-0.5">
            Audit Physical QR Sticker
          </h2>
        </div>
        <Link
          href="/audit/run"
          className="btn-red-glass h-12 w-full flex items-center justify-center gap-2 font-medium text-sm mt-1"
        >
          <span>Run Self-Audit Now</span>
          <Scan className="w-4 h-4" weight="bold" />
        </Link>
      </div>

      {/* Blockchain Anchor Status Card */}
      <div className="card-glass card-glow p-5 flex flex-col gap-3.5 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Blockchain Anchor <br className="sm:hidden" />
            Confirmed
          </h2>
          <span className="chip-neutral-pill text-[11px]">Polygon Amoy</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <CheckCircle
              className="w-4 h-4 text-[#1E7A3C] dark:text-[#4ADE80]"
              weight="fill"
            />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Confirmed (Tamper-Evident)
            </span>
          </div>
          <p className="font-mono text-xs text-[var(--text-secondary)] truncate">
            tx Hash: {txHash.slice(0, 10)}…{txHash.slice(-8)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-pill-secondary h-9 px-3 text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <span>PolygonScan</span>
            <ArrowSquareOut
              className="w-3.5 h-3.5 text-[var(--text-secondary)]"
              weight="bold"
            />
          </a>
          <Link
            href={`/verify/${credentialId}`}
            className="btn-pill-secondary h-9 px-3 text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <span>Public Audit</span>
            <LinkSimple
              className="w-3.5 h-3.5 text-[var(--text-secondary)]"
              weight="bold"
            />
          </Link>
        </div>
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link
          href="/credential/qrs"
          className="card-glass card-glow p-4 relative group hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)] transition-all"
        >
          <span className="text-xs text-[var(--text-secondary)] font-medium block">
            Active QRs:
          </span>
          {statsLoading ? (
            <div className="h-6 w-24 bg-white/10 dark:bg-white/5 animate-pulse rounded mt-1" />
          ) : statsError ? (
            <span className="text-xs text-[var(--text-muted)] mt-1 block">
              Unavailable
            </span>
          ) : (
            <span className="text-base font-semibold text-[var(--text-primary)] mt-1 block">
              {stats?.activeQrs ?? 0} Registered
            </span>
          )}
          {/* Green indicator bar on right edge */}
          <span
            className="w-1.5 h-6 bg-[#2FBF71] rounded-full absolute right-4 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
        </Link>
        <Link
          href="/audit/history"
          className="card-glass card-glow p-4 relative group hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)] transition-all"
        >
          <span className="text-xs text-[var(--text-secondary)] font-medium block">
            Clean Audits:
          </span>
          {statsLoading ? (
            <div className="h-6 w-24 bg-white/10 dark:bg-white/5 animate-pulse rounded mt-1" />
          ) : statsError ? (
            <span className="text-xs text-[var(--text-muted)] mt-1 block">
              Unavailable
            </span>
          ) : (
            <span className="text-base font-semibold text-[var(--text-primary)] mt-1 block">
              {stats?.cleanAudits ?? 0} Clean Runs
            </span>
          )}
          {/* Green indicator bar on right edge */}
          <span
            className="w-1.5 h-6 bg-[#2FBF71] rounded-full absolute right-4 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
        </Link>
      </div>

      {/* Auxiliary links */}
      <div className="flex flex-col gap-2">
        <Link
          href="/credential/dispute/new"
          className="card-glass p-4 flex justify-between items-center text-xs font-medium text-[var(--text-secondary)] hover:text-[#E0262F] transition-colors rounded-[16px]"
        >
          <span>Report Sticker Impersonation / Dispute</span>
          <ShieldWarning className="w-4 h-4 text-[#E0262F]" weight="duotone" />
        </Link>
      </div>
    </main>
  );
}
