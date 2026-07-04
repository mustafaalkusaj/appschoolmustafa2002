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

const EASE = [0.16, 1, 0.3, 1] as const;

// ── 3D mouse parallax wrapper ───────────────────────────────────────────────

export function MouseParallax3D({
  children,
  className,
  strength = 12,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 80, damping: 18 });
  const sry = useSpring(ry, { stiffness: 80, damping: 18 });

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const px = e.clientX / w - 0.5;
      const py = e.clientY / h - 0.5;
      rx.set(-py * strength);
      ry.set(px * strength);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [reduce, rx, ry, strength]);

  return (
    <motion.div
      ref={ref}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 1200 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Split text (char-by-char reveal) ────────────────────────────────────────

export function SplitText({
  text,
  className,
  delay = 0,
  stagger = 0.04,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  const chars = Array.from(text);

  if (reduce) return <span className={className}>{text}</span>;

  return (
    <span className={className} aria-label={text}>
      {chars.map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: delay + i * stagger, ease: EASE }}
          style={{ display: "inline-block", whiteSpace: ch === " " ? "pre" : "normal" }}
          aria-hidden="true"
        >
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

// ── Typewriter ──────────────────────────────────────────────────────────────

export function Typewriter({
  text,
  className,
  speed = 50,
}: {
  text: string;
  className?: string;
  speed?: number;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? text : "");

  useEffect(() => {
    if (reduce) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    const settle = setTimeout(() => setShown(text), speed * text.length + 400);
    return () => {
      clearInterval(id);
      clearTimeout(settle);
    };
  }, [text, speed, reduce]);

  return <span className={className}>{shown}</span>;
}

// ── Auto carousel ───────────────────────────────────────────────────────────

export function AutoCarousel<T>({
  items,
  interval = 4000,
  renderItem,
  className,
  dotsClassName,
}: {
  items: T[];
  interval?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  dotsClassName?: string;
}) {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || items.length <= 1) return;
    const id = setInterval(() => setIndex((p) => (p + 1) % items.length), interval);
    return () => clearInterval(id);
  }, [items.length, interval, reduce]);

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -12 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          {renderItem(items[index], index)}
        </motion.div>
      </AnimatePresence>
      <div className={dotsClassName ?? "mt-6 flex justify-center gap-2"}>
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Slide ${i + 1}`}
            className={[
              "h-2 rounded-full transition-all duration-300",
              i === index ? "w-8 bg-[var(--primary)]" : "w-2 bg-[var(--border-strong)] hover:bg-[var(--primary)]/60",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}

// ── Progress ring ───────────────────────────────────────────────────────────

export function ProgressRing({
  value,
  size = 96,
  stroke = 8,
  label,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
}) {
  const [v, setV] = useState(0);
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;

  useEffect(() => {
    if (reduce) {
      setV(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 1400;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, 150);
    const settle = setTimeout(() => setV(value), dur + 300);
    return () => {
      clearTimeout(timer);
      clearTimeout(settle);
      cancelAnimationFrame(raf);
    };
  }, [value, reduce]);

  return (
    <div className={className} style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 60ms linear" }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--secondary)" />
          </linearGradient>
        </defs>
      </svg>
      <div
        style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
      >
        <div className="text-lg font-black text-[var(--text-primary)]" dir="ltr">
          {Math.round(v)}%
        </div>
        {label ? <div className="text-[10px] font-bold text-[var(--text-tertiary)]">{label}</div> : null}
      </div>
    </div>
  );
}

// ── Flip on view ────────────────────────────────────────────────────────────

export function FlipOnView({
  back,
  front,
  className,
  index = 0,
}: {
  back: React.ReactNode;
  front: React.ReactNode;
  className?: string;
  index?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { rotateY: 180, opacity: 0 }}
      whileInView={{ rotateY: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: EASE }}
      style={{ transformPerspective: 1000, transformStyle: "preserve-3d", position: "relative" }}
    >
      <div style={{ backfaceVisibility: "hidden" }}>{front}</div>
      <div style={{ position: "absolute", inset: 0, transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}>
        {back}
      </div>
    </motion.div>
  );
}

// ── Wavy connector (SVG path drawn on scroll) ───────────────────────────────

export function WavyConnector({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const pathLength = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0, 1]);
  return (
    <div ref={ref} className={className} aria-hidden="true">
      <svg viewBox="0 0 1200 80" className="h-12 w-full" preserveAspectRatio="none">
        <motion.path
          d="M 0 40 C 200 0, 400 80, 600 40 S 1000 0, 1200 40"
          fill="none"
          stroke="url(#wavyGrad)"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ pathLength }}
        />
        <defs>
          <linearGradient id="wavyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--secondary)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ── Ribbon between sections ─────────────────────────────────────────────────

export function Ribbon({ flip = false }: { flip?: boolean }) {
  return (
    <div className="pointer-events-none my-[-3rem] h-24 w-full overflow-hidden" aria-hidden="true">
      <svg viewBox="0 0 1440 80" className="h-full w-full" preserveAspectRatio="none">
        <path
          d={
            flip
              ? "M 0 80 Q 360 0 720 40 T 1440 80 L 1440 80 L 0 80 Z"
              : "M 0 0 Q 360 80 720 40 T 1440 0 L 1440 0 L 0 0 Z"
          }
          fill="url(#ribbonGrad)"
          fillOpacity="0.10"
        />
        <defs>
          <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--secondary)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ── Login card scroll transform ─────────────────────────────────────────────

export function ScrollTransform({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], reduce ? [1, 1, 1] : [1, 1, 0]);
  const rotate = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 6]);
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 0.94]);
  return (
    <motion.div ref={ref} style={{ opacity, rotate, scale }} className={className}>
      {children}
    </motion.div>
  );
}

// ── Magic cursor ────────────────────────────────────────────────────────────

export function MagicCursor() {
  const reduce = useReducedMotion();
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 350, damping: 28 });
  const sy = useSpring(y, { stiffness: 350, damping: 28 });
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reduce) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    setVisible(true);
    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target as Element | null;
      const cta = t?.closest("a, button, [data-cursor='cta']");
      setHovering(Boolean(cta));
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [reduce, x, y]);

  if (!visible) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        x: sx,
        y: sy,
        translateX: "-50%",
        translateY: "-50%",
        pointerEvents: "none",
        zIndex: 90,
        width: hovering ? 44 : 14,
        height: hovering ? 44 : 14,
        borderRadius: "9999px",
        background: hovering ? "color-mix(in srgb, var(--primary) 18%, transparent)" : "var(--primary)",
        border: hovering ? "1.5px solid var(--primary)" : "none",
        transition: "width 200ms ease, height 200ms ease, background 200ms ease",
        mixBlendMode: "multiply",
      }}
    />
  );
}

// ── Constellation canvas ────────────────────────────────────────────────────

export function Constellation({ className, density = 60 }: { className?: string; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const mouse = { x: -9999, y: -9999 };

    const resize = () => {
      const rect = cvs.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      cvs.width = w * dpr;
      cvs.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const N = density;
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
    }));

    const onMouse = (e: MouseEvent) => {
      const r = cvs.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    cvs.addEventListener("mousemove", onMouse);
    cvs.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < 140) {
          p.x += (dx / d) * 0.6;
          p.y += (dy / d) * 0.6;
        }
      }
      ctx.fillStyle = "rgba(79,140,255,0.55)";
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i];
          const b = pts[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < 120) {
            ctx.strokeStyle = `rgba(79,140,255,${0.18 * (1 - d / 120)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      cvs.removeEventListener("mousemove", onMouse);
      cvs.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", resize);
    };
  }, [reduce, density]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

// ── Mockup autoplay cursor ──────────────────────────────────────────────────

interface MockupCursorStep {
  x: number;
  y: number;
  click?: boolean;
}

export function MockupCursor({ steps }: { steps: MockupCursorStep[] }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    if (reduce || steps.length === 0) return;
    const id = setInterval(() => {
      setI((p) => (p + 1) % steps.length);
    }, 1800);
    return () => clearInterval(id);
  }, [steps.length, reduce]);

  useEffect(() => {
    if (steps[i]?.click) {
      setClicked(true);
      const t = setTimeout(() => setClicked(false), 350);
      return () => clearTimeout(t);
    }
  }, [i, steps]);

  if (steps.length === 0) return null;
  const cur = steps[i];

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute z-10"
      animate={{ left: `${cur.x}%`, top: `${cur.y}%` }}
      transition={{ duration: 1.2, ease: EASE }}
    >
      <div className="relative">
        <svg width="22" height="22" viewBox="0 0 24 24" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)]">
          <path d="M3 2 L21 12 L13 13 L11 21 Z" fill="white" stroke="black" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        {clicked ? (
          <motion.div
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute -left-3 -top-3 h-8 w-8 rounded-full border-2 border-[var(--primary)]"
          />
        ) : null}
      </div>
    </motion.div>
  );
}

// ── Smooth lerp anchors (intercepts # clicks) ───────────────────────────────

export function SmoothLerpAnchors() {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const handler = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest('a[href^="#"]');
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href === "#") return;
      const id = href.slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const startY = window.scrollY;
      const endY = target.getBoundingClientRect().top + window.scrollY - 70;
      const dist = endY - startY;
      const dur = Math.min(900, 350 + Math.abs(dist) * 0.4);
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        window.scrollTo(0, startY + dist * eased);
        if (t < 1) requestAnimationFrame(step);
        else if (history.pushState) history.pushState(null, "", href);
      };
      requestAnimationFrame(step);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [reduce]);
  return null;
}

// ── Milestone drawer ────────────────────────────────────────────────────────

export function MilestoneDrawer({
  threshold = 0.4,
  duration = 4500,
  children,
}: {
  threshold?: number;
  duration?: number;
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (shownRef.current) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? window.scrollY / max : 0;
      if (ratio >= threshold) {
        shownRef.current = true;
        setShow(true);
        setTimeout(() => setShow(false), duration);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, duration]);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="fixed bottom-5 start-1/2 z-40 -translate-x-1/2 rtl:translate-x-1/2"
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ── Section accent stripe ───────────────────────────────────────────────────

export function SectionAccent({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden="true"
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.9, ease: EASE }}
      style={{ transformOrigin: "left" }}
      className={
        className ??
        "block h-1 w-full origin-left rounded-full bg-[linear-gradient(90deg,var(--primary),var(--secondary),transparent)]"
      }
    />
  );
}

// ── Floating CTA ────────────────────────────────────────────────────────────

export function FloatingCTA({
  text,
  button,
  href = "#login",
}: {
  text: string;
  button: string;
  href?: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShow(window.scrollY > window.innerHeight * 0.9);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="fixed bottom-5 end-5 z-40 hidden lg:block"
        >
          <a
            href={href}
            className="group inline-flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] py-3 ps-5 pe-2 text-sm font-extrabold shadow-[var(--shadow-lg)]"
          >
            <span className="text-[var(--text-primary)]">{text}</span>
            <span className="inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-4 py-2 text-white shadow-[var(--shadow-primary)] transition-transform group-hover:scale-105">
              {button}
            </span>
          </a>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
