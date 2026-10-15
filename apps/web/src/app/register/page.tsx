"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Buildings,
  DeviceMobile,
  ShieldCheck,
  Warning,
  CheckCircle,
  SpinnerGap,
  ArrowsClockwise,
  Info,
  ArrowSquareOut,
  MapPin,
  MapPinLine,
  Coins,
  Terminal,
  CaretDown,
  CaretUp,
  Clock,
  XCircle,
} from "@phosphor-icons/react";

import {
  RegisterIdentityInput,
  RegisterIdentityResult,
  RegisterReferenceResult,
  ProofOfPossessionResult,
} from "@qraksha/shared";
import dynamic from "next/dynamic";
import {
  registerIdentity,
  registerReference,
  confirmProofOfPossession,
  ApiError,
} from "@/lib/api";
import { CameraCaptureSkeleton } from "@/components/camera-capture-skeleton";

const CameraCapture = dynamic(
  () => import("@/components/camera-capture").then((m) => m.CameraCapture),
  {
    ssr: false,
    loading: () => (
      <CameraCaptureSkeleton
        title="Capture Reference Photo"
        helperText="Take a baseline photo of your physical QR sticker in standard store lighting."
      />
    ),
  }
);

type PathType = "gst_udyam" | "penny_drop";
type Step1SubStep = "form" | "otp" | "penny_drop_confirm";

export default function RegisterWizardPage() {
  // Wizard master step (1: Identity, 2: Reference & Location, 3: Proof-of-Possession)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // --- STEP 1: IDENTITY REGISTRATION STATE ---
  const [selectedPath, setSelectedPath] = useState<PathType>("gst_udyam");
  const [step1SubStep, setStep1SubStep] = useState<Step1SubStep>("form");
  const [displayName, setDisplayName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [kycAddress, setKycAddress] = useState("");
  const [gstUdyamNumber, setGstUdyamNumber] = useState("");
  const [bankVpa, setBankVpa] = useState("");
  const [otp, setOtp] = useState("123456");

  // Step 1 Output
  const [identityResult, setIdentityResult] = useState<RegisterIdentityResult | null>(
    null
  );

  // --- STEP 2: REFERENCE CAPTURE & LOCATION STATE ---
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [qrPayload, setQrPayload] = useState<string>(
    "upi://pay?pa=merchant@upi&pn=Store&cu=INR"
  );
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(
    null
  );
  const [boundRadiusM] = useState(100);

  // Step 2 Output
  const [referenceResult, setReferenceResult] = useState<RegisterReferenceResult | null>(
    null
  );

  // Step 3 Output & Simulation State
  const [possessionResult, setPossessionResult] =
    useState<ProofOfPossessionResult | null>(null);
  const [simulationPassed, setSimulationPassed] = useState<boolean>(true);
  const [isDevPanelOpen, setIsDevPanelOpen] = useState<boolean>(false);

  // Shared UI States
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<{
    code?: string;
    message: string;
    disputePointer?: string;
  } | null>(null);

  // --- GEOLOCATION HANDLER ---
  const requestLocation = useCallback(() => {
    setLocationError(null);
    setIsLocating(true);

    if (!navigator.geolocation) {
      setHasLocationPermission(false);
      setLocationError("Geolocation is not supported by your browser.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          accuracy: Math.round(position.coords.accuracy),
        });
        setHasLocationPermission(true);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        setHasLocationPermission(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(
            "Location access was denied. QRaksha requires GPS coordinates to bind your physical QR sticker and detect relocation fraud."
          );
        } else {
          setLocationError(
            error.message || "Failed to acquire GPS location. Please retry."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  // Request location when entering Step 2
  useEffect(() => {
    if (currentStep === 2 && !gpsLocation) {
      requestLocation();
    }
  }, [currentStep, gpsLocation, requestLocation]);

  // --- STEP 1 ACTIONS ---
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};

    if (!displayName.trim() || displayName.trim().length < 2) {
      errors.displayName = "Business name must be at least 2 characters";
    }

    const cleanPhone = contactPhone.trim().replace(/[\s-]/g, "");
    if (!/^\+?[1-9]\d{9,14}$/.test(cleanPhone)) {
      errors.contactPhone =
        "Enter a valid phone number (e.g. +919876543210 or 9876543210)";
    }

    if (!kycAddress.trim() || kycAddress.trim().length < 5) {
      errors.kycAddress = "Address must be at least 5 characters";
    }

    if (selectedPath === "gst_udyam") {
      if (!gstUdyamNumber.trim() || gstUdyamNumber.trim().length < 5) {
        errors.gstUdyamNumber = "GSTIN / Udyam number must be at least 5 characters";
      }
    } else {
      if (!bankVpa.trim() || bankVpa.trim().length < 3 || !bankVpa.includes("@")) {
        errors.bankVpa = "Enter a valid UPI VPA ID (e.g. merchant@upi)";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStep1Proceed = (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validateStep1()) {
      return;
    }

    if (selectedPath === "gst_udyam") {
      setStep1SubStep("otp");
    } else {
      setStep1SubStep("penny_drop_confirm");
    }
  };

  const handleSubmitStep1 = async () => {
    setApiError(null);
    setIsLoading(true);
    setLoadingMessage("Verifying identity with QRaksha…");

    const cleanPhone = contactPhone.trim().replace(/[\s-]/g, "");
    const formattedPhone = cleanPhone.startsWith("+") ? cleanPhone : `+91${cleanPhone}`;

    let payload: RegisterIdentityInput;

    if (selectedPath === "gst_udyam") {
      if (!otp || otp.length !== 6) {
        setFieldErrors({ otp: "OTP must be exactly 6 digits" });
        setIsLoading(false);
        return;
      }

      payload = {
        type: "gst_udyam",
        displayName: displayName.trim(),
        contactPhone: formattedPhone,
        gstUdyamNumber: gstUdyamNumber.trim().toUpperCase(),
        kycAddress: kycAddress.trim(),
        otp: otp.trim(),
      };
    } else {
      payload = {
        type: "penny_drop",
        displayName: displayName.trim(),
        contactPhone: formattedPhone,
        bankVpa: bankVpa.trim().toLowerCase(),
        kycAddress: kycAddress.trim(),
      };
    }

    try {
      const result = await registerIdentity(payload);
      setIdentityResult(result);
      // Advance to Step 2
      setCurrentStep(2);
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.details as { disputePointer?: string } | undefined;
        setApiError({
          code: err.code,
          message: err.message,
          disputePointer: details?.disputePointer,
        });
      } else {
        setApiError({
          code: "UNKNOWN_ERROR",
          message: "An unexpected error occurred. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- STEP 2 ACTIONS ---
  const handleRegisterCapture = useCallback(
    ({
      photoBase64,
      qrPayload: detectedPayload,
    }: {
      photoBase64: string;
      qrPayload?: string;
    }) => {
      setCapturedPhoto(photoBase64);
      if (detectedPayload) setQrPayload(detectedPayload);
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.photo;
        return next;
      });
    },
    []
  );

  const handleSubmitStep2 = async () => {
    if (!identityResult?.merchantId) {
      setApiError({
        message: "No merchant identity found. Please restart from Step 1.",
      });
      return;
    }

    if (!capturedPhoto) {
      setFieldErrors({ photo: "Please capture or upload a reference photo first" });
      return;
    }

    if (!gpsLocation) {
      setFieldErrors({
        location: "GPS coordinates are required to bind sticker location",
      });
      return;
    }

    setApiError(null);
    setIsLoading(true);
    setLoadingMessage("Extracting vision embedding & binding location…");

    try {
      const result = await registerReference({
        merchantId: identityResult.merchantId,
        qrPayload: qrPayload.trim(),
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        boundRadiusM,
        photoBase64: capturedPhoto,
      });

      setReferenceResult(result);
      // Advance to Step 3: Proof-of-Possession
      setCurrentStep(3);
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.details as { disputePointer?: string } | undefined;
        setApiError({
          code: err.code,
          message: err.message,
          disputePointer: details?.disputePointer,
        });
      } else {
        setApiError({
          code: "UNKNOWN_ERROR",
          message: "Failed to register reference photo. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- STEP 3 ACTIONS ---
  const handleConfirmProofOfPossession = async () => {
    if (!referenceResult?.credentialId) {
      setApiError({
        message: "No credential found to activate. Please complete Step 2 first.",
      });
      return;
    }

    setApiError(null);
    setIsLoading(true);
    setLoadingMessage("Verifying proof-of-possession micro-transaction…");

    try {
      const result = await confirmProofOfPossession({
        credentialId: referenceResult.credentialId,
        simulationPassed,
      });

      setPossessionResult(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError({
          code: err.code,
          message: err.message,
        });
      } else {
        setApiError({
          code: "UNKNOWN_ERROR",
          message: "Failed to confirm proof-of-possession. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setStep1SubStep("form");
    setIdentityResult(null);
    setReferenceResult(null);
    setPossessionResult(null);
    setCapturedPhoto(null);
    setGpsLocation(null);
    setApiError(null);
    setFieldErrors({});
  };

  return (
    <main className="flex-1 flex flex-col p-6 max-w-[480px] mx-auto w-full">
      {/* Top Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="p-2 rounded-[4px] bg-ink-2 border border-border hover:border-brand transition-colors text-text"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-4 h-4 text-text" />
        </Link>
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-brand">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              {currentStep === 1 && "STEP 01 // MERCHANT IDENTITY"}
              {currentStep === 2 && "STEP 02 // REFERENCE CAPTURE"}
              {currentStep === 3 && "STEP 03 // PROOF-OF-POSSESSION"}
            </span>
          </div>
          <h1 className="text-lg font-medium text-text">
            {currentStep === 1 && "Register Credential"}
            {currentStep === 2 && "Reference Photo & Location"}
            {currentStep === 3 && "Activate Credential"}
          </h1>
        </div>
      </div>

      {/* Wizard Step Progress Tracker */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        <div className="flex flex-col gap-1">
          <div
            className={`h-1 rounded-[2px] transition-colors ${
              currentStep > 1 ? "bg-ok" : "bg-brand"
            }`}
          />
          <span
            className={`text-[10px] font-mono uppercase ${
              currentStep > 1 ? "text-ok" : "text-brand"
            }`}
          >
            01 Identity
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <div
            className={`h-1 rounded-[2px] transition-colors ${
              currentStep > 2
                ? "bg-ok"
                : currentStep === 2
                  ? "bg-brand"
                  : "bg-ink-2 border border-border"
            }`}
          />
          <span
            className={`text-[10px] font-mono uppercase ${
              currentStep === 2
                ? "text-brand"
                : currentStep > 2
                  ? "text-ok"
                  : "text-muted"
            }`}
          >
            02 Reference
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <div
            className={`h-1 rounded-[2px] transition-colors ${
              possessionResult?.status === "recently_registered"
                ? "bg-ok"
                : currentStep === 3
                  ? "bg-brand"
                  : "bg-ink-2 border border-border"
            }`}
          />
          <span
            className={`text-[10px] font-mono uppercase ${
              possessionResult?.status === "recently_registered"
                ? "text-ok"
                : currentStep === 3
                  ? "text-brand"
                  : "text-muted"
            }`}
          >
            03 Possession
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="h-1 rounded-[2px] bg-ink-2 border border-border" />
          <span className="text-[10px] font-mono uppercase text-muted">04 Testnet</span>
        </div>
      </div>

      {/* Global Error Alert Banner */}
      {apiError && (
        <div
          role="alert"
          className="p-4 rounded-[4px] mb-6 border bg-danger/10 border-danger text-text animate-in fade-in"
        >
          <div className="flex items-start gap-3">
            <Warning className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="text-sm font-medium text-text mb-1">
                {apiError.code === "CONFLICT" ? "Registration Conflict" : "Action Failed"}
              </h2>
              <p className="text-xs text-muted leading-relaxed">{apiError.message}</p>

              {apiError.disputePointer && (
                <div className="mt-3 pt-3 border-t border-danger/30 flex flex-col gap-2">
                  <p className="text-xs text-muted">
                    If this is your legitimate credential or sticker, someone else may
                    have registered it fraudulently.
                  </p>
                  <Link
                    href={apiError.disputePointer}
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-danger hover:underline"
                  >
                    <span>File a dispute against this credential</span>
                    <ArrowSquareOut className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 1: IDENTITY REGISTRATION                               */}
      {/* ============================================================ */}
      {currentStep === 1 && (
        <>
          {step1SubStep === "form" && (
            <form onSubmit={handleStep1Proceed} className="flex flex-col gap-5">
              {/* Path Selection */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-mono uppercase tracking-wider text-muted">
                  Select Verification Path
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPath("gst_udyam");
                    setFieldErrors({});
                  }}
                  className={`p-4 rounded-[4px] text-left transition-colors flex flex-col gap-2 border ${
                    selectedPath === "gst_udyam"
                      ? "bg-ink-2 border-brand"
                      : "bg-ink-2 border-border hover:border-brand/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-[4px] ${
                          selectedPath === "gst_udyam"
                            ? "bg-brand/10 text-brand"
                            : "bg-ink text-muted"
                        }`}
                      >
                        <Buildings className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-text">
                        GST / Udyam Certificate
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-ok/10 text-ok border border-ok/30">
                      FAST RAMP (3 DAYS)
                    </span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Requires GSTIN or Udyam number + OTP verification. Faster path to 🟢
                    VERIFIED status.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPath("penny_drop");
                    setFieldErrors({});
                  }}
                  className={`p-4 rounded-[4px] text-left transition-colors flex flex-col gap-2 border ${
                    selectedPath === "penny_drop"
                      ? "bg-ink-2 border-brand"
                      : "bg-ink-2 border-border hover:border-brand/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-[4px] ${
                          selectedPath === "penny_drop"
                            ? "bg-brand/10 text-brand"
                            : "bg-ink text-muted"
                        }`}
                      >
                        <DeviceMobile className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-text">
                        UPI VPA Penny-Drop
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-warn/10 text-warn border border-warn/30">
                      BASELINE (7 DAYS)
                    </span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    No government paperwork needed. Verified via bank account name-match
                    with standard ramp.
                  </p>
                </button>
              </div>

              {/* Form Fields */}
              <div className="flex flex-col gap-4 pt-2">
                <span className="text-xs font-mono uppercase tracking-wider text-muted">
                  Merchant Details
                </span>

                <div>
                  <label
                    htmlFor="displayName"
                    className="block text-xs font-medium text-text mb-1"
                  >
                    Business / Store Name *
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    placeholder="e.g. Sharma Canteen"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={`w-full h-10 px-3 rounded-[4px] bg-ink-2 border text-sm text-text placeholder-muted/60 focus:outline-none focus:border-brand transition-colors ${
                      fieldErrors.displayName ? "border-danger" : "border-border"
                    }`}
                  />
                  {fieldErrors.displayName && (
                    <p className="text-xs text-danger mt-1">{fieldErrors.displayName}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="contactPhone"
                    className="block text-xs font-medium text-text mb-1"
                  >
                    Contact Mobile Number *
                  </label>
                  <input
                    id="contactPhone"
                    type="tel"
                    placeholder="e.g. +919876543210"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className={`w-full h-10 px-3 rounded-[4px] bg-ink-2 border text-sm text-text placeholder-muted/60 focus:outline-none focus:border-brand transition-colors font-mono ${
                      fieldErrors.contactPhone ? "border-danger" : "border-border"
                    }`}
                  />
                  {fieldErrors.contactPhone && (
                    <p className="text-xs text-danger mt-1">{fieldErrors.contactPhone}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="kycAddress"
                    className="block text-xs font-medium text-text mb-1"
                  >
                    Store Physical Address *
                  </label>
                  <textarea
                    id="kycAddress"
                    rows={2}
                    placeholder="e.g. Shop 12, Main Market, Sector 15, Gurgaon, HR 122001"
                    value={kycAddress}
                    onChange={(e) => setKycAddress(e.target.value)}
                    className={`w-full p-3 rounded-[4px] bg-ink-2 border text-sm text-text placeholder-muted/60 focus:outline-none focus:border-brand transition-colors resize-none ${
                      fieldErrors.kycAddress ? "border-danger" : "border-border"
                    }`}
                  />
                  {fieldErrors.kycAddress && (
                    <p className="text-xs text-danger mt-1">{fieldErrors.kycAddress}</p>
                  )}
                  <p className="text-[11px] text-muted mt-1">
                    In Step 2, your GPS coordinates will be bound to this address.
                  </p>
                </div>

                {selectedPath === "gst_udyam" ? (
                  <div>
                    <label
                      htmlFor="gstUdyamNumber"
                      className="block text-xs font-medium text-text mb-1"
                    >
                      GSTIN or Udyam Registration Number *
                    </label>
                    <input
                      id="gstUdyamNumber"
                      type="text"
                      placeholder="e.g. 29ABCDE1234F1Z5 or UDYAM-MH-01-0012345"
                      value={gstUdyamNumber}
                      onChange={(e) => setGstUdyamNumber(e.target.value.toUpperCase())}
                      className={`w-full h-10 px-3 rounded-[4px] bg-ink-2 border text-sm text-text placeholder-muted/60 focus:outline-none focus:border-brand transition-colors font-mono uppercase ${
                        fieldErrors.gstUdyamNumber ? "border-danger" : "border-border"
                      }`}
                    />
                    {fieldErrors.gstUdyamNumber && (
                      <p className="text-xs text-danger mt-1">
                        {fieldErrors.gstUdyamNumber}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="bankVpa"
                      className="block text-xs font-medium text-text mb-1"
                    >
                      Bank-Linked UPI VPA Address *
                    </label>
                    <input
                      id="bankVpa"
                      type="text"
                      placeholder="e.g. sharma.canteen@okhdfcbank"
                      value={bankVpa}
                      onChange={(e) => setBankVpa(e.target.value.toLowerCase())}
                      className={`w-full h-10 px-3 rounded-[4px] bg-ink-2 border text-sm text-text placeholder-muted/60 focus:outline-none focus:border-brand transition-colors font-mono lowercase ${
                        fieldErrors.bankVpa ? "border-danger" : "border-border"
                      }`}
                    />
                    {fieldErrors.bankVpa && (
                      <p className="text-xs text-danger mt-1">{fieldErrors.bankVpa}</p>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full h-10 rounded-[4px] bg-brand text-ink font-medium text-sm flex items-center justify-center gap-2 hover:bg-brand-soft transition-colors mt-2"
              >
                <span>
                  {selectedPath === "gst_udyam"
                    ? "Continue to OTP Verification"
                    : "Proceed to Penny-Drop Verification"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step1SubStep === "otp" && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-[4px] bg-ink-2 border border-border flex flex-col gap-2">
                <span className="text-[10px] font-mono uppercase text-muted">
                  VERIFYING GSTIN
                </span>
                <div className="font-mono text-sm text-text font-medium">
                  {gstUdyamNumber}
                </div>
                <p className="text-xs text-muted">
                  Enter the 6-digit confirmation code sent to registered mobile for{" "}
                  <span className="text-text font-mono">{contactPhone}</span>.
                </p>
              </div>

              <div>
                <label htmlFor="otp" className="block text-xs font-medium text-text mb-1">
                  6-Digit Verification OTP *
                </label>
                <input
                  id="otp"
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full h-12 px-3 rounded-[4px] bg-ink-2 border border-border text-center text-lg tracking-[0.3em] font-mono text-text focus:outline-none focus:border-brand"
                />
                <div className="mt-2 p-2.5 rounded-[4px] bg-brand/5 border border-brand/20 flex items-start gap-2">
                  <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted">
                    <span className="font-mono text-brand font-medium">
                      SIMULATED IN MVP:
                    </span>{" "}
                    Any 6 digits (e.g. 123456) will confirm.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSubmitStep1}
                  className="w-full h-10 rounded-[4px] bg-brand text-ink font-medium text-sm flex items-center justify-center gap-2 hover:bg-brand-soft transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <SpinnerGap className="w-4 h-4 animate-spin" />
                      <span>{loadingMessage}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify OTP & Complete Step 1</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setStep1SubStep("form")}
                  className="w-full h-9 rounded-[4px] bg-transparent border border-border text-muted hover:text-text text-xs font-mono transition-colors"
                >
                  Back to Details
                </button>
              </div>
            </div>
          )}

          {step1SubStep === "penny_drop_confirm" && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-[4px] bg-ink-2 border border-border flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-muted">
                    BANK PENNY-DROP SIMULATION
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-ok/10 text-ok border border-ok/30">
                    NAME MATCH CONFIRMED
                  </span>
                </div>
                <div>
                  <div className="text-xs text-muted">Bank UPI VPA</div>
                  <div className="font-mono text-sm text-text font-medium">{bankVpa}</div>
                </div>
                <div className="pt-2 border-t border-border/50 text-xs">
                  <div className="text-muted">Account Holder Name</div>
                  <div className="text-text font-medium">{displayName}</div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSubmitStep1}
                  className="w-full h-10 rounded-[4px] bg-brand text-ink font-medium text-sm flex items-center justify-center gap-2 hover:bg-brand-soft transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <SpinnerGap className="w-4 h-4 animate-spin" />
                      <span>{loadingMessage}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Confirm VPA & Complete Step 1</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setStep1SubStep("form")}
                  className="w-full h-9 rounded-[4px] bg-transparent border border-border text-muted hover:text-text text-xs font-mono transition-colors"
                >
                  Back to Details
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* STEP 2: REFERENCE CAPTURE & LOCATION BINDING (TASK 4)        */}
      {/* ============================================================ */}
      {currentStep === 2 && identityResult && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-300">
          {/* Identity Verified Badge Summary */}
          <div className="p-3.5 rounded-[4px] bg-ink-2 border border-ok/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-ok" />
              <div>
                <span className="text-xs font-medium text-text block">
                  {identityResult.displayName}
                </span>
                <span className="text-[10px] text-muted font-mono block">
                  {identityResult.kycAddress}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-ok/10 text-ok border border-ok/30">
              {identityResult.identityTier === "gst_verified"
                ? "GST TIER"
                : "BASELINE TIER"}
            </span>
          </div>

          {/* Dedicated Geolocation Permission Denied State (PRD.md Section 6) */}
          {hasLocationPermission === false && (
            <div
              role="alert"
              className="p-5 rounded-[4px] bg-danger/10 border border-danger text-text flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <MapPinLine className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-text">
                    Location Access Required
                  </h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {locationError ||
                      "QRaksha binds your UPI sticker to your storefront GPS coordinates to detect relocation fraud. We cannot verify your sticker's physical location without GPS access."}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-danger/30">
                <button
                  type="button"
                  onClick={requestLocation}
                  className="h-10 px-4 rounded-[4px] bg-brand text-ink font-medium text-xs flex items-center justify-center gap-2 hover:bg-brand-soft transition-colors"
                >
                  <ArrowsClockwise className="w-4 h-4" />
                  <span>Retry Location Access</span>
                </button>
              </div>
            </div>
          )}

          {/* GPS Coordinates Status Bar */}
          {hasLocationPermission && gpsLocation && (
            <div className="p-3.5 rounded-[4px] bg-ink-2 border border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand shrink-0" />
                <div className="text-xs font-mono">
                  <span className="text-muted block text-[10px]">
                    STOREFRONT GPS BOUND
                  </span>
                  <span className="text-text">
                    {gpsLocation.latitude.toFixed(4)}° N,{" "}
                    {gpsLocation.longitude.toFixed(4)}° E
                  </span>
                </div>
              </div>
              <div className="text-right text-[10px] font-mono text-muted">
                <span>±{gpsLocation.accuracy || 10}m accuracy</span>
                <span className="block text-brand">100m bound radius</span>
              </div>
            </div>
          )}

          {isLocating && (
            <div className="p-3 rounded-[4px] bg-ink-2 border border-border flex items-center gap-2 text-xs font-mono text-muted">
              <SpinnerGap className="w-4 h-4 animate-spin text-brand" />
              <span>Acquiring GPS coordinates for storefront binding…</span>
            </div>
          )}

          {/* Camera Capture Viewfinder Component */}
          <CameraCapture
            onCapture={handleRegisterCapture}
            defaultPayload={qrPayload}
            title="Photograph UPI QR Sticker"
            helperText="Capture the printed UPI QR sticker mounted at your billing counter. Raw photo is discarded immediately after embedding extraction."
          />

          {fieldErrors.photo && (
            <p className="text-xs text-danger font-mono">{fieldErrors.photo}</p>
          )}
          {fieldErrors.location && (
            <p className="text-xs text-danger font-mono">{fieldErrors.location}</p>
          )}

          {/* Submit Reference Capture */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              disabled={isLoading || !capturedPhoto || !gpsLocation}
              onClick={handleSubmitStep2}
              className="w-full h-11 rounded-[4px] bg-brand text-ink font-medium text-sm flex items-center justify-center gap-2 hover:bg-brand-soft transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <SpinnerGap className="w-4 h-4 animate-spin" />
                  <span>{loadingMessage}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save Reference & Advance to Proof-of-Possession</span>
                </>
              )}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setCurrentStep(1)}
              className="w-full h-9 rounded-[4px] bg-transparent border border-border text-muted hover:text-text text-xs font-mono transition-colors"
            >
              Back to Step 1 (Identity)
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ============================================================ */}
      {/* STEP 3: PROOF-OF-POSSESSION                                  */}
      {/* ============================================================ */}
      {currentStep === 3 && referenceResult && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-300">
          {possessionResult?.status === "recently_registered" ? (
            /* ============================================================ */
            /* ACTIVATION SUCCESS VIEW                                      */
            /* ============================================================ */
            <div className="flex flex-col gap-5">
              <div className="p-5 rounded-[4px] bg-ink-2 border-l-4 border-l-ok border-t border-r border-b border-border flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-ok" />
                    <span className="font-mono text-xs uppercase tracking-wider text-ok font-medium">
                      Credential Activated
                    </span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-ok/10 text-ok border border-ok/30">
                    STATUS: RECENTLY_REGISTERED
                  </span>
                </div>

                <div>
                  <h2 className="text-base font-medium text-text">
                    {identityResult?.displayName || "Registered Merchant"}
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    {identityResult?.kycAddress}
                  </p>
                </div>

                <div className="p-3 rounded-[4px] bg-ink border border-border/60 text-xs font-mono text-muted flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]">MICRO-TRANSACTION</span>
                    <span className="text-ok font-medium">₹1.00 INR CONFIRMED</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]">CREDENTIAL ID</span>
                    <span className="text-text">
                      {possessionResult.credentialId.slice(0, 16)}…
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]">ACTIVATED AT</span>
                    <span className="text-text">
                      {new Date(possessionResult.verifiedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]">IDENTITY TIER</span>
                    <span className="text-text">
                      {identityResult?.identityTier === "gst_verified"
                        ? "GST-VERIFIED (FAST RAMP)"
                        : "BASELINE (7 DAYS)"}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted leading-relaxed">
                  Your physical UPI QR sticker is now officially registered and actively
                  monitored by QRaksha. Any swap, payload tampering, or physical
                  relocation will be flagged.
                </p>
              </div>

              {/* Success Action Buttons */}
              <div className="flex flex-col gap-2">
                <Link
                  href="/dashboard"
                  className="h-10 px-4 rounded-[4px] bg-brand text-ink font-medium text-sm flex items-center justify-center gap-2 hover:bg-brand-soft transition-colors"
                >
                  <span>Go to Merchant Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/scan"
                  className="h-9 px-4 rounded-[4px] bg-transparent border border-border text-text hover:border-brand/50 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-brand" />
                  <span>Run Initial Self-Audit</span>
                </Link>
                <button
                  type="button"
                  onClick={handleReset}
                  className="h-9 px-4 rounded-[4px] bg-transparent border border-border text-muted hover:text-text text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowsClockwise className="w-3 h-3" />
                  <span>Register Another Credential</span>
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* PENDING PROOF-OF-POSSESSION / RETRY VIEW                     */
            /* ============================================================ */
            <div className="flex flex-col gap-5">
              {/* Step 2 Reference & Location Summary */}
              <div className="p-5 rounded-[4px] bg-ink-2 border-l-4 border-l-warn border-t border-r border-b border-border flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-warn" />
                    <span className="font-mono text-xs uppercase tracking-wider text-warn font-medium">
                      Pending Activation
                    </span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-warn/10 text-warn border border-warn/30">
                    STATUS: PENDING_ACTIVATION
                  </span>
                </div>

                <div>
                  <h2 className="text-base font-medium text-text">
                    {identityResult?.displayName || "Registered Merchant"}
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    {identityResult?.kycAddress}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-muted block text-[10px]">CREDENTIAL ID</span>
                    <span className="text-text truncate block">
                      {referenceResult.credentialId.slice(0, 12)}…
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block text-[10px]">QR PAYLOAD HASH</span>
                    <span className="text-text truncate block">
                      {referenceResult.qrPayloadHash.slice(0, 12)}…
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block text-[10px]">LOCATION BINDING</span>
                    <span
                      className={
                        referenceResult.locationVariance ? "text-warn" : "text-ok"
                      }
                    >
                      {referenceResult.locationVariance
                        ? "Variance Flagged"
                        : "Within Bounds (100m)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block text-[10px]">VISION EMBEDDING</span>
                    <span className="text-text">
                      {referenceResult.embeddingDimension} dims (photo purged)
                    </span>
                  </div>
                </div>
              </div>

              {/* Merchant Flow Card: Proof-of-Possession */}
              <div className="p-5 rounded-[4px] bg-ink-2 border border-brand/40 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-brand">
                  <Coins className="w-4 h-4" />
                  <span>STEP 03 // PROOF-OF-POSSESSION</span>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-text">
                    Confirm ₹1 Proof-of-Possession Micro-Transaction
                  </h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    To prevent unauthorized entities from claiming your physical QR code,
                    a ₹1.00 verification micro-transaction confirms control before your
                    credential is activated on the network.
                  </p>
                </div>

                {/* Simulated Rejection Notice if previous attempt failed */}
                {possessionResult && !possessionResult.simulationPassed && (
                  <div
                    role="alert"
                    className="p-3 rounded-[4px] bg-danger/10 border border-danger text-xs flex items-start gap-2.5 animate-in fade-in"
                  >
                    <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-medium text-text block">
                        Verification Rejected
                      </span>
                      <p className="text-muted mt-0.5 leading-relaxed">
                        {possessionResult.message ||
                          "The micro-transaction could not confirm ownership of this UPI VPA. Credential remains in pending_activation."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Transaction Details Box */}
                <div className="p-3 rounded-[4px] bg-ink border border-border text-xs font-mono flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted text-[10px]">VERIFYING VPA</span>
                    <span className="text-text font-medium">
                      {bankVpa.trim() || "merchant@upi"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted text-[10px]">AMOUNT</span>
                    <span className="text-text font-medium">₹1.00 INR</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted text-[10px]">STATUS</span>
                    <span className="text-warn">Pending Confirmation</span>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleConfirmProofOfPossession}
                    className="w-full h-10 px-4 rounded-[4px] bg-brand text-ink font-medium text-sm flex items-center justify-center gap-2 hover:bg-brand-soft disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <SpinnerGap className="w-4 h-4 animate-spin" />
                        <span>{loadingMessage}</span>
                      </>
                    ) : (
                      <>
                        <Coins className="w-4 h-4" />
                        <span>
                          {possessionResult && !possessionResult.simulationPassed
                            ? "Retry Proof-of-Possession"
                            : "Confirm Proof-of-Possession"}
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setCurrentStep(2)}
                    className="w-full h-9 rounded-[4px] bg-transparent border border-border text-muted hover:text-text text-xs font-mono transition-colors"
                  >
                    Back to Step 2 (Reference)
                  </button>
                </div>
              </div>

              {/* ============================================================ */}
              {/* DEV / ADMIN DEMO PANEL (NOT SHOWN IN END-USER FLOW COPY)      */}
              {/* ============================================================ */}
              <div className="rounded-[4px] bg-ink-3 border border-border/80 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsDevPanelOpen(!isDevPanelOpen)}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-ink-2 transition-colors"
                  aria-expanded={isDevPanelOpen}
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-brand" />
                    <span className="font-mono text-[11px] uppercase tracking-wider text-text font-medium">
                      Dev / Admin Demo Controls
                    </span>
                    <span className="font-mono text-[10px] text-muted hidden sm:inline">
                      (Simulation Toggle)
                    </span>
                  </div>
                  {isDevPanelOpen ? (
                    <CaretUp className="w-3.5 h-3.5 text-muted" />
                  ) : (
                    <CaretDown className="w-3.5 h-3.5 text-muted" />
                  )}
                </button>

                {isDevPanelOpen && (
                  <div className="p-3 pt-0 border-t border-border/50 flex flex-col gap-3 font-mono text-xs">
                    <div className="p-2.5 rounded-[4px] bg-ink border border-border/60 text-[11px] leading-relaxed text-muted">
                      <span className="text-warn font-semibold">
                        Simulated for demo:{" "}
                      </span>
                      In production, this step triggers a real ₹1 penny-drop / reverse
                      micro-transaction through banking partner APIs. For demo evaluation
                      and test suites, toggle the simulated outcome below before clicking
                      confirm.
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] uppercase text-muted">
                        Simulation Outcome:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSimulationPassed(true)}
                          className={`p-2 rounded-[4px] border text-left text-xs transition-colors flex items-center justify-between ${
                            simulationPassed
                              ? "bg-brand/10 border-brand text-brand font-medium"
                              : "bg-ink border-border text-muted hover:text-text"
                          }`}
                        >
                          <span>Pass (Active)</span>
                          {simulationPassed && (
                            <CheckCircle className="w-3.5 h-3.5 text-brand" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSimulationPassed(false)}
                          className={`p-2 rounded-[4px] border text-left text-xs transition-colors flex items-center justify-between ${
                            !simulationPassed
                              ? "bg-danger/10 border-danger text-danger font-medium"
                              : "bg-ink border-border text-muted hover:text-text"
                          }`}
                        >
                          <span>Fail (Reject)</span>
                          {!simulationPassed && (
                            <XCircle className="w-3.5 h-3.5 text-danger" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
