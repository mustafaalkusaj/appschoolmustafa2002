"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import type { LucideIcon } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

// ── Scroll progress bar (fixed, top) ────────────────────────────────────────

export function ScrollProgress({ rtl }: { rtl?: boolean }) {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-[linear-gradient(90deg,var(--primary),var(--secondary))]"
      style={{ scaleX: scrollYProgress, transformOrigin: rtl ? "right" : "left" }}
    />
  );
}

// ── Animated number counter ──────────────────────────────────────────────────

interface CounterProps {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function Counter({ to, decimals = 0, prefix = "", suffix = "", className }: CounterProps) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (reduce) {
      setValue(to);
      return;
    }
    let raf = 0;
    const duration = 1400;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(to * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, 150);
    // Fallback: land the final value even if rAF is paused (hidden tab).
    const settle = setTimeout(() => setValue(to), duration + 300);
    return () => {
      clearTimeout(timer);
      clearTimeout(settle);
      cancelAnimationFrame(raf);
    };
  }, [to, reduce]);

  return (
    <span className={className}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

// ── Infinite marquee strip ───────────────────────────────────────────────────

export function Marquee({ items }: { items: string[] }) {
  const reduce = useReducedMotion();
  const row = [...items, ...items];
  return (
    <div className="relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
      <div
        className="flex shrink-0 items-center gap-4 pe-4"
        style={reduce ? undefined : { animation: "landingMarquee 28s linear infinite" }}
      >
        {row.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-5 py-2.5 text-sm font-bold text-[var(--text-secondary)] shadow-[var(--shadow-xs)]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Chart bar that grows on view (scaleY, compositor-friendly) ───────────────

export function AnimatedBar({ height, index }: { height: number; index: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="flex-1 rounded-t-md bg-[linear-gradient(180deg,var(--secondary),var(--primary))]"
      style={{ height: `${height}%`, transformOrigin: "bottom" }}
      initial={reduce ? { scaleY: 1 } : { scaleY: 0 }}
      whileInView={{ scaleY: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.7, delay: index * 0.06, ease: EASE }}
    />
  );
}

// ── Floating chip (reveal + gentle infinite float) ───────────────────────────

interface FloatingChipProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  amplitude?: number;
}

export function FloatingChip({ children, className, delay = 0, amplitude = 10 }: FloatingChipProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={
        reduce
          ? { opacity: 1, scale: 1, y: 0 }
          : { opacity: 1, scale: 1, y: [0, -amplitude, 0] }
      }
      transition={
        reduce
          ? { duration: 0.3 }
          : {
              opacity: { duration: 0.5, delay },
              scale: { duration: 0.5, delay, ease: EASE },
              y: { duration: 5, delay, repeat: Infinity, ease: "easeInOut" },
            }
      }
    >
      {children}
    </motion.div>
  );
}

// ── Scroll parallax wrapper ──────────────────────────────────────────────────

export function Parallax({
  children,
  speed = 40,
  className,
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [speed, -speed]);
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

// ── Magnetic wrapper (pulls child toward the cursor) ─────────────────────────

export function Magnetic({
  children,
  className,
  strength = 0.35,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16 });
  const sy = useSpring(y, { stiffness: 220, damping: 16 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── 3D tilt-on-hover card ────────────────────────────────────────────────────

export function TiltCard({
  children,
  className,
  max = 7,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 18 });
  const sry = useSpring(ry, { stiffness: 200, damping: 18 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    rx.set(-py * max);
    ry.set(px * max);
  };
  const reset = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Cursor spotlight overlay (attaches to parent element) ────────────────────

export function Spotlight({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    const target = el?.closest("section");
    if (!el || !target) return;
    const onMove = (e: MouseEvent) => {
      const r = target.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
      el.style.opacity = "1";
    };
    const onLeave = () => {
      el.style.opacity = "0";
    };
    target.addEventListener("mousemove", onMove);
    target.addEventListener("mouseleave", onLeave);
    return () => {
      target.removeEventListener("mousemove", onMove);
      target.removeEventListener("mouseleave", onLeave);
    };
  }, [reduce]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={className}
      style={{
        background:
          "radial-gradient(320px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--primary) 16%, transparent), transparent 70%)",
        opacity: 0,
        transition: "opacity 0.3s ease",
      }}
    />
  );
}

// ── Side section dots (scroll spy) ───────────────────────────────────────────

export function SectionDots({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const mid = window.scrollY + window.innerHeight / 2;
      let idx = 0;
      sections.forEach((s, i) => {
        const el = document.getElementById(s.id);
        if (el && el.offsetTop <= mid) idx = i;
      });
      setActive(idx);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  return (
    <nav className="fixed top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-3 end-5 xl:flex">
      {sections.map((s, i) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          aria-label={s.label}
          aria-current={active === i}
          className={[
            "block rounded-full transition-all duration-300",
            active === i
              ? "h-6 w-2.5 bg-[var(--primary)]"
              : "h-2.5 w-2.5 bg-[var(--border-strong)] hover:bg-[var(--primary)]",
          ].join(" ")}
        />
      ))}
    </nav>
  );
}

// ── Intro overlay (brand reveal, once per session) ──────────────────────────

export function IntroOverlay({ brandName, logoUrl }: { brandName: string; logoUrl: string }) {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (reduce) return;
    try {
      if (sessionStorage.getItem("landingIntroSeen")) return;
      sessionStorage.setItem("landingIntroSeen", "1");
    } catch {
      // ignore storage errors
    }
    setShow(true);
    const t = setTimeout(() => setShow(false), 1300);
    return () => clearTimeout(t);
  }, [reduce]);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[80] grid place-items-center bg-[var(--background)]"
        >
          <motion.div
            initial={{ scale: 0.82, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="flex flex-col items-center gap-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={brandName}
              width={84}
              height={84}
              className="h-20 w-20 rounded-[24px] shadow-[var(--shadow-lg)] ring-1 ring-[var(--border)]"
            />
            <span className="text-xl font-black tracking-tight text-[var(--text-primary)]">{brandName}</span>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ── Live activity feed (auto-rotating) ──────────────────────────────────────

interface ActivityEvent {
  icon: LucideIcon;
  text: string;
  value: string;
}

export function LiveActivity({
  label,
  events,
  className,
}: {
  label: string;
  events: ActivityEvent[];
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (events.length <= 1) return;
    const timer = setInterval(() => setIndex((p) => (p + 1) % events.length), 2600);
    return () => clearInterval(timer);
  }, [events.length]);

  const event = events[index];
  const Icon = event.icon;

  return (
    <div className={className}>
      <div className="mb-3 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-[var(--text-tertiary)]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
        </span>
        {label}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
            <Icon size={18} />
          </span>
          <span className="flex-1 text-sm font-bold text-[var(--text-primary)]">{event.text}</span>
          <span className="text-sm font-black text-[var(--primary)]" dir="ltr">
            {event.value}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
