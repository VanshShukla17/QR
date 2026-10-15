"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { AnimatedIconProps } from "./types";

export function AnimatedQrIcon({
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
      className="inline-flex items-center justify-center select-none relative"
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
        {/* Three corner finder patterns */}
        <motion.rect
          width="5"
          height="5"
          x="3"
          y="3"
          rx="1"
          animate={isTriggered ? { scale: [1, 0.85, 1] } : { scale: 1 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          style={{ originX: "5.5px", originY: "5.5px" }}
        />
        <motion.rect
          width="5"
          height="5"
          x="16"
          y="3"
          rx="1"
          animate={isTriggered ? { scale: [1, 0.85, 1] } : { scale: 1 }}
          transition={{ duration: 0.3, delay: 0.04, ease: "easeInOut" }}
          style={{ originX: "18.5px", originY: "5.5px" }}
        />
        <motion.rect
          width="5"
          height="5"
          x="3"
          y="16"
          rx="1"
          animate={isTriggered ? { scale: [1, 0.85, 1] } : { scale: 1 }}
          transition={{ duration: 0.3, delay: 0.08, ease: "easeInOut" }}
          style={{ originX: "5.5px", originY: "18.5px" }}
        />

        {/* Lucide QR modules */}
        <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
        <path d="M21 21v.01" />
        <path d="M12 7v3a2 2 0 0 1-2 2H7" />
        <path d="M3 12h.01" />
        <path d="M12 3h.01" />
        <path d="M12 16v.01" />
        <path d="M16 12h1" />
        <path d="M21 12v.01" />
        <path d="M12 21v-1" />

        {/* High-tech laser sweep line on trigger */}
        <motion.line
          x1="2"
          x2="22"
          y1="3"
          y2="3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ opacity: 0, y: 0 }}
          animate={
            isTriggered
              ? {
                  opacity: [0, 0.9, 0.9, 0],
                  y: [0, 16, 0],
                }
              : { opacity: 0, y: 0 }
          }
          transition={{ duration: 0.65, ease: "easeInOut" }}
        />
      </svg>
    </motion.div>
  );
}
