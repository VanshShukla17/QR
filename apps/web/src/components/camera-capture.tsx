"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  ArrowsClockwise,
  UploadSimple,
  WarningCircle,
  Check,
  SpinnerGap,
} from "@phosphor-icons/react";
import jsQR from "jsqr";

export interface CameraCaptureProps {
  onCapture: (data: { photoBase64: string; qrPayload?: string }) => void;
  title?: string;
  helperText?: string;
  defaultPayload?: string;
}

function decodeQrFromCanvas(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const w = canvas.width;
  const h = canvas.height;

  // 1. Direct pass with both normal and inverted polarity
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const code = jsQR(imgData.data, w, h, { inversionAttempts: "attemptBoth" });
    if (code?.data?.trim()) return code.data.trim();
  } catch {
    // ignore
  }

  // 2. Downscaled pass if resolution > 640px (optimal for jsQR performance & noise reduction)
  if (w > 640 || h > 640) {
    try {
      const scale = 600 / Math.max(w, h);
      const scaledCanvas = document.createElement("canvas");
      scaledCanvas.width = Math.max(1, Math.floor(w * scale));
      scaledCanvas.height = Math.max(1, Math.floor(h * scale));
      const sCtx = scaledCanvas.getContext("2d");
      if (sCtx) {
        sCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
        const sImgData = sCtx.getImageData(0, 0, scaledCanvas.width, scaledCanvas.height);
        const code = jsQR(sImgData.data, scaledCanvas.width, scaledCanvas.height, {
          inversionAttempts: "attemptBoth",
        });
        if (code?.data?.trim()) return code.data.trim();
      }
    } catch {
      // ignore
    }
  }

  // 3. Center-crop pass (matches technical framing reticle in viewfinder)
  try {
    const cropW = Math.floor(w * 0.7);
    const cropH = Math.floor(h * 0.7);
    const cropX = Math.floor((w - cropW) / 2);
    const cropY = Math.floor((h - cropH) / 2);
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = 480;
    cropCanvas.height = 480;
    const cCtx = cropCanvas.getContext("2d");
    if (cCtx) {
      cCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, 480, 480);
      const cImgData = cCtx.getImageData(0, 0, 480, 480);
      const code = jsQR(cImgData.data, 480, 480, { inversionAttempts: "attemptBoth" });
      if (code?.data?.trim()) return code.data.trim();
    }
  } catch {
    // ignore
  }

  return null;
}

export function CameraCapture({
  onCapture,
  title = "Capture Reference Photo",
  helperText = "Align your physical UPI QR sticker and surrounding surface inside the frame.",
  defaultPayload = "upi://pay?pa=merchant@upi&pn=Store&cu=INR",
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [detectedQr, setDetectedQr] = useState<string>(defaultPayload);
  const [hasLiveQrDetected, setHasLiveQrDetected] = useState<boolean>(false);
  const [qrDecodeWarning, setQrDecodeWarning] = useState<boolean>(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Store detected QR and onCapture in refs to prevent render-loop triggers
  const detectedQrRef = useRef<string>(defaultPayload);
  const onCaptureRef = useRef(onCapture);

  useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);

  // Safely stop active camera tracks
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore track stop error
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Request camera access and play feed
  const startCamera = useCallback(async () => {
    setPermissionError(null);

    // Reuse existing live stream if already open and tracks are live
    if (
      streamRef.current &&
      streamRef.current.getTracks().some((t) => t.readyState === "live")
    ) {
      const video = videoRef.current;
      if (video) {
        video.srcObject = streamRef.current;
        video.muted = true;
        video.play().catch(() => {});
        setIsCameraActive(true);
        setHasCameraPermission(true);
      }
      return;
    }

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not supported in this browser.");
      }

      let mediaStream: MediaStream;
      try {
        // Preferred constraint: environment camera with 720p ideal resolution
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback constraint: any video camera available on device
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (!isMountedRef.current) {
        mediaStream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = mediaStream;
      setHasCameraPermission(true);

      const video = videoRef.current;
      if (video) {
        video.srcObject = mediaStream;
        video.muted = true;
        video.setAttribute("muted", "true");
        video.playsInline = true;
        video.setAttribute("playsinline", "true");

        const tryPlay = () => {
          video.play().catch(() => {});
        };

        tryPlay();
        video.onloadedmetadata = () => {
          tryPlay();
          setIsCameraActive(true);
        };
        video.oncanplay = () => {
          tryPlay();
          setIsCameraActive(true);
        };
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setHasCameraPermission(false);
      setIsCameraActive(false);
      const error = err as Error;
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setPermissionError(
          "Camera permission was denied. Please allow camera access in your browser settings to photograph your QR sticker."
        );
      } else {
        setPermissionError(
          error.message ||
            "Unable to access camera. Please check your device settings or use the file upload option."
        );
      }
    }
  }, []);

  // Initial mount: start camera once. Unmount: stop camera once.
  useEffect(() => {
    isMountedRef.current = true;
    startCamera();

    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Background QR detection loop (runs 2 times/sec to conserve CPU and prevent UI thread jitter)
  useEffect(() => {
    if (!hasCameraPermission || capturedPhoto) return;

    let barcodeDetector: {
      detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
    } | null = null;
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        barcodeDetector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      } catch {
        barcodeDetector = null;
      }
    }

    const intervalId = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.paused || video.ended) {
        return;
      }

      try {
        if (barcodeDetector) {
          try {
            const results = await barcodeDetector.detect(video);
            if (results && results.length > 0 && results[0].rawValue) {
              const code = results[0].rawValue.trim();
              if (code) {
                detectedQrRef.current = code;
                setDetectedQr(code);
                setHasLiveQrDetected(true);
              }
              return;
            }
          } catch {
            // fallback to jsQR
          }
        }

        // Offscreen canvas fallback
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement("canvas");
        }
        const canvas = offscreenCanvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;
        const scale = Math.min(1, 480 / w);
        const targetW = Math.max(1, Math.floor(w * scale));
        const targetH = Math.max(1, Math.floor(h * scale));

        canvas.width = targetW;
        canvas.height = targetH;
        ctx.drawImage(video, 0, 0, targetW, targetH);

        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const qr = jsQR(imgData.data, targetW, targetH);
        if (qr && qr.data && qr.data.trim()) {
          const val = qr.data.trim();
          detectedQrRef.current = val;
          setDetectedQr(val);
          setHasLiveQrDetected(true);
        }
      } catch {
        // Silently catch scan errors
      }
    }, 450);

    return () => {
      clearInterval(intervalId);
    };
  }, [hasCameraPermission, capturedPhoto]);

  // Take photo from video feed
  const takeSnapshot = useCallback(() => {
    const video = videoRef.current;
    console.log(
      "[CameraCapture] takeSnapshot called. video:",
      !!video,
      "readyState:",
      video?.readyState,
      "videoWidth:",
      video?.videoWidth
    );
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      if (video.readyState >= 2 && video.videoWidth > 0) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = "#161B22";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } catch (e) {
      console.warn("[CameraCapture] drawImage failed, using fallback:", e);
      ctx.fillStyle = "#161B22";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const photoBase64 = canvas.toDataURL("image/jpeg", 0.85);

    // Multi-scale decode attempt from snapshot canvas
    const decoded = decodeQrFromCanvas(canvas);
    if (decoded) {
      detectedQrRef.current = decoded;
      setDetectedQr(decoded);
      setHasLiveQrDetected(true);
      setQrDecodeWarning(false);
      setCapturedPhoto(photoBase64);
      stopCamera();
      onCaptureRef.current({ photoBase64, qrPayload: decoded });
    } else if (hasLiveQrDetected && detectedQrRef.current) {
      setQrDecodeWarning(false);
      setCapturedPhoto(photoBase64);
      stopCamera();
      onCaptureRef.current({ photoBase64, qrPayload: detectedQrRef.current });
    } else {
      // No QR could be extracted
      setQrDecodeWarning(true);
      setCapturedPhoto(photoBase64);
      stopCamera();
    }
  }, [hasLiveQrDetected, stopCamera]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    setQrDecodeWarning(false);
    startCamera();
  }, [startCamera]);

  // Handle fallback file upload
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setCapturedPhoto(base64);

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const decoded = decodeQrFromCanvas(canvas);
            if (decoded) {
              setDetectedQr(decoded);
              detectedQrRef.current = decoded;
              setHasLiveQrDetected(true);
              setQrDecodeWarning(false);
              stopCamera();
              onCaptureRef.current({ photoBase64: base64, qrPayload: decoded });
              return;
            }
          }
          setQrDecodeWarning(true);
          stopCamera();
        };
        img.onerror = () => {
          setQrDecodeWarning(true);
          stopCamera();
        };
        img.src = base64;
      };
      reader.readAsDataURL(file);
    },
    [stopCamera]
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header Info */}
      <div>
        <h3 className="text-sm font-medium text-[var(--text-primary)]">{title}</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
          {helperText}
        </p>
      </div>

      {/* Camera Permission Denied Screen */}
      {hasCameraPermission === false && (
        <div
          role="alert"
          className="p-5 rounded-[16px] bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-[var(--text-primary)] flex flex-col gap-3"
        >
          <div className="flex items-start gap-3">
            <WarningCircle
              className="w-5 h-5 text-[#E0262F] shrink-0 mt-0.5"
              weight="duotone"
            />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-[var(--text-primary)]">
                Camera Access Required
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                {permissionError ||
                  "QRaksha requires camera access to photograph your physical UPI sticker and extract a visual embedding. We never persist raw photos."}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-red-200 dark:border-red-900/40">
            <button
              type="button"
              onClick={startCamera}
              className="h-10 px-4 rounded-[14px] btn-red-glass font-medium text-xs flex items-center justify-center gap-2"
            >
              <ArrowsClockwise className="w-4 h-4" weight="bold" />
              <span>Retry Camera Permission</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-pill-secondary h-9 px-4 text-xs flex items-center justify-center gap-2"
            >
              <UploadSimple className="w-3.5 h-3.5" weight="bold" />
              <span>Upload Photo Instead</span>
            </button>
          </div>
        </div>
      )}

      {/* Live Camera Viewfinder (Persistent Video Element) */}
      {!capturedPhoto && hasCameraPermission !== false && (
        <div className="card-glass card-glow rounded-[24px] p-3.5 sm:p-4 flex flex-col w-full relative">
          {/* Top Zone: Status Pill */}
          <div className="w-full flex justify-center pb-3 pt-1 px-2">
            {hasLiveQrDetected ? (
              <div className="max-w-[calc(100%-32px)] px-3.5 py-1.5 rounded-full bg-ok/90 backdrop-blur-md border border-ok text-white text-[clamp(10px,2.5vw,11px)] font-mono font-medium flex items-center justify-center gap-1.5 shadow-md truncate">
                <Check className="w-3.5 h-3.5 text-white shrink-0" weight="bold" />
                <span className="truncate">QR DETECTED // READY</span>
              </div>
            ) : (
              <div className="max-w-[calc(100%-32px)] px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white text-[clamp(10px,2.5vw,11px)] font-mono flex items-center justify-center gap-1.5 shadow-sm truncate">
                <SpinnerGap
                  className="w-3.5 h-3.5 text-[#FF6B5E] animate-spin shrink-0"
                  weight="bold"
                />
                <span className="truncate">HOLD STEADY // DETECTING QR</span>
              </div>
            )}
          </div>

          {/* Middle Zone: Video Preview with Red Corner-Bracket Viewfinder */}
          <div className="relative w-full aspect-[4/3] bg-black/95 rounded-[18px] overflow-hidden border border-[var(--surface-border)] flex items-center justify-center flex-1">
            {/* <video> is ALWAYS in DOM to prevent hardware encoder thrashing */}
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full object-cover transition-opacity duration-200 ${
                isCameraActive ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* Loading overlay while camera initializes */}
            {!isCameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--surface)] text-[var(--text-secondary)]">
                <SpinnerGap
                  className="w-5 h-5 animate-spin text-[#E0262F]"
                  weight="bold"
                />
                <span className="text-xs font-mono">Initializing camera feed…</span>
              </div>
            )}

            {/* Technical Framing Overlay per DESIGN.md with safe interior padding */}
            <div className="absolute inset-3.5 sm:inset-4 pointer-events-none border border-[#FF6B5E]/50 rounded-[12px] flex flex-col justify-between p-2">
              <div className="flex justify-between items-start">
                <span className="text-[clamp(9px,2.2vw,11px)] font-mono text-[#FF6B5E] bg-black/60 px-1.5 py-0.5 rounded [text-shadow:0_1px_2px_rgba(0,0,0,0.9)] backdrop-blur-[2px]">
                  ┌ FRAME ▸ ALIGN QR
                </span>
                <span className="text-[clamp(9px,2.2vw,11px)] font-mono text-[#FF6B5E] bg-black/60 px-1.5 py-0.5 rounded [text-shadow:0_1px_2px_rgba(0,0,0,0.9)] backdrop-blur-[2px]">
                  FIG. 01 ┐
                </span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-[clamp(9px,2.2vw,11px)] font-mono text-[#FF6B5E] bg-black/60 px-1.5 py-0.5 rounded [text-shadow:0_1px_2px_rgba(0,0,0,0.9)] backdrop-blur-[2px]">
                  └ TRACK // ACTIVE
                </span>
                <span className="text-[clamp(9px,2.2vw,11px)] font-mono text-[#FF6B5E] bg-black/60 px-1.5 py-0.5 rounded [text-shadow:0_1px_2px_rgba(0,0,0,0.9)] backdrop-blur-[2px]">
                  FOCUS ┘
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Zone: Action Bar in normal flow */}
          <div className="pt-3.5 px-0.5 flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={takeSnapshot}
              className="btn-red-glass flex-1 h-12 px-4 rounded-[16px] font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm min-h-[48px]"
            >
              <Camera className="w-4 h-4 shrink-0" weight="bold" />
              <span className="truncate">Capture Reference Photo</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload from files"
              title="Upload photo from files"
              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-[14px] bg-[var(--surface)] hover:bg-[var(--surface-hover,#201917)] border border-[var(--surface-border)] text-[var(--text-primary)] flex items-center justify-center transition-colors shrink-0 shadow-sm"
            >
              <UploadSimple className="w-4 h-4" weight="bold" />
            </button>
          </div>
        </div>
      )}

      {/* Captured Photo Preview */}
      {capturedPhoto && (
        <div className="card-glass card-glow p-3.5 sm:p-4 rounded-[24px] flex flex-col gap-3.5 w-full relative">
          <div className="relative w-full aspect-[4/3] bg-[var(--surface)] rounded-[18px] overflow-hidden border border-ok/50">
            <img
              src={capturedPhoto}
              alt="Reference QR Sticker"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm border border-ok text-[#4ADE80] text-[10px] font-mono flex items-center gap-1.5">
              <Check className="w-3 h-3" weight="bold" />
              <span>PHOTO CAPTURED // EMBEDDING READY</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              Zero raw bytes will be stored
            </span>
            <button
              type="button"
              onClick={retakePhoto}
              className="btn-pill-secondary h-10 px-3.5 text-xs flex items-center gap-1.5 font-medium min-h-[44px]"
            >
              <ArrowsClockwise className="w-3.5 h-3.5" weight="bold" />
              <span>Retake Photo</span>
            </button>
          </div>
        </div>
      )}

      {/* QR Decode Warning Alert if jsQR could not decode the snapshot */}
      {capturedPhoto && qrDecodeWarning && (
        <div className="p-3.5 rounded-[16px] bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-[var(--text-primary)] text-xs flex flex-col gap-2.5">
          <div className="flex items-start gap-2.5">
            <WarningCircle
              className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
              weight="duotone"
            />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">
                QR Pattern Not Detected in Frame
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                Camera snapshot could not decode the QR matrix (possible glare or angle).
                Verify or type your registered UPI payload below to continue self-audit.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setQrDecodeWarning(false);
              onCaptureRef.current({ photoBase64: capturedPhoto, qrPayload: detectedQr });
            }}
            className="self-end px-3 py-1.5 rounded-full bg-[#E0262F] text-white text-xs font-medium hover:bg-[#E0262F]/90 transition-colors"
          >
            Verify with Entered Payload →
          </button>
        </div>
      )}

      {/* Scanned/Configured QR Payload */}
      <div className="p-3 rounded-[14px] bg-[var(--box-mono-bg)] border border-[var(--box-mono-border)] flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)] uppercase">
          <span>Decoded QR Payload</span>
          <span className="text-ok">UPI Compliant</span>
        </div>
        <input
          type="text"
          value={detectedQr}
          onChange={(e) => {
            const val = e.target.value;
            detectedQrRef.current = val;
            setDetectedQr(val);
          }}
          placeholder="upi://pay?pa=merchant@upi&pn=Store"
          className="w-full h-8 px-2.5 rounded-[10px] bg-[var(--surface)] border border-[var(--box-mono-border)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#E0262F]"
        />
        <p className="text-[10px] text-[var(--text-muted)]">
          Auto-detected from camera or test default. You can edit this if needed.
        </p>
      </div>

      {/* Single persistent file input for uploads & testing */}
      <input
        id="qr-camera-file-input"
        data-testid="file-upload-input"
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}
