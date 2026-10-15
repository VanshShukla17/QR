"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Info, MapPin } from "@phosphor-icons/react";

import dynamic from "next/dynamic";
import { VoiceVerdictType, VoiceLanguageCode, formatVoiceScript } from "@qraksha/shared";
import { CameraCaptureSkeleton } from "../../components/camera-capture-skeleton";
import { VerdictCard } from "../../components/verdict-card";

const CameraCapture = dynamic(
  () => import("../../components/camera-capture").then((m) => m.CameraCapture),
  {
    ssr: false,
    loading: () => (
      <CameraCaptureSkeleton
        title="Scan Storefront QR"
        helperText="Point your camera at the merchant QR stand before payment."
      />
    ),
  }
);
import { VoiceOrb } from "../../components/voice-orb";
import {
  LanguageSelector,
  getInitialVoiceLanguage,
} from "../../components/language-selector";
import { runCustomerCheck, AuditResult, ApiError } from "../../lib/api";
import { VoicePlayer, VoiceState } from "../../lib/voice-player";

export default function CustomerCheckPage() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verdictResult, setVerdictResult] = useState<AuditResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Voice Assistant state
  const [voiceLang, setVoiceLang] = useState<VoiceLanguageCode>("en-IN");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [amplitude, setAmplitude] = useState<number>(0);
  const playerRef = useRef<VoicePlayer | null>(null);

  // Initialize language preference from localStorage / browser
  useEffect(() => {
    setVoiceLang(getInitialVoiceLanguage());
  }, []);

  // Initialize VoicePlayer instance
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

  // Geolocation state requested on mount per Requirement 5
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [locationStatus, setLocationStatus] = useState<
    "prompting" | "granted" | "denied" | "timeout" | "unavailable"
  >("prompting");
  const [locationError, setLocationError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationStatus("unavailable");
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setLocationStatus("prompting");
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLocationStatus("granted");
        setLocationError(null);
      },
      (err) => {
        if (err.code === 1) {
          setLocationStatus("denied");
          setLocationError(
            "Location permission denied. QRaksha needs your physical location to detect relocated or swapped stickers."
          );
        } else if (err.code === 3) {
          setLocationStatus("timeout");
          setLocationError(
            "Location request timed out. Please ensure GPS is enabled and retry."
          );
        } else {
          setLocationStatus("unavailable");
          setLocationError("Unable to acquire location coordinates. Please tap Retry.");
        }
      },
      {
        timeout: 10000,
        enableHighAccuracy: true,
      }
    );
  }, []);

  // Request location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Compute VoiceVerdictType from AuditResult
  const getVoiceVerdictKey = useCallback((result: AuditResult): VoiceVerdictType => {
    if (result.verdict === "VERIFIED") return "VERIFIED";
    if (result.verdict === "WARNING") return "WARNING";
    if (result.isUnregistered) return "UNVERIFIED";
    return "RECENTLY_REGISTERED";
  }, []);

  const handleCapture = useCallback(
    async (data: { photoBase64: string; qrPayload?: string }) => {
      if (!data.qrPayload) return;

      // Location is strictly required to verify physical QR location binding
      if (!coords) {
        setApiError(
          "Location needed: Please allow location access to verify this merchant sticker against its registered address."
        );
        return;
      }

      // Prime AudioContext from the user gesture
      playerRef.current?.primeAudioContext();

      setIsVerifying(true);
      setApiError(null);
      // Voice orb starts "thinking" the moment the check begins
      setVoiceState("thinking");

      try {
        const result = await runCustomerCheck({
          qrPayload: data.qrPayload,
          latitude: coords.latitude,
          longitude: coords.longitude,
          photoBase64: data.photoBase64,
        });

        setVerdictResult(result);

        // TRIGGER: Speak automatically right after verdict renders
        const verdictKey = getVoiceVerdictKey(result);
        playerRef.current?.playVerdict(verdictKey, voiceLang, result.merchantDisplayName);
      } catch (err) {
        const error = err as ApiError;
        setApiError(
          error.message ||
            "Failed to check merchant sticker. Please check your connection."
        );
        playerRef.current?.stop();
        setVoiceState("idle");
      } finally {
        setIsVerifying(false);
      }
    },
    [coords, getVoiceVerdictKey, voiceLang]
  );

  const resetCheck = useCallback(() => {
    playerRef.current?.stop();
    setVerdictResult(null);
    setApiError(null);
    setVoiceState("idle");
    setAmplitude(0);
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (!verdictResult) return;

    if (voiceState === "speaking") {
      playerRef.current?.stop();
    } else {
      const verdictKey = getVoiceVerdictKey(verdictResult);
      playerRef.current?.playVerdict(
        verdictKey,
        voiceLang,
        verdictResult.merchantDisplayName
      );
    }
  }, [verdictResult, voiceState, getVoiceVerdictKey, voiceLang]);

  // Re-trigger voice if language changes while viewing a verdict
  const handleLanguageChange = useCallback(
    (newLang: VoiceLanguageCode) => {
      setVoiceLang(newLang);
      if (verdictResult) {
        const verdictKey = getVoiceVerdictKey(verdictResult);
        playerRef.current?.playVerdict(
          verdictKey,
          newLang,
          verdictResult.merchantDisplayName
        );
      }
    },
    [verdictResult, getVoiceVerdictKey]
  );

  const voiceVerdict = verdictResult ? getVoiceVerdictKey(verdictResult) : "UNVERIFIED";
  const spokenAriaText = verdictResult
    ? formatVoiceScript(voiceVerdict, voiceLang, verdictResult.merchantDisplayName)
    : "";

  return (
    <main className="flex-1 flex flex-col p-5 sm:p-6 max-w-[440px] mx-auto w-full pb-[calc(8rem+env(safe-area-inset-bottom,0px))]">
      {/* Header */}
      <header className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to Home"
            title="Back to Home"
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-[14px] bg-[var(--header-btn-bg)] border border-[var(--header-btn-border)] shadow-[var(--header-btn-shadow)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--header-btn-border-hover)] flex items-center justify-center transition-all select-none"
          >
            <ArrowLeft className="w-5 h-5" weight="bold" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Customer Pre-Pay Check
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Verify any physical UPI sticker
            </p>
          </div>
        </div>
        <span className="chip-neutral-pill text-[11px]">NO LOGIN REQ</span>
      </header>

      {/* Language Selector Header Bar */}
      <div className="card-glass px-4 py-2.5 rounded-[16px] flex items-center justify-between mb-4">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-medium">
          Voice Assistant
        </span>
        <LanguageSelector currentLang={voiceLang} onSelectLang={handleLanguageChange} />
      </div>

      {/* Explanatory Banner */}
      {!verdictResult && !isVerifying && (
        <div className="card-glass mb-4 p-4 rounded-[20px] flex items-start gap-3 text-xs text-[var(--text-secondary)] leading-relaxed">
          <Info className="w-4 h-4 text-[#E0262F] shrink-0 mt-0.5" weight="duotone" />
          <p>
            Point your camera at the merchant's physical UPI sticker before paying.
            QRaksha speaks who you are paying and whether the sticker is verified before
            you leave for your UPI app.
          </p>
        </div>
      )}

      {/* Explicit Location Needed State per Requirement 5 */}
      {!verdictResult && !isVerifying && locationStatus !== "granted" && (
        <div className="card-glass mb-4 p-4 rounded-[20px] border border-amber-500/40 bg-amber-500/10 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" weight="duotone" />
            <div className="flex-1">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                Location Needed for Sticker Verification
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                {locationError ||
                  "QRaksha verifies that this physical QR sticker is at the merchant's genuine registered storefront and has not been relocated or swapped."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestLocation}
            className="self-end px-4 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs cursor-pointer transition-colors"
          >
            Retry Location Access
          </button>
        </div>
      )}

      {/* API Error alert */}
      {apiError && (
        <div className="mb-4 p-4 rounded-[16px] bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-[#E0262F] text-xs flex flex-col gap-2">
          <p className="font-medium text-[var(--text-primary)]">{apiError}</p>
          <button
            type="button"
            onClick={resetCheck}
            className="self-end px-3 py-1 rounded-full bg-[#E0262F] text-white font-medium text-xs cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading state with active Thinking Orb */}
      {isVerifying && (
        <div className="card-glass flex-1 flex flex-col items-center justify-center p-8 text-center gap-5 rounded-[24px]">
          <VoiceOrb
            voiceState="thinking"
            verdict="RECENTLY_REGISTERED"
            lang={voiceLang}
            onTogglePlay={() => {}}
            size={72}
          />
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Checking Merchant Registry
            </h2>
            <p className="text-xs font-mono text-[#E0262F] mt-1 font-medium">
              Cross-referencing QR & location…
            </p>
          </div>
          <p className="text-xs text-[var(--text-secondary)] max-w-[260px] leading-relaxed">
            Querying public tamper-evident registry and preparing multilingual voice
            guidance.
          </p>
        </div>
      )}

      {/* Verdict Takeover with prominent Voice Thinking Orb */}
      {!isVerifying && verdictResult && (
        <div className="flex flex-col gap-4">
          {/* Accessible Live Region */}
          <div aria-live="assertive" className="sr-only">
            {spokenAriaText}
          </div>

          <VerdictCard
            result={verdictResult}
            onReset={resetCheck}
            title="Public Verification Result"
            isCustomerView={true}
            lang={voiceLang}
          />

          {/* Prominent Thinking Orb Voice Button Section */}
          <div className="card-glass p-5 rounded-[24px] flex flex-col items-center justify-center gap-3 text-center">
            <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)] tracking-wider font-medium">
              Multilingual Audio Verdict
            </span>
            <VoiceOrb
              voiceState={voiceState}
              verdict={voiceVerdict}
              lang={voiceLang}
              amplitude={amplitude}
              onTogglePlay={handleTogglePlay}
              size={68}
            />
            {verdictResult.merchantDisplayName && voiceVerdict === "VERIFIED" && (
              <p className="text-xs text-[var(--text-primary)] font-semibold">
                Verified Merchant: {verdictResult.merchantDisplayName}
              </p>
            )}
          </div>

          {/* Pay Button Pointer */}
          <div className="card-glass p-4 rounded-[16px] flex flex-col gap-2 text-center">
            <span className="text-xs text-[var(--text-secondary)]">
              Proceed to pay using your preferred UPI app
            </span>
            <div className="flex justify-center gap-2 font-mono text-[11px] text-[#E0262F] font-medium">
              <span>Google Pay</span>
              <span>•</span>
              <span>PhonePe</span>
              <span>•</span>
              <span>Paytm</span>
              <span>•</span>
              <span>BHIM</span>
            </div>
          </div>
        </div>
      )}

      {/* Camera Capture Viewfinder */}
      {!isVerifying && !verdictResult && (
        <CameraCapture
          title="Scan Merchant QR"
          helperText="Align the merchant's physical UPI sticker inside the frame to verify."
          onCapture={handleCapture}
        />
      )}
    </main>
  );
}
