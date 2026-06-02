"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger index — multiplies the entrance delay for sequenced items. */
  index?: number;
  /** Entrance direction. */
  direction?: "up" | "left" | "right" | "none";
  as?: "div" | "section" | "li" | "article";
}

const OFFSET = 28;
const BASE_DELAY = 0.06;

/**
 * Scroll-triggered entrance wrapper. Animates once when the element enters the
 * viewport, and collapses to a near no-op when the user prefers reduced motion.
 */
export function Reveal({ children, className, index = 0, direction = "up", as = "div" }: RevealProps) {
  const reduce = useReducedMotion();

  const hidden = (() => {
    if (reduce || direction === "none") return { opacity: 0 };
    if (direction === "left") return { opacity: 0, x: OFFSET };
    if (direction === "right") return { opacity: 0, x: -OFFSET };
    return { opacity: 0, y: OFFSET };
  })();

  const variants: Variants = {
    hidden,
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: reduce ? 0.2 : 0.6,
        delay: reduce ? 0 : index * BASE_DELAY,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25, margin: "0px 0px -10% 0px" }}
    >
      {children}
    </MotionTag>
  );
}
