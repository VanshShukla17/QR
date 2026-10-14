"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError, registerIdentity } from "@/lib/api";

type IdentityPath = "gst_udyam" | "penny_drop";

interface FormErrors {
  displayName?: string;
  contactPhone?: string;
  kycAddress?: string;
  gstUdyamNumber?: string;
  otp?: string;
  bankVpa?: string;
  general?: string;
  disputeUrl?: string;
}

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [path, setPath] = useState<IdentityPath>("gst_udyam");

  // Form Fields
  const [displayName, setDisplayName] = useState("");
  const [contactPhone, setContactPhone] = useState("+91");
  const [kycAddress, setKycAddress] = useState("");
  const [gstUdyamNumber, setGstUdyamNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [bankVpa, setBankVpa] = useState("");

  // Sub-step states
  const [otpSent, setOtpSent] = useState(false);
  const [pennyDropVerified, setPennyDropVerified] = useState(false);

  // UX states
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [registeredData, setRegisteredData] = useState<{
    merchantId: string;
    identityTier: string;
    displayName: string;
  } | null>(null);

  const handleSendOtp = () => {
    if (!contactPhone || contactPhone.length < 10) {
      setErrors((prev) => ({
        ...prev,
        contactPhone: "Enter a valid mobile number first",
      }));
      return;
    }
    setOtpSent(true);
    setOtp("123456"); // Pre-fill mock OTP for smooth demo
    setErrors((prev) => ({ ...prev, otp: undefined, general: undefined }));
  };

  const handleSimulatePennyDrop = () => {
    if (!bankVpa || !bankVpa.includes("@")) {
      setErrors((prev) => ({
        ...prev,
        bankVpa: "Enter a valid UPI VPA (e.g. name@okhdfcbank)",
      }));
      return;
    }
    setPennyDropVerified(true);
    setErrors((prev) => ({ ...prev, bankVpa: undefined, general: undefined }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!displayName.trim() || displayName.length < 2) {
      newErrors.displayName = "Business name must be at least 2 characters";
    }

    if (!/^\+?[1-9]\d{9,14}$/.test(contactPhone.trim())) {
      newErrors.contactPhone = "Enter a valid phone number (e.g. +919876543210)";
    }

    if (!kycAddress.trim() || kycAddress.length < 5) {
      newErrors.kycAddress = "Registered address must be at least 5 characters";
    }

    if (path === "gst_udyam") {
      if (!gstUdyamNumber.trim() || gstUdyamNumber.length < 5) {
        newErrors.gstUdyamNumber = "Valid GSTIN or Udyam number is required";
      }
      if (!otp.trim() || otp.length !== 6) {
        newErrors.otp = "Enter the 6-digit confirmation OTP";
      }
    } else {
      if (!/^[\w.-]+@[\w.-]+$/.test(bankVpa.trim())) {
        newErrors.bankVpa = "Valid UPI VPA is required (e.g. store@okaxis)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let result;
      if (path === "gst_udyam") {
        result = await registerIdentity({
          path: "gst_udyam",
          displayName: displayName.trim(),
          contactPhone: contactPhone.trim(),
          kycAddress: kycAddress.trim(),
          gstUdyamNumber: gstUdyamNumber.trim(),
          otp: otp.trim(),
        });
      } else {
        result = await registerIdentity({
          path: "penny_drop",
          displayName: displayName.trim(),
          contactPhone: contactPhone.trim(),
          kycAddress: kycAddress.trim(),
          bankVpa: bankVpa.trim(),
        });
      }

      setRegisteredData({
        merchantId: result.merchantId,
        identityTier: result.identityTier,
        displayName: result.displayName,
      });

      // Advance to Step 2
      setCurrentStep(2);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "CONFLICT") {
          setErrors({
            general: err.message,
            disputeUrl: err.disputeUrl || "/credential/dispute/new",
          });
        } else {
          setErrors({ general: err.message });
        }
      } else {
        setErrors({ general: "Failed to connect to registration server. Please retry." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-4 max-w-md mx-auto">
      {/* Wizard Progress Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted-text)] mb-2">
          <span className={currentStep === 1 ? "text-[var(--primary)] font-bold" : ""}>
            1. Identity
          </span>
          <span className={currentStep === 2 ? "text-[var(--primary)] font-bold" : ""}>
            2. Photo & GPS
          </span>
          <span className={currentStep === 3 ? "text-[var(--primary)] font-bold" : ""}>
            3. Possession
          </span>
        </div>
        <div className="w-full bg-[var(--border)] h-2 rounded-full overflow-hidden">
          <div
            className="bg-[var(--primary)] h-full transition-all duration-300"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>
      </div>

      {currentStep === 1 ? (
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1 text-[var(--secondary)]">
            Merchant Registration
          </h1>
          <p className="text-sm text-[var(--muted-text)] mb-5">
            Verify your business identity to bind and protect your physical UPI QR
            sticker.
          </p>

          {/* Conflict / General Error Banner */}
          {errors.general && (
            <div
              role="alert"
              className="p-4 mb-5 rounded-lg border border-[var(--error)] bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200 text-sm"
            >
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-[var(--error)] shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="font-semibold mb-1">Registration Conflict</p>
                  <p>{errors.general}</p>
                  {errors.disputeUrl && (
                    <Link
                      href={errors.disputeUrl}
                      className="inline-block mt-2 font-bold underline text-[var(--primary)] hover:opacity-80"
                    >
                      File an Impersonation Dispute &rarr;
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tier Selection Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--border)] rounded-lg mb-5">
            <button
              type="button"
              onClick={() => {
                setPath("gst_udyam");
                setErrors({});
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-md transition-all ${
                path === "gst_udyam"
                  ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm font-bold"
                  : "text-[var(--muted-text)] hover:text-[var(--text)]"
              }`}
            >
              GST / Udyam
              <span className="block text-[10px] font-normal text-[var(--success)]">
                Fast-track trust
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPath("penny_drop");
                setErrors({});
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-md transition-all ${
                path === "penny_drop"
                  ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm font-bold"
                  : "text-[var(--muted-text)] hover:text-[var(--text)]"
              }`}
            >
              UPI Penny-Drop
              <span className="block text-[10px] font-normal text-[var(--muted-text)]">
                Baseline tier
              </span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-[var(--secondary)]">
                Business / Store Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Sharma Canteen"
                disabled={loading}
                className={`w-full px-3 py-2 rounded-lg border bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${
                  errors.displayName ? "border-[var(--error)]" : "border-[var(--border)]"
                }`}
              />
              {errors.displayName && (
                <p className="text-xs text-[var(--error)] mt-1">{errors.displayName}</p>
              )}
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-[var(--secondary)]">
                Contact Mobile Number
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+919876543210"
                disabled={loading}
                className={`w-full px-3 py-2 rounded-lg border bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${
                  errors.contactPhone ? "border-[var(--error)]" : "border-[var(--border)]"
                }`}
              />
              {errors.contactPhone && (
                <p className="text-xs text-[var(--error)] mt-1">{errors.contactPhone}</p>
              )}
            </div>

            {/* KYC Address */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-[var(--secondary)]">
                Store Location / KYC Address
              </label>
              <textarea
                rows={2}
                value={kycAddress}
                onChange={(e) => setKycAddress(e.target.value)}
                placeholder="e.g. Shop 4, Campus Market, IIT Bombay, Powai, Mumbai"
                disabled={loading}
                className={`w-full px-3 py-2 rounded-lg border bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${
                  errors.kycAddress ? "border-[var(--error)]" : "border-[var(--border)]"
                }`}
              />
              {errors.kycAddress && (
                <p className="text-xs text-[var(--error)] mt-1">{errors.kycAddress}</p>
              )}
            </div>

            {/* Path Specific Inputs */}
            {path === "gst_udyam" ? (
              <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-[var(--secondary)]">
                    GSTIN or Udyam Registration Number
                  </label>
                  <input
                    type="text"
                    value={gstUdyamNumber}
                    onChange={(e) => setGstUdyamNumber(e.target.value.toUpperCase())}
                    placeholder="27AAPFU0939F1ZV"
                    disabled={loading}
                    className={`w-full px-3 py-2 rounded-lg border bg-[var(--surface)] text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${
                      errors.gstUdyamNumber
                        ? "border-[var(--error)]"
                        : "border-[var(--border)]"
                    }`}
                  />
                  {errors.gstUdyamNumber && (
                    <p className="text-xs text-[var(--error)] mt-1">
                      {errors.gstUdyamNumber}
                    </p>
                  )}
                </div>

                {/* Sub-step: OTP Confirmation */}
                <div className="pt-2 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--secondary)]">
                      OTP Confirmation
                    </label>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="text-xs text-[var(--primary)] font-bold hover:underline"
                    >
                      {otpSent ? "Resend OTP" : "Send OTP"}
                    </button>
                  </div>

                  {otpSent && (
                    <div className="text-[11px] text-[var(--success)] font-medium mb-2 bg-green-50 dark:bg-green-950/30 p-2 rounded border border-green-200 dark:border-green-800">
                      OTP sent to registered mobile. (Demo OTP: <strong>123456</strong>)
                    </div>
                  )}

                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    disabled={loading}
                    className={`w-full px-3 py-2 rounded-lg border bg-[var(--surface)] text-sm tracking-widest text-center font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${
                      errors.otp ? "border-[var(--error)]" : "border-[var(--border)]"
                    }`}
                  />
                  {errors.otp && (
                    <p className="text-xs text-[var(--error)] mt-1">{errors.otp}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-[var(--secondary)]">
                    Merchant UPI VPA
                  </label>
                  <input
                    type="text"
                    value={bankVpa}
                    onChange={(e) => setBankVpa(e.target.value.toLowerCase())}
                    placeholder="merchant@okhdfcbank"
                    disabled={loading}
                    className={`w-full px-3 py-2 rounded-lg border bg-[var(--surface)] text-sm lowercase focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${
                      errors.bankVpa ? "border-[var(--error)]" : "border-[var(--border)]"
                    }`}
                  />
                  {errors.bankVpa && (
                    <p className="text-xs text-[var(--error)] mt-1">{errors.bankVpa}</p>
                  )}
                </div>

                {/* Sub-step: Penny-Drop verification simulation */}
                <div className="pt-2 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--secondary)]">
                      Bank Name Match (Penny Drop)
                    </span>
                    <button
                      type="button"
                      onClick={handleSimulatePennyDrop}
                      disabled={loading || pennyDropVerified}
                      className="text-xs text-[var(--primary)] font-bold hover:underline"
                    >
                      {pennyDropVerified ? "Verified" : "Verify VPA"}
                    </button>
                  </div>

                  {pennyDropVerified ? (
                    <div className="text-xs text-[var(--success)] font-medium bg-green-50 dark:bg-green-950/30 p-2.5 rounded border border-green-200 dark:border-green-800 flex items-center gap-2">
                      <svg
                        className="w-4 h-4 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      ₹1 Penny-Drop match verified with beneficiary bank.
                    </div>
                  ) : (
                    <p className="text-[11px] text-[var(--muted-text)]">
                      Simulated check: verifies that your bank account holder name matches
                      your merchant business name.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg font-bold text-white bg-[var(--primary)] hover:opacity-95 disabled:opacity-50 transition-opacity shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Verifying Identity...
                </>
              ) : (
                "Complete Step 1 & Proceed &rarr;"
              )}
            </button>
          </form>
        </div>
      ) : (
        /* Step 2 Preview / Confirmation Screen */
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-950/40 text-[var(--success)] rounded-full mx-auto flex items-center justify-center">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-[var(--secondary)]">
            Identity Verified!
          </h2>

          <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-[var(--muted-text)]">Merchant:</span>
              <span className="font-semibold">{registeredData?.displayName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted-text)]">Identity Tier:</span>
              <span className="font-semibold uppercase text-[var(--success)]">
                {registeredData?.identityTier}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted-text)]">Merchant ID:</span>
              <span className="font-mono text-[10px] text-[var(--muted-text)]">
                {registeredData?.merchantId}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-left text-xs text-[var(--info)] space-y-1">
            <p className="font-bold">Next: Step 2 — Reference Photo & Location</p>
            <p className="text-[var(--muted-text)]">
              Photograph your physical QR sticker in place to establish its visual and
              geographic anchor.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => alert("Proceeding to Task 4: Camera & Location Capture")}
              className="w-full py-3 px-4 rounded-lg font-bold text-white bg-[var(--primary)] hover:opacity-95 shadow-md"
            >
              Capture Reference Photo & Location &rarr;
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
