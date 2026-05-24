// lib/motion-variants.ts
"use client";

import { Variants, Transition } from "framer-motion";
import { useEffect, useState } from "react";

// ── Transitions ────────────────────────────────────────────────────────────────

export const spring: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 28,
};

export const springBouncy: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 20,
};

export const ease200: Transition = { duration: 0.2, ease: "easeOut" };
export const ease150: Transition = { duration: 0.15, ease: "easeOut" };

// ── Item Variants (for stagger children) ─────────────────────────────────────

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { ...spring } },
  exit: { opacity: 0, y: -8, transition: ease150 },
};

export const itemVariantsX: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { ...spring } },
  exit: { opacity: 0, x: 12, transition: ease150 },
};

// ── Container Variants (stagger) ───────────────────────────────────────────────

export function containerVariants(staggerMs = 0.05): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerMs,
        delayChildren: 0.05,
      },
    },
  };
}

// ── Card Variants ─────────────────────────────────────────────────────────────

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { ...spring } },
};

// ── Fade Variants ─────────────────────────────────────────────────────────────

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: ease200 },
  exit: { opacity: 0, transition: ease150 },
};

// ── Scale Pop (for badges, avatars, icons) ─────────────────────────────────────

export const scalePopVariants: Variants = {
  hidden: { opacity: 0, scale: 0.75 },
  visible: { opacity: 1, scale: 1, transition: { ...springBouncy } },
  exit: { opacity: 0, scale: 0.75, transition: ease150 },
};

// ── Shake (for errors) ─────────────────────────────────────────────────────────

export const shakeVariants: Variants = {
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.4 },
  },
  idle: { x: 0 },
};

// ── Slide Down (for dropdowns) ─────────────────────────────────────────────────

export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { ...spring } },
  exit: { opacity: 0, y: -8, scale: 0.97, transition: ease150 },
};

// ── Reduced Motion helper ──────────────────────────────────────────────────────

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return reduced;
}

// ── No-op variants for reduced motion ─────────────────────────────────────────

export const noMotionVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
  exit: { opacity: 1 },
};

export function getVariants<T extends Variants>(reduced: boolean, variants: T): T | typeof noMotionVariants {
  return reduced ? noMotionVariants : variants;
}
