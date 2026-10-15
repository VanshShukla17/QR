"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  QrCode,
  CheckCircle,
  WarningCircle,
  X,
  MapPin,
} from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { CameraCaptureSkeleton } from "../../../components/camera-capture-skeleton";
import {
  addQrToCredential,
  getRegisteredQrs,
  getMyCredentials,
  ApiError,
} from "../../../lib/api";
import { getActiveCredentialId } from "../../../lib/constants";

const CameraCapture = dynamic(
  () => import("../../../components/camera-capture").then((m) => m.CameraCapture),
  {
    ssr: false,
    loading: () => (
      <CameraCaptureSkeleton
        title="Capture Additional Storefront QR"
        helperText="Align the new QR sticker on your counter to register its visual baseline."
      />
    ),
  }
);

interface RegisteredQrItem {
  id: string;
  qr_payload_hash: string;
  bound_lat: number;
  bound_lng: number;
  bound_radius_m: number;
  created_at: string;
  label?: string;
}

export default function CredentialQrsPage() {
  const [credentialId, setCredentialId] = useState(getActiveCredentialId()); // Canonical demo credential default
  const [qrs, setQrs] = useState<RegisteredQrItem[]>([
    {
      id: "qr-primary",
      qr_payload_hash: "8f3c7a2b9e1d4c5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f",
      bound_lat: 12.9716,
      bound_lng: 77.5946,
      bound_radius_m: 100,
      created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
      label: "Counter 1 (Main Billing Counter)",
    },
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: 12.9716,
    longitude: 77.5946,
  });
  const [capturedData, setCapturedData] = useState<{
    photoBase64: string;
    qrPayload?: string;
  } | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Load existing QRs from API
  const loadQrs = useCallback(
    async (targetId?: string) => {
      const activeId = targetId || credentialId;
      try {
        const items = await getRegisteredQrs(activeId);
        if (items && items.length > 0) {
          setQrs(
            items.map((q, idx) => ({
              ...q,
              label:
                idx === 0
                  ? "Counter 1 (Main Billing Counter)"
                  : `Counter ${idx + 1} Sticker`,
            }))
          );
        }
      } catch {
        // Retain demo list if API unreachable
      }
    },
    [credentialId]
  );

  useEffect(() => {
    async function init() {
      let resolvedId = getActiveCredentialId();
      if (typeof window !== "undefined") {
        const queryParam = new URLSearchParams(window.location.search).get(
          "credentialId"
        );
        if (queryParam) {
          resolvedId = queryParam;
        } else {
          try {
            const meRes = await getMyCredentials();
            if (meRes?.activeCredential?.id) {
              resolvedId = meRes.activeCredential.id;
            }
          } catch {
            // Keep default
          }
        }
      }
      setCredentialId(resolvedId);
      loadQrs(resolvedId);
    }
    init();

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {},
        { timeout: 5000 }
      );
    }
  }, [loadQrs]);

  const handleCapture = useCallback(
    (data: { photoBase64: string; qrPayload?: string }) => {
      setCapturedData(data);
    },
    []
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedData || !capturedData.qrPayload) {
      setFeedback({
        type: "error",
        message: "Please photograph and decode the QR sticker first.",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await addQrToCredential(credentialId, {
        qrPayload: capturedData.qrPayload,
        latitude: coords.latitude,
        longitude: coords.longitude,
        boundRadiusM: 100,
        photoBase64: capturedData.photoBase64,
      });

      const newQrItem: RegisteredQrItem = {
        id: res.id,
        qr_payload_hash: res.qrPayloadHash,
        bound_lat: res.boundLocation.latitude,
        bound_lng: res.boundLocation.longitude,
        bound_radius_m: res.boundLocation.boundRadiusM,
        created_at: new Date().toISOString(),
        label: labelInput.trim() || `Counter ${qrs.length + 1} Sticker`,
      };

      setQrs((prev) => [...prev, newQrItem]);
      setIsAdding(false);
      setCapturedData(null);
      setLabelInput("");
      setFeedback({
        type: "success",
        message: res.inheritedRamp
          ? "Additional QR registered successfully! Inherited abbreviated trust ramp (starts at 2 clean audits)."
          : "Additional QR registered successfully! Anchored to blockchain.",
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("qraksha-stats-invalidate"));
      }
    } catch (err) {
      const error = err as ApiError;
      setFeedback({
        type: "error",
        message: error.message || "Failed to register additional QR. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col p-5 sm:p-6 max-w-[440px] mx-auto w-full pb-28">
      {/* Header */}
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
              Registered QR Stickers
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Multi-QR management per credential
            </p>
          </div>
        </div>

        <span className="chip-neutral-pill text-[11px]">{qrs.length} REGISTERED</span>
      </header>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`mb-4 p-4 rounded-[16px] border text-xs flex items-start gap-2.5 ${
            feedback.type === "success"
              ? "bg-[#E6F4EA] dark:bg-[#132B1A] border-[#1E7A3C]/30 text-[#1E7A3C] dark:text-[#4ADE80]"
              : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-[#E0262F] dark:text-[#FF6B5E]"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" weight="duotone" />
          ) : (
            <WarningCircle className="w-4 h-4 shrink-0 mt-0.5" weight="duotone" />
          )}
          <div className="flex-1">
            <p className="font-medium">{feedback.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss feedback"
            className="p-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="w-3.5 h-3.5" weight="bold" />
          </button>
        </div>
      )}

      {/* List of Registered QRs */}
      {!isAdding && (
        <div className="flex flex-col gap-3 mb-6">
          {qrs.map((qr) => (
            <div
              key={qr.id}
              className="card-glass p-4 rounded-[20px] flex items-start justify-between"
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-[14px] bg-[var(--box-mono-bg)] border border-[var(--box-mono-border)] text-[#E0262F] flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5" weight="duotone" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    {qr.label}
                  </h2>
                  <p className="text-[11px] font-mono text-[var(--text-secondary)] mt-0.5">
                    HASH // {qr.qr_payload_hash.slice(0, 10)}…
                    {qr.qr_payload_hash.slice(-8)}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-secondary)] mt-1.5">
                    <MapPin
                      className="w-3 h-3 text-[#1E7A3C] dark:text-[#4ADE80]"
                      weight="duotone"
                    />
                    <span>
                      {qr.bound_lat.toFixed(3)}, {qr.bound_lng.toFixed(3)} (
                      {qr.bound_radius_m}m)
                    </span>
                  </div>
                </div>
              </div>

              <span className="chip-success-pill text-[10px]">ACTIVE</span>
            </div>
          ))}

          {/* Add New QR Action Button */}
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="h-12 px-4 rounded-[16px] border border-dashed border-[#E0262F]/50 text-[#E0262F] font-medium text-xs flex items-center justify-center gap-2 hover:bg-[#E0262F]/5 transition-colors mt-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" weight="bold" />
            <span>Register Additional QR Sticker</span>
          </button>
        </div>
      )}

      {/* Add New QR Modal / Step Flow */}
      {isAdding && (
        <div className="card-glass flex flex-col gap-4 p-5 rounded-[24px]">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              New QR Sticker Registration
            </h2>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setCapturedData(null);
              }}
              aria-label="Close dialog"
              className="p-1.5 rounded-[12px] bg-[var(--box-mono-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="w-4 h-4" weight="bold" />
            </button>
          </div>

          <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="labelInput"
                className="block text-[11px] font-mono text-[var(--text-secondary)] uppercase mb-1 font-medium"
              >
                Sticker Counter Label
              </label>
              <input
                id="labelInput"
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="e.g. Counter 2 (Takeaway Window)"
                className="w-full h-10 px-3.5 rounded-[14px] bg-[var(--box-mono-bg)] border border-[var(--box-mono-border)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#E0262F]"
              />
            </div>

            {/* Camera viewfinder capture component */}
            <CameraCapture
              title="Photograph Additional Sticker"
              helperText="Position new sticker in frame. Embedding extracted synchronously and raw photo discarded."
              defaultPayload="upi://pay?pa=sharma.counter2@upi&pn=SharmaCanteen&cu=INR"
              onCapture={handleCapture}
            />

            <div className="flex gap-2.5 pt-2 border-t border-[var(--surface-border)]">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setCapturedData(null);
                }}
                className="btn-pill-secondary flex-1 h-11 px-4 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!capturedData || isSubmitting}
                className="btn-red-glass flex-1 h-11 px-4 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? "Registering…" : "Bind & Register QR"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
