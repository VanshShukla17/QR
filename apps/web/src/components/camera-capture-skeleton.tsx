import React from "react";

export function CameraCaptureSkeleton({
  title = "Capture Reference Photo",
  helperText = "Align your physical UPI QR sticker and surrounding surface inside the frame.",
}: {
  title?: string;
  helperText?: string;
}) {
  return (
    <div
      className="flex flex-col gap-4 w-full"
      aria-busy="true"
      aria-label="Loading camera viewfinder"
    >
      {/* Header Info */}
      <div>
        <h3 className="text-sm font-medium text-[var(--text-primary)]">{title}</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
          {helperText}
        </p>
      </div>

      {/* Live Camera Viewfinder Skeleton */}
      <div className="card-glass card-glow rounded-[24px] p-3.5 sm:p-4 flex flex-col w-full relative">
        {/* Top Zone: Status Pill Skeleton */}
        <div className="w-full flex justify-center pb-3 pt-1 px-2">
          <div className="px-3.5 py-1.5 rounded-full bg-black/70 border border-white/20 text-white text-[clamp(10px,2.5vw,11px)] font-mono flex items-center justify-center gap-1.5 shadow-sm animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#E0262F] animate-ping" />
            <span>STARTING CAMERA VIEWFINDER…</span>
          </div>
        </div>

        {/* Middle Zone: Video Preview placeholder */}
        <div className="relative w-full aspect-[4/3] bg-black/95 rounded-[18px] overflow-hidden border border-[var(--surface-border)] flex items-center justify-center flex-1">
          <div className="flex flex-col items-center justify-center gap-2 text-[var(--text-secondary)]">
            <div className="w-6 h-6 border-2 border-[#E0262F] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-muted">
              Initializing optical scanner…
            </span>
          </div>

          {/* Technical Framing Overlay */}
          <div className="absolute inset-3.5 sm:inset-4 pointer-events-none border border-[#FF6B5E]/30 rounded-[12px] flex flex-col justify-between p-2">
            <div className="flex justify-between items-start">
              <span className="text-[clamp(9px,2.2vw,11px)] font-mono text-[#FF6B5E]/60 bg-black/60 px-1.5 py-0.5 rounded">
                ┌ FRAME ▸ ALIGN QR
              </span>
              <span className="text-[clamp(9px,2.2vw,11px)] font-mono text-[#FF6B5E]/60 bg-black/60 px-1.5 py-0.5 rounded">
                FIG. 01 ┐
              </span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-[clamp(9px,2.2vw,11px)] font-mono text-[#FF6B5E]/60 bg-black/60 px-1.5 py-0.5 rounded">
                └ OPTICAL // READY
              </span>
              <span className="text-[clamp(9px,2.2vw,11px)] font-mono text-[#FF6B5E]/60 bg-black/60 px-1.5 py-0.5 rounded">
                STANDBY ┘
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Zone: Button Bar Placeholder */}
        <div className="pt-3.5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-12 rounded-[14px] bg-[#E0262F]/30 animate-pulse" />
            <div className="w-12 h-12 rounded-[14px] bg-[var(--surface)] border border-[var(--surface-border)] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
