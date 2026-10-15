"use client";

import { use, useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowSquareOut,
  Warning,
  SpinnerGap,
  CheckCircle,
  Clock,
  XCircle,
  Copy,
  Check,
  MapPin,
  QrCode,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import {
  VerifyCredentialResult,
  VoiceLanguageCode,
  VoiceVerdictType,
  formatVoiceScript,
} from "@qraksha/shared";
import { getCredentialVerification, ApiError } from "@/lib/api";
import { VoiceOrb } from "@/components/voice-orb";
import {
  LanguageSelector,
  getInitialVoiceLanguage,
} from "@/components/language-selector";
import { VoicePlayer, VoiceState } from "@/lib/voice-player";

interface Props {
  params: Promise<{ credentialId: string }>;
}

export default function VerifyCredentialPage({ params }: Props) {
  const unwrappedParams = use(params);
  const credentialId = unwrappedParams.credentialId;

  const [data, setData] = useState<VerifyCredentialResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Voice state
  const [voiceLang, setVoiceLang] = useState<VoiceLanguageCode>("en-IN");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [amplitude, setAmplitude] = useState<number>(0);
  const playerRef = useRef<VoicePlayer | null>(null);

  useEffect(() => {
    setVoiceLang(getInitialVoiceLanguage());
  }, []);

  useEffect(() => {
    const player = new VoicePlayer({
      onStateChange: (state) => setVoiceState(state),
      onAmplitudeChange: (amp) => setAmplitude(amp),
      onError: () => setVoiceState("error"),
    });
    playerRef.current = player;
    return () => {
      player.stop();
    };
  }, []);

  const getVoiceVerdict = (item: VerifyCredentialResult): VoiceVerdictType => {
    if (item.status === "suspended") return "WARNING";
    if (item.verifiedOnChain) return "VERIFIED";
    return "RECENTLY_REGISTERED";
  };

  const fetchVerification = async () => {
    setIsLoading(true);
    setError(null);
    setVoiceState("thinking");
    try {
      const result = await getCredentialVerification(credentialId);
      setData(result);

      // Trigger automatic audio playback right after credential verdict renders
      const verdictKey = getVoiceVerdict(result);
      playerRef.current?.playVerdict(verdictKey, voiceLang, result.displayName);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to load credential verification details. Please try again.");
      }
      playerRef.current?.stop();
      setVoiceState("idle");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVerification();
  }, [credentialId]);

  const handleTogglePlay = () => {
    if (!data) return;
    if (voiceState === "speaking") {
      playerRef.current?.stop();
    } else {
      const verdictKey = getVoiceVerdict(data);
      playerRef.current?.playVerdict(verdictKey, voiceLang, data.displayName);
    }
  };

  const handleLanguageChange = (newLang: VoiceLanguageCode) => {
    setVoiceLang(newLang);
    if (data) {
      const verdictKey = getVoiceVerdict(data);
      playerRef.current?.playVerdict(verdictKey, newLang, data.displayName);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const voiceVerdict = data ? getVoiceVerdict(data) : "UNVERIFIED";
  const spokenAriaText = data
    ? formatVoiceScript(voiceVerdict, voiceLang, data.displayName)
    : "";

  return (
    <main className="flex-1 flex flex-col p-5 sm:p-6 max-w-[440px] mx-auto w-full pb-28">
      {/* Top Header */}
      <header className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-10 h-10 rounded-[14px] bg-[var(--header-btn-bg)] border border-[var(--header-btn-border)] shadow-[var(--header-btn-shadow)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" weight="bold" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Public Audit</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              On-chain tamper-evident proof
            </p>
          </div>
        </div>
        <LanguageSelector currentLang={voiceLang} onSelectLang={handleLanguageChange} />
      </header>

      {/* Accessible Live Region */}
      {data && (
        <div aria-live="assertive" className="sr-only">
          {spokenAriaText}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="card-glass p-8 flex flex-col items-center justify-center gap-3 text-center my-6 rounded-[24px]">
          <SpinnerGap className="w-6 h-6 animate-spin text-[#E0262F]" weight="bold" />
          <span className="text-xs font-mono text-[var(--text-secondary)]">
            Retrieving on-chain verification proof…
          </span>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div
          role="alert"
          className="p-5 rounded-[20px] bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-[var(--text-primary)] flex flex-col gap-3 my-4"
        >
          <div className="flex items-start gap-3">
            <Warning
              className="w-5 h-5 text-[#E0262F] shrink-0 mt-0.5"
              weight="duotone"
            />
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Verification Lookup Failed
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                {error}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchVerification}
            className="btn-pill-secondary self-start h-8 px-3.5 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowsClockwise className="w-3.5 h-3.5" weight="bold" />
            <span>Retry Lookup</span>
          </button>
        </div>
      )}

      {/* Verification Details */}
      {!isLoading && data && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-300">
          {/* Prominent Thinking Orb Voice Section */}
          <div className="card-glass p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col text-center sm:text-left">
              <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)] tracking-wider font-medium">
                Audible Security Verdict
              </span>
              <span className="text-base font-semibold text-[var(--text-primary)] mt-0.5">
                {data.displayName}
              </span>
              <span className="text-xs text-[var(--text-secondary)] mt-0.5">
                Tap the orb to hear merchant verification in your chosen language
              </span>
            </div>
            <VoiceOrb
              voiceState={voiceState}
              verdict={voiceVerdict}
              lang={voiceLang}
              amplitude={amplitude}
              onTogglePlay={handleTogglePlay}
              size={64}
            />
          </div>

          {/* Status Banner Card */}
          <div
            className={`card-glass p-5 border-l-4 flex flex-col gap-3 ${
              data.verifiedOnChain
                ? "border-l-ok"
                : data.anchor?.status === "pending"
                  ? "border-l-warn"
                  : "border-l-danger"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {data.verifiedOnChain ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-[#1E7A3C]" weight="fill" />
                    <span className="font-mono text-xs uppercase tracking-wider text-[#1E7A3C] font-semibold">
                      Tamper-Evident On-Chain Proof
                    </span>
                  </>
                ) : data.anchor?.status === "pending" ? (
                  <>
                    <Clock className="w-4 h-4 text-amber-600" weight="fill" />
                    <span className="font-mono text-xs uppercase tracking-wider text-amber-600 font-semibold">
                      Anchoring In Progress
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-[#E0262F]" weight="fill" />
                    <span className="font-mono text-xs uppercase tracking-wider text-[#E0262F] font-semibold">
                      Anchor Verification Incomplete
                    </span>
                  </>
                )}
              </div>
              <span
                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                  data.verifiedOnChain
                    ? "bg-[#E6F4EA] text-[#1E7A3C] border-[#1E7A3C]/30"
                    : data.anchor?.status === "pending"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-red-50 text-[#E0262F] border-red-200"
                }`}
              >
                STATUS: {data.status.toUpperCase()}
              </span>
            </div>

            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {data.displayName}
              </h2>
              <p className="text-xs font-mono text-[var(--text-secondary)] mt-0.5">
                ID: {data.credentialId}
              </p>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {data.verifiedOnChain
                ? "This credential has been anchored to the public testnet. The canonical Keccak-256 hash computed from current registry metadata matches the transaction input data exactly."
                : data.anchor?.status === "pending"
                  ? "A blockchain anchor transaction has been queued and is awaiting block confirmation on Polygon Amoy."
                  : "On-chain verification has not been confirmed for this credential record."}
            </p>
          </div>

          {/* Cryptographic Proof Details */}
          <div className="card-glass p-5 flex flex-col gap-4 font-mono text-xs">
            <span className="text-[11px] uppercase tracking-wider text-[#E0262F] font-semibold">
              Cryptographic Anchor Details
            </span>

            {/* Canonical Hash Box */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                <span>CANONICAL CREDENTIAL HASH (KECCAK-256)</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(data.canonicalCredentialHash)}
                  className="flex items-center gap-1 hover:text-[var(--text-primary)] text-[#E0262F] transition-colors font-medium cursor-pointer"
                >
                  {copiedHash ? (
                    <>
                      <Check className="w-3 h-3 text-[#1E7A3C]" weight="bold" />
                      <span className="text-[#1E7A3C]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" weight="bold" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="mono-box-container p-3 text-[var(--box-mono-text)] break-all select-all font-mono text-[11px]">
                {data.canonicalCredentialHash}
              </div>
            </div>

            {/* Anchor Transaction Details Grid */}
            <div className="pt-2 border-t border-[var(--surface-border)] grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[var(--text-muted)] block text-[10px]">
                  NETWORK
                </span>
                <span className="text-[var(--text-primary)] font-medium">
                  {data.anchor?.network
                    ? `Polygon ${data.anchor.network.toUpperCase()}`
                    : "Polygon Amoy"}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[10px]">
                  ANCHOR STATUS
                </span>
                <span
                  className={
                    data.anchor?.status === "confirmed"
                      ? "text-[#1E7A3C] font-semibold"
                      : data.anchor?.status === "pending"
                        ? "text-amber-600 font-semibold"
                        : "text-[var(--text-secondary)]"
                  }
                >
                  {data.anchor?.status?.toUpperCase() || "PENDING"}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[10px]">
                  TRANSACTION HASH
                </span>
                <span className="text-[var(--text-primary)] truncate block font-mono">
                  {data.anchor?.txHash
                    ? `${data.anchor.txHash.slice(0, 10)}…${data.anchor.txHash.slice(-8)}`
                    : "Awaiting submission"}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[10px]">
                  CONFIRMED AT
                </span>
                <span className="text-[var(--text-primary)]">
                  {data.anchor?.confirmedAt
                    ? new Date(data.anchor.confirmedAt).toLocaleTimeString()
                    : "—"}
                </span>
              </div>
            </div>

            {/* Block Explorer Link */}
            {data.anchor?.explorerUrl && (
              <a
                href={data.anchor.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-red-glass h-11 px-4 text-xs font-medium flex items-center justify-center gap-2 mt-2"
              >
                <span>Inspect on Amoy PolygonScan</span>
                <ArrowSquareOut className="w-4 h-4" weight="bold" />
              </a>
            )}
          </div>

          {/* Bound Location Details */}
          {data.boundLocation && (
            <div className="card-glass p-4 rounded-[16px] flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <MapPin className="w-4 h-4 text-[#E0262F] shrink-0" weight="duotone" />
                <span>
                  Lat: {data.boundLocation.latitude.toFixed(4)}, Lng:{" "}
                  {data.boundLocation.longitude.toFixed(4)}
                </span>
              </div>
              <span className="chip-success-pill text-[10px]">
                Bound (±{data.boundLocation.boundRadiusM}m)
              </span>
            </div>
          )}

          {/* Navigation Action Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <Link
              href="/check"
              className="btn-pill-secondary h-11 px-4 text-xs font-medium flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4 text-[#E0262F]" weight="duotone" />
              <span>Verify a UPI QR Sticker</span>
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
