"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { AnimatedIconProps } from "./types";

export function AnimatedHistoryIcon({
  size = 18,
  className = "",
  isActive = false,
  isHovered = false,
  strokeWidth = 2,
  id,
}: AnimatedIconProps) {
  const shouldReduceMotion = useReducedMotion();
  const [internalHover, setInternalHover] = useState(false);
  const isTriggered = !shouldReduceMotion && (isActive || isHovered || internalHover);

  return (
    <motion.div
      id={id}
      className="inline-flex items-center justify-center select-none"
      onMouseEnter={() => setInternalHover(true)}
      onMouseLeave={() => setInternalHover(false)}
      animate={isTriggered ? { scale: [1, 1.1, 1] } : { scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        {/* Outer counter-clockwise circular arrow */}
        <motion.g
          animate={isTriggered ? { rotate: [0, -30, 0] } : { rotate: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          style={{ originX: "12px", originY: "12px" }}
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </motion.g>

        {/* Hour Hand (vertical at 12) */}
        <motion.line
          x1="12"
          y1="12"
          x2="12"
          y2="7"
          animate={isTriggered ? { rotate: [0, -360] } : { rotate: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          style={{ originX: "12px", originY: "12px" }}
        />

        {/* Minute Hand (angled at ~14) */}
        <motion.line
          x1="12"
          y1="12"
          x2="16"
          y2="14"
          animate={isTriggered ? { rotate: [0, -180] } : { rotate: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          style={{ originX: "12px", originY: "12px" }}
        />
      </svg>
    </motion.div>
  );
}
