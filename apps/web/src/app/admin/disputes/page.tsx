"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldWarning,
  ArrowLeft,
  SpinnerGap,
  CheckCircle,
  XCircle,
  Clock,
  ArrowsClockwise,
  Warning,
  PaperPlaneTilt,
  Buildings,
  FileText,
  User,
} from "@phosphor-icons/react";
import {
  getAdminDisputes,
  resolveAdminDispute,
  AdminDisputeItem,
  ApiError,
} from "@/lib/api";

type TabFilter = "all" | "open" | "resolved_upheld" | "resolved_rejected";

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<AdminDisputeItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolution state tracking for active card
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [decision, setDecision] = useState<"resolved_upheld" | "resolved_rejected">(
    "resolved_upheld"
  );
  const [resolutionReason, setResolutionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchDisputes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAdminDisputes({
        status: activeTab === "all" ? undefined : activeTab,
      });
      setDisputes(result.disputes);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to load disputes queue. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [activeTab]);

  const handleOpenResolve = (dispute: AdminDisputeItem) => {
    setResolvingId(dispute.id);
    setDecision("resolved_upheld");
    setResolutionReason("");
    setSubmitError(null);
  };

  const handleCancelResolve = () => {
    setResolvingId(null);
    setResolutionReason("");
    setSubmitError(null);
  };

  const handleSubmitResolution = async (disputeId: string) => {
    if (resolutionReason.trim().length < 5) {
      setSubmitError("Resolution reason must be at least 5 characters long.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await resolveAdminDispute(disputeId, {
        status: decision,
        resolutionReason: resolutionReason.trim(),
      });

      setSuccessMessage(res.message);
      setResolvingId(null);
      // Refresh list
      await fetchDisputes();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError("Failed to submit resolution. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDisputes = disputes.filter((d) => {
    if (activeTab === "all") return true;
    return d.status === activeTab;
  });

  return (
    <main className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/registry"
            className="p-2 rounded-[4px] bg-ink-2 border border-border hover:border-brand transition-colors text-text"
            aria-label="Back to Registry"
          >
            <ArrowLeft className="w-4 h-4 text-text" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-brand">
              <ShieldWarning className="w-3.5 h-3.5" />
              <span>ADMIN CONSOLE // DISPUTES QUEUE</span>
            </div>
            <h1 className="text-xl font-medium text-text">Merchant Dispute Queue</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchDisputes}
          disabled={isLoading}
          className="h-9 px-3 rounded-[4px] bg-ink-2 border border-border hover:border-brand text-xs font-mono text-muted hover:text-text flex items-center gap-1.5 transition-colors"
        >
          <ArrowsClockwise className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="p-4 rounded-[4px] bg-ok/10 border border-ok/30 text-text flex items-center gap-2.5 mb-5 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-ok shrink-0" />
          <p className="text-xs font-mono text-ok">{successMessage}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 mb-6 overflow-x-auto">
        {(
          [
            { id: "all", label: "All Disputes" },
            { id: "open", label: "Open / Under Review" },
            { id: "resolved_upheld", label: "Resolved: Upheld" },
            { id: "resolved_rejected", label: "Resolved: Rejected" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-mono transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-brand text-ink font-medium"
                : "bg-ink-2 text-muted hover:text-text border border-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-12 rounded-[4px] bg-ink-2 border border-border flex flex-col items-center justify-center gap-3 text-center my-6">
          <SpinnerGap className="w-6 h-6 animate-spin text-brand" />
          <span className="text-xs font-mono text-muted">Loading disputes queue…</span>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div
          role="alert"
          className="p-5 rounded-[4px] bg-danger/10 border border-danger text-text flex flex-col gap-3 my-4"
        >
          <div className="flex items-start gap-3">
            <Warning className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="text-sm font-medium text-text">Failed to Load Disputes</h2>
              <p className="text-xs text-muted mt-1">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchDisputes}
            className="self-start h-8 px-3 rounded-[4px] bg-ink border border-border text-xs font-mono text-text hover:border-brand flex items-center gap-1.5 transition-colors"
          >
            <ArrowsClockwise className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredDisputes.length === 0 && (
        <div className="p-12 rounded-[4px] bg-ink-2 border border-border text-center flex flex-col items-center justify-center my-6">
          <ShieldWarning className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
          <h2 className="text-sm font-mono text-text uppercase tracking-wider">
            No Disputes Found
          </h2>
          <p className="text-xs text-muted mt-1 max-w-sm">
            {activeTab === "open"
              ? "All merchant credentials in the pilot registry are currently in good standing."
              : "No dispute records match the selected filter."}
          </p>
        </div>
      )}

      {/* Disputes List */}
      {!isLoading && !error && filteredDisputes.length > 0 && (
        <div className="flex flex-col gap-4">
          {filteredDisputes.map((dispute) => {
            const isOpen = dispute.status === "open";
            const isUpheld = dispute.status === "resolved_upheld";
            const isRejected = dispute.status === "resolved_rejected";

            return (
              <div
                key={dispute.id}
                className={`p-5 rounded-[4px] bg-ink-2 border-t border-r border-b border-border flex flex-col gap-4 transition-colors ${
                  isOpen
                    ? "border-l-4 border-l-warn"
                    : isUpheld
                      ? "border-l-4 border-l-danger"
                      : "border-l-4 border-l-ok"
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Buildings className="w-4 h-4 text-brand shrink-0" />
                    <span className="text-sm font-medium text-text">
                      {dispute.targetMerchantName || "Target Credential"}
                    </span>
                    {dispute.targetTrustTier && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-[4px] border ${
                          dispute.targetTrustTier === "verified"
                            ? "bg-ok/10 text-ok border-ok/30"
                            : dispute.targetTrustTier === "warning"
                              ? "bg-danger/10 text-danger border-danger/30"
                              : "bg-warn/10 text-warn border-warn/30"
                        }`}
                      >
                        TIER: {dispute.targetTrustTier.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-[4px] border flex items-center gap-1 ${
                        isOpen
                          ? "bg-warn/10 text-warn border-warn/30"
                          : isUpheld
                            ? "bg-danger/10 text-danger border-danger/30"
                            : "bg-ok/10 text-ok border-ok/30"
                      }`}
                    >
                      {isOpen && <Clock className="w-3 h-3" />}
                      {isUpheld && <XCircle className="w-3 h-3" />}
                      {isRejected && <CheckCircle className="w-3 h-3" />}
                      <span>{dispute.status.replace("_", " ")}</span>
                    </span>
                  </div>
                </div>

                {/* Metadata details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-muted">
                  <div>
                    <span className="text-[10px] block">TARGET CREDENTIAL ID</span>
                    <Link
                      href={`/verify/${dispute.credentialId}`}
                      className="text-text hover:text-brand transition-colors break-all"
                    >
                      {dispute.credentialId}
                    </Link>
                  </div>
                  <div>
                    <span className="text-[10px] block">FILED AT</span>
                    <span className="text-text">
                      {new Date(dispute.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {dispute.filerMerchantName && (
                    <div className="col-span-full flex items-center gap-1.5 text-text">
                      <User className="w-3.5 h-3.5 text-muted" />
                      <span>Reported by: {dispute.filerMerchantName}</span>
                    </div>
                  )}
                </div>

                {/* Evidence Summary Box */}
                <div className="p-3.5 rounded-[4px] bg-ink border border-border">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted mb-1.5">
                    <FileText className="w-3 h-3 text-brand" />
                    <span>Evidence / Incident Description</span>
                  </div>
                  <p className="text-xs text-text leading-relaxed whitespace-pre-wrap">
                    {dispute.evidenceSummary}
                  </p>
                </div>

                {/* Resolved Info Box if already resolved */}
                {!isOpen && dispute.resolutionReason && (
                  <div
                    className={`p-3.5 rounded-[4px] border ${
                      isUpheld
                        ? "bg-danger/5 border-danger/20 text-danger"
                        : "bg-ok/5 border-ok/20 text-ok"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider mb-1">
                      <span>ADMIN RESOLUTION REASON</span>
                      {dispute.resolvedAt && (
                        <span>{new Date(dispute.resolvedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    <p className="text-xs text-text leading-relaxed">
                      {dispute.resolutionReason}
                    </p>
                  </div>
                )}

                {/* Inline Resolution Action / Form for Open Disputes */}
                {isOpen && (
                  <div className="pt-2 border-t border-border/50">
                    {resolvingId === dispute.id ? (
                      <div className="p-4 rounded-[4px] bg-ink border border-border flex flex-col gap-3">
                        <span className="text-xs font-mono uppercase tracking-wider text-brand font-medium">
                          Submit Administrative Decision
                        </span>

                        {submitError && (
                          <div className="p-2 rounded bg-danger/10 border border-danger/30 text-danger text-xs font-mono">
                            {submitError}
                          </div>
                        )}

                        {/* Decision Radio Toggles */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setDecision("resolved_upheld")}
                            className={`p-3 rounded-[4px] text-xs font-mono text-left border transition-colors flex items-start gap-2 ${
                              decision === "resolved_upheld"
                                ? "bg-danger/15 border-danger text-text"
                                : "bg-ink-2 border-border text-muted hover:border-danger/50"
                            }`}
                          >
                            <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold block text-danger">
                                Upheld (Suspend)
                              </span>
                              <span className="text-[10px] text-muted">
                                Confirms tampering. Suspends credential and locks tier at
                                WARNING.
                              </span>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDecision("resolved_rejected")}
                            className={`p-3 rounded-[4px] text-xs font-mono text-left border transition-colors flex items-start gap-2 ${
                              decision === "resolved_rejected"
                                ? "bg-ok/15 border-ok text-text"
                                : "bg-ink-2 border-border text-muted hover:border-ok/50"
                            }`}
                          >
                            <CheckCircle className="w-4 h-4 text-ok shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold block text-ok">
                                Rejected (Restore)
                              </span>
                              <span className="text-[10px] text-muted">
                                Dismisses report. Restores standing and active status.
                              </span>
                            </div>
                          </button>
                        </div>

                        {/* Resolution Reason Field */}
                        <div>
                          <label
                            htmlFor={`reason-${dispute.id}`}
                            className="block text-[11px] font-mono text-muted mb-1"
                          >
                            Resolution Reason (Required, min 5 chars):
                          </label>
                          <textarea
                            id={`reason-${dispute.id}`}
                            value={resolutionReason}
                            onChange={(e) => setResolutionReason(e.target.value)}
                            rows={3}
                            placeholder="State audit findings, physical inspection report, or verification rationale…"
                            className="w-full p-2.5 rounded-[4px] bg-ink-2 border border-border text-text text-xs focus:border-brand focus:outline-none resize-none font-mono"
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={handleCancelResolve}
                            disabled={isSubmitting}
                            className="h-8 px-3 rounded-[4px] bg-transparent border border-border text-xs font-mono text-muted hover:text-text transition-colors"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSubmitResolution(dispute.id)}
                            disabled={isSubmitting || resolutionReason.trim().length < 5}
                            className={`h-8 px-4 rounded-[4px] text-xs font-mono font-medium flex items-center gap-1.5 transition-colors ${
                              decision === "resolved_upheld"
                                ? "bg-danger text-text hover:bg-danger/80 disabled:opacity-50"
                                : "bg-ok text-ink hover:bg-ok/90 disabled:opacity-50"
                            }`}
                          >
                            {isSubmitting ? (
                              <SpinnerGap className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <PaperPlaneTilt className="w-3.5 h-3.5" />
                            )}
                            <span>Confirm & Finalize Resolution</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenResolve(dispute)}
                        className="h-8 px-3 rounded-[4px] bg-ink border border-border hover:border-brand text-xs font-mono text-brand hover:text-brand-soft flex items-center gap-1.5 transition-colors"
                      >
                        <ShieldWarning className="w-3.5 h-3.5" />
                        <span>Review & Resolve Dispute</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
