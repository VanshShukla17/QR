"use client";

import React, { useEffect, useState, useId } from "react";
import dynamic from "next/dynamic";

const GrainGradient = dynamic(
  () => import("@paper-design/shaders-react").then((m) => m.GrainGradient),
  { ssr: false }
);

interface RisographGrainWaveProps {
  className?: string;
  showGrain?: boolean;
  speed?: number;
  noise?: number;
  softness?: number;
  intensity?: number;
  scale?: number;
  offsetY?: number;
  offsetX?: number;
}

const BASE_COLOR = "#180505";
const PALETTE_COLORS = [
  "#6B1408", // 1. Maroon-mid
  "#C23A1C", // 2. Ember
  "#FF5A36", // 3. Radiant crest accent
  "#FF8A6B", // 4. Soft terracotta
  "#FFE9E4", // 5. Warm risograph cream at the base
];

export function RisographGrainWave({
  className = "",
  showGrain = true,
  speed = 0.14,
  noise = 0.42,
  softness = 0.7,
  intensity = 0.6,
  scale = 0.8,
  offsetY = 0.3,
  offsetX = -0.15,
}: RisographGrainWaveProps) {
  const [mounted, setMounted] = useState(false);
  const [maxPixels, setMaxPixels] = useState(1920 * 1080 * 1.5);
  const [shaderLoaded, setShaderLoaded] = useState(false);
  const filterId = useId();

  useEffect(() => {
    setMounted(true);

    const updateMaxPixels = () => {
      if (typeof window !== "undefined") {
        const w = window.innerWidth || 1920;
        const h = window.innerHeight || 1080;
        // Dynamic cap at 1.5x DPR: innerWidth * innerHeight * 2.25
        setMaxPixels(Math.round(w * h * 2.25));
      }
    };

    updateMaxPixels();

    // Mark shader loaded to dismiss fallback
    const timer = setTimeout(() => setShaderLoaded(true), 250);

    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateMaxPixels, 150);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none bg-[#180505] ${className}`}
    >
      {/* 1. Fast CSS fallback during SSR / early mount (white tint at bottom) */}
      {!shaderLoaded && (
        <div
          className="absolute inset-0 transition-opacity duration-700 ease-out"
          style={{
            background: `radial-gradient(ellipse at 50% 100%, #FFE9E4 0%, #FF8A6B 20%, #FF5A36 40%, #C23A1C 60%, #6B1408 80%, #180505 100%)`,
          }}
        />
      )}

      {/* 2. WebGL GrainGradient Shader Canvas - Sticks flush to bottom */}
      {mounted && (
        <div className="absolute inset-0 w-full h-full">
          <GrainGradient
            shape="wave"
            colorBack={BASE_COLOR}
            colors={PALETTE_COLORS}
            softness={softness}
            intensity={intensity}
            noise={noise}
            speed={speed}
            scale={scale}
            offsetY={offsetY}
            offsetX={offsetX}
            minPixelRatio={1}
            maxPixelCount={maxPixels}
            className="w-full h-full"
          />
        </div>
      )}

      {/* 3. Subtle Risograph Analog Dither Overlay */}
      {showGrain && (
        <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-25">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <filter id={`grain-${filterId}`}>
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.8"
                numOctaves={3}
                stitchTiles="stitch"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter={`url(#grain-${filterId})`} />
          </svg>
        </div>
      )}
    </div>
  );
}
