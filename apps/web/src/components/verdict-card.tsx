import React from "react";
import {
  ShieldCheck,
  ShieldWarning,
  Shield,
  Check,
  Warning,
  X,
} from "@phosphor-icons/react";
import {
  VoiceLanguageCode,
  VoiceVerdictType,
  VERDICT_DISPLAY_LABELS,
} from "@qraksha/shared";
import { AuditResult } from "../lib/api";

export interface VerdictCardProps {
  result: AuditResult;
  onReset?: () => void;
  title?: string;
  isCustomerView?: boolean;
  lang?: VoiceLanguageCode;
}

export function VerdictCard({
  result,
  onReset,
  title = "Audit Verdict",
  isCustomerView = false,
  lang = "en-IN",
}: VerdictCardProps) {
  const { verdict, reason, message, agentOutputs, degradedCheck, isUnregistered } =
    result;

  // Semantic verdict tokens per DESIGN.md Section 2
  // VERIFIED: --ok (#2FBF71)
  // RECENTLY_REGISTERED / UNVERIFIED: --warn (#F2B531)
  // WARNING: --danger (#E5384F)
  // Rule: Brand orange is NEVER used for WARNING!
  let borderColor = "border-l-warn";
  let textColor = "text-warn";
  let bgBadge = "bg-warn/10 text-warn border-warn/30";
  let ShieldIcon = Shield;
  let verdictDisplayLabel = "RECENTLY REGISTERED";

  if (verdict === "VERIFIED") {
    borderColor = "border-l-ok";
    textColor = "text-ok";
    bgBadge = "bg-ok/10 text-ok border-ok/30";
    ShieldIcon = ShieldCheck;
    verdictDisplayLabel = "VERIFIED";
  } else if (verdict === "WARNING") {
    borderColor = "border-l-danger";
    textColor = "text-danger";
    bgBadge = "bg-danger/15 text-[#FF6B81] border-danger/40";
    ShieldIcon = ShieldWarning;
    if (reason === "CREDENTIAL_SUSPENDED") {
      verdictDisplayLabel = "SUSPENDED";
    } else if (reason === "LOCATION_MISMATCH") {
      verdictDisplayLabel = "LOCATION MISMATCH";
    } else {
      verdictDisplayLabel = "WARNING";
    }
  } else {
    // RECENTLY_REGISTERED / UNVERIFIED / NOT_ENROLLED (Tier 2 warn styling per DESIGN.md Section 2)
    if (isUnregistered || (reason as string) === "UNKNOWN_QR") {
      verdictDisplayLabel = "NOT ENROLLED";
    } else {
      verdictDisplayLabel = "BUILDING TRUST";
    }
  }

  const voiceVerdictKey: VoiceVerdictType =
    verdict === "VERIFIED"
      ? "VERIFIED"
      : verdict === "WARNING"
        ? "WARNING"
        : isUnregistered
          ? "UNVERIFIED"
          : "RECENTLY_REGISTERED";

  const localizedLabels = VERDICT_DISPLAY_LABELS[lang]?.[voiceVerdictKey];
  if (lang !== "en-IN" && localizedLabels) {
    verdictDisplayLabel = localizedLabels.title;
  }

  // Evidence breakdown extraction
  const identityStatus = agentOutputs?.identity?.status || "pass";
  const visionStatus =
    agentOutputs?.vision?.status ||
    (agentOutputs?.vision?.metadata?.skipped ? "skipped" : "pass");
  const contextStatus =
    agentOutputs?.context?.status ||
    (agentOutputs?.context?.metadata?.missingLocation ? "skipped" : "pass");

  return (
    <div className="flex flex-col gap-4 w-full max-w-[480px] mx-auto animate-verdict-reveal">
      {/* Full-screen Takeover Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
          {title}
        </span>
        {degradedCheck && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-warn/10 text-warn border border-warn/30">
            DEGRADED CHECK
          </span>
        )}
      </div>

      {/* Main Verdict Card per DESIGN.md Section 5 */}
      <div
        className={`p-6 rounded-[24px] bg-[var(--surface)] border-t border-r border-b border-[var(--surface-border)] border-l-4 ${borderColor} shadow-[var(--surface-shadow)] flex flex-col gap-5 transition-colors duration-200`}
      >
        {/* Top: Verdict Name & Shield Icon */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">
              {isCustomerView ? "Merchant Status" : "Security State"}
            </span>
            <h2
              className={`text-2xl font-mono font-medium tracking-tight mt-0.5 ${textColor}`}
            >
              {verdictDisplayLabel}
            </h2>
            {lang !== "en-IN" && localizedLabels?.subtitle && (
              <p className="text-xs font-sans text-[var(--text-secondary)] mt-0.5">
                {localizedLabels.subtitle}
              </p>
            )}

            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${bgBadge}`}
              >
                REASON // {reason}
              </span>
              {result.auditRunId && (
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  ID: {result.auditRunId.slice(0, 8)}
                </span>
              )}
            </div>
          </div>
          <div
            className={`p-2.5 rounded-[14px] bg-[var(--box-mono-bg)] border border-[var(--box-mono-border)] ${textColor} animate-shield-resolve`}
          >
            <ShieldIcon className="w-7 h-7" weight="duotone" />
          </div>
        </div>

        {/* Plain Language Message */}
        <p className="text-xs text-[var(--text-primary)] leading-relaxed font-sans border-t border-[var(--surface-border)] pt-3">
          {message}
        </p>

        {/* 3-Row Evidence Breakdown (Identity, Vision, Context) per DESIGN.md Section 5 */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[var(--surface-border)]">
          <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)] tracking-wider">
            Multi-Agent Evidence Breakdown
          </span>

          {/* Row 1: Identity Agent */}
          <div className="p-3 rounded-[14px] bg-[var(--box-mono-bg)] border border-[var(--box-mono-border)] flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <span className="text-[var(--text-muted)] font-mono text-[11px] shrink-0 mt-0.5">
                01
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--text-primary)] leading-tight">
                  Identity Agent
                </p>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed mt-0.5 break-words">
                  {agentOutputs?.identity?.reason ||
                    agentOutputs?.identity?.message ||
                    "Payload matched registered credential"}
                </p>
              </div>
            </div>
            {identityStatus === "pass" ? (
              <span className="shrink-0 self-start mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-ok/10 text-ok border border-ok/30">
                <Check className="w-3 h-3" weight="bold" /> PASS
              </span>
            ) : (
              <span className="shrink-0 self-start mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-danger/10 text-[#FF6B81] border border-danger/30">
                <X className="w-3 h-3" weight="bold" /> FLAG
              </span>
            )}
          </div>

          {/* Row 2: Vision Agent */}
          <div className="p-3 rounded-[14px] bg-[var(--box-mono-bg)] border border-[var(--box-mono-border)] flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <span className="text-[var(--text-muted)] font-mono text-[11px] shrink-0 mt-0.5">
                02
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--text-primary)] leading-tight">
                  Vision Agent
                </p>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed mt-0.5 break-words">
                  {agentOutputs?.vision?.reason ||
                    agentOutputs?.vision?.message ||
                    "Visual embedding compared"}
                </p>
              </div>
            </div>
            {visionStatus === "pass" ? (
              <span className="shrink-0 self-start mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-ok/10 text-ok border border-ok/30">
                <Check className="w-3 h-3" weight="bold" /> PASS
              </span>
            ) : visionStatus === "warn" ? (
              <span className="shrink-0 self-start mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-warn/10 text-warn border border-warn/30">
                <Warning className="w-3 h-3" weight="bold" /> SOFT WARN
              </span>
            ) : (
              <span className="shrink-0 self-start mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted/10 text-muted border border-border">
                SKIPPED
              </span>
            )}
          </div>

          {/* Row 3: Context Agent */}
          <div className="p-3 rounded-[14px] bg-[var(--box-mono-bg)] border border-[var(--box-mono-border)] flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <span className="text-[var(--text-muted)] font-mono text-[11px] shrink-0 mt-0.5">
                03
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--text-primary)] leading-tight">
                  Context Agent
                </p>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed mt-0.5 break-words">
                  {agentOutputs?.context?.reason ||
                    agentOutputs?.context?.message ||
                    "GPS proximity verified"}
                </p>
              </div>
            </div>
            {contextStatus === "pass" ? (
              <span className="shrink-0 self-start mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-ok/10 text-ok border border-ok/30">
                <Check className="w-3 h-3" weight="bold" /> PASS
              </span>
            ) : contextStatus === "fail" ? (
              <span className="shrink-0 self-start mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-danger/10 text-[#FF6B81] border border-danger/30">
                <X className="w-3 h-3" weight="bold" /> RELOCATED
              </span>
            ) : (
              <span className="shrink-0 self-start mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-warn/10 text-warn border border-warn/30">
                NO GPS
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {onReset && (
        <div className="flex flex-col gap-2 mt-2">
          <button
            type="button"
            onClick={onReset}
            className="btn-red-glass h-12 w-full px-4 rounded-[16px] text-white font-semibold text-xs flex items-center justify-center gap-2"
          >
            <span>Scan Another QR Sticker</span>
          </button>
        </div>
      )}
    </div>
  );
}
