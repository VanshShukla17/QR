"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  SignOut,
  QrCode,
  ClockCounterClockwise,
  ShieldWarning,
  Check,
  Copy,
  SpinnerGap,
  CaretDown,
  CaretRight,
} from "@phosphor-icons/react";
import { getMyCredentials, getMerchantStats } from "@/lib/api";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { DEFAULT_DEMO_CREDENTIAL_ID, getActiveMerchantId } from "@/lib/constants";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{
    displayName: string;
    contactPhone: string;
    identityTier: "gst_verified" | "baseline";
    credentialId: string;
    trustTier: string;
    trustScore: number;
    status: string;
    qrCount: number;
    activatedAt: string | null;
  }>({
    displayName: "Sharma Canteen",
    contactPhone: "+91 98765 43210",
    identityTier: "gst_verified",
    credentialId: DEFAULT_DEMO_CREDENTIAL_ID,
    trustTier: "verified",
    trustScore: 96,
    status: "active",
    qrCount: 0,
    activatedAt: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const storedMerchantId = getActiveMerchantId();
        const storedName = localStorage.getItem("qraksha_merchant_name");
        const storedPhone = localStorage.getItem("qraksha_merchant_phone");
        const storedTier = localStorage.getItem("qraksha_identity_tier");

        const [data, stats] = await Promise.all([
          getMyCredentials(storedMerchantId).catch(() => null),
          getMerchantStats(storedMerchantId).catch(() => null),
        ]);
        const active = data?.activeCredential;

        if (active || stats) {
          setProfile((prev) => ({
            ...prev,
            credentialId: active?.id || prev.credentialId,
            trustTier: active?.trust_tier || "unverified",
            trustScore: active?.trust_score ?? 0,
            status: active?.status || "active",
            qrCount: stats?.activeQrs ?? (data?.qrs?.length || 0),
            activatedAt: active?.activated_at || null,
            displayName: storedName || prev.displayName,
            contactPhone: storedPhone || prev.contactPhone,
            identityTier:
              storedTier === "baseline" || storedTier === "gst_verified"
                ? storedTier
                : prev.identityTier,
          }));
        }
      } catch (_err) {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCopyCredentialId = () => {
    navigator.clipboard.writeText(profile.credentialId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSignOut = () => {
    setIsSigningOut(true);
    // Clear merchant local storage credentials
    localStorage.removeItem("qraksha_merchant_id");
    localStorage.removeItem("qraksha_credential_id");
    localStorage.removeItem("qraksha_merchant_name");
    localStorage.removeItem("qraksha_merchant_phone");
    localStorage.removeItem("qraksha_identity_tier");
    localStorage.removeItem("qraksha_token");

    setTimeout(() => {
      router.push("/");
    }, 600);
  };

  return (
    <main className="flex-1 flex flex-col p-5 sm:p-6 max-w-[440px] mx-auto w-full pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))]">
      {/* Header */}
      <header className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-[14px] bg-[var(--header-btn-bg)] border border-[var(--header-btn-border)] shadow-[var(--header-btn-shadow)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--header-btn-border-hover)] flex items-center justify-center transition-all select-none"
            aria-label="Back to dashboard"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" weight="bold" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Account & Security
          </h1>
        </div>
        <ThemeToggleButton />
      </header>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)] mb-3">
          <SpinnerGap className="w-3.5 h-3.5 animate-spin text-[#E0262F]" weight="bold" />
          <span>Syncing verified credentials…</span>
        </div>
      )}

      <div className="flex flex-col gap-3.5">
        {/* Merchant Profile Card */}
        <div className="card-glass card-glow p-5 flex flex-col gap-1">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {profile.displayName}
          </h2>
          <p className="text-xs font-mono text-[var(--text-secondary)]">
            {profile.contactPhone}
          </p>
          <div className="mt-2">
            <span className="chip-success-pill">
              Status: {profile.status === "active" ? "Active" : profile.status}
            </span>
          </div>
        </div>

        {/* Identity Verification Tier Card */}
        <div className="card-glass card-glow p-5 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Identity Verification Tier
            </h3>
            <span className="chip-neutral-pill">
              {profile.identityTier === "gst_verified" ? "Tier 1" : "Baseline"}
            </span>
          </div>
          <p className="text-xs font-medium text-[var(--text-secondary)] mt-0.5">
            {profile.identityTier === "gst_verified"
              ? "GST / UDYAM Verified"
              : "Bank Penny-Drop Verified"}
          </p>
        </div>

        {/* Active Credential Standing & On-Chain Hash */}
        <div className="card-glass card-glow p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Active Credential Standing
          </h3>

          {/* Chips Row */}
          <div className="flex items-center gap-2">
            <span className="chip-success-pill capitalize">{profile.trustTier}</span>
            <span className="chip-neutral-pill">
              Score: {Math.round(profile.trustScore)}
            </span>
          </div>

          {/* Credential ID row */}
          <div className="mono-box-container p-3 flex items-center justify-between text-xs">
            <div className="truncate mr-2">
              <span className="text-[10px] text-[var(--text-muted)] block uppercase">
                Credential ID
              </span>
              <span className="text-[var(--text-primary)] font-mono select-all truncate block">
                {profile.credentialId}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyCredentialId}
              className="p-2 rounded-[12px] bg-[var(--header-btn-bg)] border border-[var(--header-btn-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0 shadow-sm"
              title="Copy Credential ID"
              aria-label="Copy Credential ID"
            >
              {copiedId ? (
                <Check
                  className="w-3.5 h-3.5 text-[#1E7A3C] dark:text-[#4ADE80]"
                  weight="bold"
                />
              ) : (
                <Copy className="w-3.5 h-3.5" weight="bold" />
              )}
            </button>
          </div>

          <Link
            href={`/verify/${profile.credentialId}`}
            className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors self-start mt-0.5"
          >
            <span>View Public Blockchain Proof Record</span>
            <CaretDown className="w-3.5 h-3.5" weight="bold" />
          </Link>
        </div>

        {/* Management Links as Rounded Card Items */}
        <div className="flex flex-col gap-2.5 pt-1">
          <Link
            href="/credential/qrs"
            className="card-glass p-4 rounded-[16px] flex items-center justify-between text-sm font-medium text-[var(--text-primary)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)] transition-all"
          >
            <div className="flex items-center gap-3">
              <QrCode className="w-4 h-4 text-[#E0262F]" weight="duotone" />
              <span>Manage Registered Physical QRs</span>
            </div>
            <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
              <span className="text-xs font-mono">{profile.qrCount} Active</span>
              <CaretRight className="w-4 h-4" weight="bold" />
            </div>
          </Link>

          <Link
            href="/audit/history"
            className="card-glass p-4 rounded-[16px] flex items-center justify-between text-sm font-medium text-[var(--text-primary)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)] transition-all"
          >
            <div className="flex items-center gap-3">
              <ClockCounterClockwise
                className="w-4 h-4 text-[#1E7A3C] dark:text-[#4ADE80]"
                weight="duotone"
              />
              <span>Audit History Log</span>
            </div>
            <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
              <span className="text-xs font-mono">View</span>
              <CaretRight className="w-4 h-4" weight="bold" />
            </div>
          </Link>

          <Link
            href="/credential/dispute/new"
            className="card-glass p-4 rounded-[16px] flex items-center justify-between text-xs font-medium text-[var(--text-secondary)] hover:text-[#E0262F] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ShieldWarning className="w-4 h-4 text-[#E0262F]" weight="duotone" />
              <span>File Dispute Against Impersonator</span>
            </div>
            <CaretRight className="w-4 h-4 text-[var(--text-muted)]" weight="bold" />
          </Link>
        </div>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="mt-4 h-11 rounded-[16px] border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-[#E0262F] dark:text-[#FF6B5E] text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {isSigningOut ? (
            <SpinnerGap className="w-4 h-4 animate-spin" weight="bold" />
          ) : (
            <SignOut className="w-4 h-4" weight="bold" />
          )}
          <span>Sign Out of Merchant Session</span>
        </button>
      </div>
    </main>
  );
}
