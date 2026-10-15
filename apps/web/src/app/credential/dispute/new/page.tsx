"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ShieldWarning, Warning, SpinnerGap } from "@phosphor-icons/react";
import { fileDispute, FileDisputeResult } from "../../../../lib/api";

function DisputeForm() {
  const searchParams = useSearchParams();
  const initialCredentialId = searchParams.get("credentialId") || "";

  const [credentialId, setCredentialId] = useState(initialCredentialId);
  const [evidenceSummary, setEvidenceSummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FileDisputeResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialId.trim()) {
      setError("Target Credential ID is required.");
      return;
    }
    if (evidenceSummary.trim().length < 10) {
      setError("Please provide at least 10 characters detailing the dispute evidence.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fileDispute({
        credentialId: credentialId.trim(),
        evidenceSummary: evidenceSummary.trim(),
      });
      setResult(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Failed to file dispute. Please verify the target credential ID and try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="card-glass flex-1 flex flex-col justify-center items-center text-center p-6 sm:p-8 rounded-[24px]">
        <div className="w-12 h-12 rounded-[16px] bg-red-50 border border-red-200 flex items-center justify-center text-[#E0262F] mb-4">
          <ShieldWarning className="w-6 h-6" weight="duotone" />
        </div>

        <span className="chip-neutral-pill text-[11px] mb-2 font-medium">
          DISPUTE FILED • TIER DOWNGRADED
        </span>

        <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
          Target Credential Flagged
        </h2>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm mb-6">
          The credential has been immediately downgraded to{" "}
          <strong className="text-[#E0262F] font-mono font-medium">🔴 WARNING</strong>.
          Its previous tier was{" "}
          <span className="font-mono uppercase">{result.previousTrustTier}</span>. An
          administrative auditor will review your evidence within 24 hours.
        </p>

        <div className="w-full p-4 rounded-[16px] bg-[var(--box-mono-bg)] border border-[var(--box-mono-border)] text-left mb-6 font-mono text-xs">
          <div className="flex justify-between py-1 border-b border-[var(--surface-border)] text-[11px]">
            <span className="text-[var(--text-secondary)]">Dispute ID:</span>
            <span className="text-[var(--text-primary)] select-all font-semibold">
              {result.dispute.id}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-[var(--surface-border)] text-[11px]">
            <span className="text-[var(--text-secondary)]">Target Credential:</span>
            <span className="text-[var(--text-primary)] select-all truncate max-w-[200px]">
              {result.targetCredentialId}
            </span>
          </div>
          <div className="flex justify-between py-1 text-[11px]">
            <span className="text-[var(--text-secondary)]">Status:</span>
            <span className="text-amber-700 dark:text-amber-400 uppercase font-semibold">
              UNDER ADMIN REVIEW
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 w-full">
          <Link
            href="/dashboard"
            className="btn-red-glass h-11 px-4 rounded-[16px] text-white font-medium text-xs flex items-center justify-center gap-2"
          >
            <span>Return to Merchant Dashboard</span>
          </Link>
          <Link
            href="/audit/run"
            className="btn-pill-secondary h-11 px-4 rounded-[16px] text-xs font-medium flex items-center justify-center transition-colors"
          >
            <span>Run Another Audit Scan</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="flex items-center gap-3 mb-5">
        <Link
          href="/dashboard"
          aria-label="Back to Dashboard"
          title="Back to Dashboard"
          className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-[14px] bg-[var(--header-btn-bg)] border border-[var(--header-btn-border)] shadow-[var(--header-btn-shadow)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--header-btn-border-hover)] flex items-center justify-center transition-all select-none"
        >
          <ArrowLeft className="w-5 h-5" weight="bold" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
            Report Impersonation / QR Swap
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            File a formal merchant credential dispute
          </p>
        </div>
      </header>

      {/* Immediate Downgrade Impact Banner */}
      <div className="p-4 rounded-[16px] bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 mb-5 flex gap-3 items-start">
        <ShieldWarning
          className="w-5 h-5 text-[#E0262F] shrink-0 mt-0.5"
          weight="duotone"
        />
        <div className="text-xs leading-relaxed text-[var(--text-primary)]">
          <span className="font-semibold text-[#E0262F] block mb-0.5 font-mono text-[11px] uppercase tracking-wide">
            Immediate Auto-Downgrade
          </span>
          Submitting a dispute automatically downgrades the target credential to{" "}
          <span className="text-[#E0262F] font-mono font-medium">🔴 WARNING</span> across
          all customer and audit scans while an admin reviews your report.
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-[16px] bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-[#E0262F] dark:text-[#FF6B5E] text-xs mb-4 flex items-center gap-2">
          <Warning className="w-4 h-4 shrink-0" weight="duotone" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="card-glass p-5 rounded-[24px] flex flex-col gap-4"
      >
        <div>
          <label className="text-xs font-semibold text-[var(--text-primary)] mb-1 block">
            Target Credential ID
          </label>
          <input
            type="text"
            required
            value={credentialId}
            onChange={(e) => setCredentialId(e.target.value)}
            placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
            className="w-full h-10 px-3.5 rounded-[14px] border border-[var(--box-mono-border)] bg-[var(--box-mono-bg)] text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-[#E0262F]"
          />
          <p className="text-[10px] font-mono text-[var(--text-secondary)] mt-1">
            Found on the merchant's physical sticker, QRaksha verification URL, or audit
            logs.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text-primary)] mb-1 block">
            Evidence Summary & Circumstances
          </label>
          <textarea
            rows={5}
            required
            minLength={10}
            maxLength={2000}
            value={evidenceSummary}
            onChange={(e) => setEvidenceSummary(e.target.value)}
            placeholder="Explain why this credential is fraudulent (e.g. Unauthorized sticker pasted over counter, fake merchant name, altered VPA recipient, photo evidence link)..."
            className="w-full p-3.5 rounded-[14px] border border-[var(--box-mono-border)] bg-[var(--box-mono-bg)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#E0262F] resize-none leading-relaxed"
          />
          <div className="flex justify-between items-center text-[10px] font-mono text-[var(--text-secondary)] mt-1">
            <span>Minimum 10 characters required</span>
            <span>{evidenceSummary.length} / 2000</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-red-glass mt-2 h-11 px-4 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <SpinnerGap className="w-4 h-4 animate-spin" weight="bold" />
              <span>Flagging Target Credential...</span>
            </>
          ) : (
            <>
              <ShieldWarning className="w-4 h-4" weight="bold" />
              <span>Submit Dispute & Flag Credential</span>
            </>
          )}
        </button>

        <p className="text-[10px] text-center text-[#6B7280] leading-relaxed mt-1">
          Frivolous or malicious filings will be rejected and may result in penalties to
          your merchant account.
        </p>
      </form>
    </>
  );
}

export default function NewDisputePage() {
  return (
    <main className="flex-1 flex flex-col p-5 sm:p-6 max-w-[440px] mx-auto w-full pb-28">
      <Suspense
        fallback={
          <div className="text-xs font-mono text-[#6B7280] p-4">
            Loading dispute form...
          </div>
        }
      >
        <DisputeForm />
      </Suspense>
    </main>
  );
}
