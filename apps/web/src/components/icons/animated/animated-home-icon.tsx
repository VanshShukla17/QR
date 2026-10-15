"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { AnimatedIconProps } from "./types";

export function AnimatedHomeIcon({
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
      animate={isTriggered ? { scale: [1, 1.12, 1], y: [0, -1, 0] } : { scale: 1, y: 0 }}
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
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <motion.path
          d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"
          animate={
            isTriggered
              ? { pathLength: [0.2, 1], opacity: [0.4, 1] }
              : { pathLength: 1, opacity: 1 }
          }
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </svg>
    </motion.div>
  );
}
