"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { AnimatedIconProps } from "./types";

export function AnimatedUserIcon({
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
        {/* Head circle with gentle spring lift */}
        <motion.circle
          cx="12"
          cy="7"
          r="4"
          animate={
            isTriggered ? { y: [0, -2, 0], scale: [1, 1.12, 1] } : { y: 0, scale: 1 }
          }
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ originX: "12px", originY: "7px" }}
        />

        {/* Shoulders path */}
        <motion.path
          d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
          animate={
            isTriggered
              ? { pathLength: [0.8, 1], opacity: [0.7, 1] }
              : { pathLength: 1, opacity: 1 }
          }
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </svg>
    </motion.div>
  );
}
