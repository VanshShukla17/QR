"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { AnimatedIconProps } from "./types";

export function AnimatedSparklesIcon({
  size = 14,
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
      animate={
        isTriggered
          ? { rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] }
          : { rotate: 0, scale: 1 }
      }
      transition={{ duration: 0.5, ease: "easeInOut" }}
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
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        <path d="M5 3v4" />
        <path d="M19 17v4" />
        <path d="M3 5h4" />
        <path d="M17 19h4" />
      </svg>
    </motion.div>
  );
}
