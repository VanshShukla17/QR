"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  ArrowLeft,
  MagnifyingGlass as Search,
  ShieldCheck,
  ShieldWarning,
  SpinnerGap as Loader2,
  ArrowsClockwise as RefreshCw,
  ArrowSquareOut as ExternalLink,
  Plant as Sprout,
  CheckCircle as CheckCircle2,
  Warning as AlertTriangle,
  QrCode,
  Buildings as Building,
  Phone,
} from "@phosphor-icons/react";
import {
  getAdminCredentials,
  seedDemoRegistry,
  AdminCredentialItem,
  ApiError,
} from "@/lib/api";

export default function AdminRegistryPage() {
  const [credentials, setCredentials] = useState<AdminCredentialItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const fetchRegistry = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAdminCredentials({
        search: search.trim() || undefined,
        trustTier: tierFilter !== "all" ? tierFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setCredentials(result.credentials);
      setTotalCount(result.total);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to load credential registry. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistry();
  }, [tierFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRegistry();
  };

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    setBannerMessage(null);
    try {
      const result = await seedDemoRegistry();
      setBannerMessage(
        `Demo Registry Seeded: ${result.seededCount} fictional merchants populated successfully.`
      );
      await fetchRegistry();
      setTimeout(() => setBannerMessage(null), 5000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Seeding failed: ${err.message}`);
      } else {
        setError("Failed to seed demo registry.");
      }
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col p-6 max-w-5xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-[4px] bg-ink-2 border border-border hover:border-brand transition-colors text-text"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4 text-text" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-brand">
              <Users className="w-3.5 h-3.5" />
              <span>ADMIN CONSOLE // CREDENTIAL REGISTRY</span>
            </div>
            <h1 className="text-xl font-medium text-text">
              Merchant Credential Registry
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/disputes"
            className="h-9 px-3 rounded-[4px] bg-ink-2 border border-border hover:border-brand text-xs font-mono text-text flex items-center gap-1.5 transition-colors"
          >
            <ShieldWarning className="w-3.5 h-3.5 text-warn" />
            <span>Disputes Queue</span>
          </Link>

          <button
            type="button"
            onClick={handleSeedDemo}
            disabled={isSeeding || isLoading}
            className="h-9 px-3.5 rounded-[4px] bg-brand text-ink hover:bg-brand-soft text-xs font-mono font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {isSeeding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sprout className="w-3.5 h-3.5" />
            )}
            <span>Seed Demo Cohort</span>
          </button>
        </div>
      </div>

      {/* Success / Info Banner */}
      {bannerMessage && (
        <div className="p-4 rounded-[4px] bg-ok/10 border border-ok/30 text-text flex items-center gap-2.5 mb-5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-ok shrink-0" />
          <p className="text-xs font-mono text-ok">{bannerMessage}</p>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-[4px] bg-ink-2 border border-border flex flex-col gap-3 mb-6">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by merchant name, phone, or credential ID…"
              className="w-full h-9 pl-9 pr-3 rounded-[4px] bg-ink border border-border text-xs text-text placeholder:text-muted focus:border-brand focus:outline-none font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="h-9 px-4 rounded-[4px] bg-ink border border-border hover:border-brand text-xs font-mono text-text transition-colors flex items-center gap-1"
          >
            <span>Search</span>
          </button>
          <button
            type="button"
            onClick={fetchRegistry}
            disabled={isLoading}
            className="h-9 px-3 rounded-[4px] bg-ink border border-border hover:border-brand text-xs font-mono text-muted hover:text-text transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </form>

        {/* Tier filter chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40 text-xs font-mono">
          <span className="text-[11px] text-muted mr-1">TRUST TIER:</span>
          {(
            [
              { id: "all", label: "All" },
              { id: "verified", label: "🟢 Verified" },
              { id: "unverified", label: "🟡 Unverified" },
              { id: "warning", label: "🔴 Warning" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTierFilter(t.id)}
              className={`px-2.5 py-1 rounded-[4px] text-[11px] transition-colors ${
                tierFilter === t.id
                  ? "bg-brand text-ink font-medium"
                  : "bg-ink text-muted hover:text-text border border-border"
              }`}
            >
              {t.label}
            </button>
          ))}

          <span className="text-[11px] text-muted ml-3 mr-1">STATUS:</span>
          {(
            [
              { id: "all", label: "All" },
              { id: "active", label: "Active" },
              { id: "recently_registered", label: "Recently Registered" },
              { id: "suspended", label: "Suspended" },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatusFilter(s.id)}
              className={`px-2.5 py-1 rounded-[4px] text-[11px] transition-colors ${
                statusFilter === s.id
                  ? "bg-brand text-ink font-medium"
                  : "bg-ink text-muted hover:text-text border border-border"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-12 rounded-[4px] bg-ink-2 border border-border flex flex-col items-center justify-center gap-3 text-center my-6">
          <Loader2 className="w-6 h-6 animate-spin text-brand" />
          <span className="text-xs font-mono text-muted">
            Querying merchant registry…
          </span>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div
          role="alert"
          className="p-5 rounded-[4px] bg-danger/10 border border-danger text-text flex flex-col gap-3 my-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="text-sm font-medium text-text">Failed to Load Registry</h2>
              <p className="text-xs text-muted mt-1">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchRegistry}
            className="self-start h-8 px-3 rounded-[4px] bg-ink border border-border text-xs font-mono text-text hover:border-brand flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && credentials.length === 0 && (
        <div className="p-12 rounded-[4px] bg-ink-2 border border-border text-center flex flex-col items-center justify-center my-6">
          <Users className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
          <h2 className="text-sm font-mono text-text uppercase tracking-wider">
            No Merchant Credentials Found
          </h2>
          <p className="text-xs text-muted mt-1 max-w-sm mb-4">
            No merchant records match your current search and filters. Click below to
            populate the demo cohort.
          </p>
          <button
            type="button"
            onClick={handleSeedDemo}
            disabled={isSeeding}
            className="h-9 px-4 rounded-[4px] bg-brand text-ink text-xs font-mono font-medium hover:bg-brand-soft transition-colors flex items-center gap-1.5"
          >
            <Sprout className="w-3.5 h-3.5" />
            <span>Seed 7 Fictional Demo Merchants</span>
          </button>
        </div>
      )}

      {/* Registry Cards List */}
      {!isLoading && !error && credentials.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-mono text-muted px-1">
            <span>
              SHOWING {credentials.length} OF {totalCount} REGISTERED CREDENTIALS
            </span>
          </div>

          {credentials.map((cred) => {
            const isVerified = cred.trustTier === "verified";
            const isWarning = cred.trustTier === "warning";

            return (
              <div
                key={cred.id}
                className={`p-4 rounded-[4px] bg-ink-2 border-t border-r border-b border-border flex flex-col gap-3 transition-colors ${
                  isVerified
                    ? "border-l-4 border-l-ok"
                    : isWarning
                      ? "border-l-4 border-l-danger"
                      : "border-l-4 border-l-warn"
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Building className="w-4 h-4 text-brand shrink-0" />
                    <span className="text-sm font-medium text-text">
                      {cred.merchantName}
                    </span>

                    {/* Trust Tier Badge */}
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-[4px] border ${
                        isVerified
                          ? "bg-ok/10 text-ok border-ok/30"
                          : isWarning
                            ? "bg-danger/10 text-danger border-danger/30"
                            : "bg-warn/10 text-warn border-warn/30"
                      }`}
                    >
                      {cred.trustTier.toUpperCase()} // SCORE:{" "}
                      {Math.round(cred.trustScore)}
                    </span>

                    {/* Status Badge */}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-ink text-muted border border-border uppercase">
                      {cred.status.replace("_", " ")}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/verify/${cred.id}`}
                      className="h-7 px-2.5 rounded-[4px] bg-ink border border-border hover:border-brand text-[11px] font-mono text-text hover:text-brand flex items-center gap-1 transition-colors"
                      title="Inspect Public Proof"
                    >
                      <ShieldCheck className="w-3 h-3 text-brand" />
                      <span>Verify Record</span>
                      <ExternalLink className="w-2.5 h-2.5 text-muted" />
                    </Link>

                    <Link
                      href={`/credential/dispute/new?credentialId=${cred.id}`}
                      className="h-7 px-2.5 rounded-[4px] bg-ink border border-border hover:border-danger text-[11px] font-mono text-muted hover:text-danger flex items-center gap-1 transition-colors"
                      title="File Impersonation Dispute"
                    >
                      <ShieldWarning className="w-3 h-3 text-warn" />
                      <span>Dispute</span>
                    </Link>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-2 border-t border-border/40 text-muted">
                  <div>
                    <span className="text-[10px] block">CONTACT</span>
                    <span className="text-text flex items-center gap-1">
                      <Phone className="w-3 h-3 text-muted shrink-0" />
                      <span>{cred.contactPhone || "—"}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] block">IDENTITY LEVEL</span>
                    <span className="text-text uppercase">
                      {cred.identityTier
                        ? cred.identityTier.replace("_", " ")
                        : "Baseline"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] block">PHYSICAL QRS</span>
                    <span className="text-text flex items-center gap-1">
                      <QrCode className="w-3 h-3 text-brand shrink-0" />
                      <span>
                        {cred.qrCount} Sticker{cred.qrCount === 1 ? "" : "s"} Bound
                      </span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] block">ON-CHAIN ANCHOR</span>
                    <span className="text-text flex items-center gap-1 truncate">
                      {cred.latestAnchorStatus === "confirmed" ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-ok shrink-0" />
                          <span className="text-ok">Confirmed</span>
                        </>
                      ) : cred.latestAnchorStatus === "pending" ? (
                        <span className="text-warn">Pending Block</span>
                      ) : (
                        <span className="text-muted">Not Anchored</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Footer with ID */}
                <div className="flex items-center justify-between text-[10px] font-mono text-muted/70 pt-1">
                  <span className="truncate">CREDENTIAL ID: {cred.id}</span>
                  {cred.activatedAt && (
                    <span>
                      ACTIVE SINCE {new Date(cred.activatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
