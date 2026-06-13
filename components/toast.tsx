"use client";

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/brand/brand-utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  success: (msg: string, duration?: number) => void;
  error:   (msg: string, duration?: number) => void;
  warning: (msg: string, duration?: number) => void;
  info:    (msg: string, duration?: number) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ─── Icon Configs (icons only, colors from CSS custom properties) ────────────

const TOAST_ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

// ─── Toast Item ───────────────────────────────────────────────────────────────

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const duration = toast.duration ?? 3500;
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Slide in animation
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    timeoutRef.current = setTimeout(() => onRemove(toast.id), 320);
  }, [onRemove, toast.id]);

  // Progress bar + auto dismiss
  useEffect(() => {
    const tick = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);
      if (pct > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        handleClose();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [duration, handleClose]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Map toast type to CSS variable token
  const tokenMap: Record<ToastType, string> = {
    success: "--success",
    error: "--danger",
    warning: "--warning",
    info: "--info",
  };

  const token = tokenMap[toast.type];
  const icon = TOAST_ICONS[toast.type];

  return (
    <div
      onClick={handleClose}
      className={cn(
        "relative flex items-start gap-3",
        "p-3.5 pe-4 mb-2.5",
        "min-w-[280px] max-w-[360px]",
        "rounded-[14px]",
        "border border-[var(--border-strong)]",
        "backdrop-blur-xl",
        "cursor-pointer",
        "overflow-hidden",
        "shadow-[var(--shadow-lg)]",
        // Background with token color
        "bg-[var(--card-bg)]",
        // Animation
        "transition-all duration-300",
        visible
          ? "translate-x-0 scale-100 opacity-100"
          : "translate-x-[-60px] scale-95 opacity-0"
      )}
      style={{
        // Dynamic border color based on toast type
        borderColor: `var(${token})`,
        borderWidth: "1.5px",
      }}
    >
      {/* Accent bar on start edge */}
      <div
        className="absolute top-0 start-0 bottom-0 w-1 rounded-s-[14px]"
        style={{ background: `var(${token})` }}
      />

      {/* Icon */}
      <div
        className={cn(
          "shrink-0 w-7 h-7 rounded-lg",
          "flex items-center justify-center",
          "text-white text-sm font-bold"
        )}
        style={{ background: `var(${token})` }}
      >
        <span className="text-xs">{icon}</span>
      </div>

      {/* Message */}
      <div className="flex-1 pt-0.5">
        <p
          className="text-sm font-semibold leading-relaxed"
          style={{ color: `var(${token})` }}
        >
          {toast.message}
        </p>
      </div>

      {/* Close indicator */}
      <div
        className="shrink-0 pt-0.5 opacity-50"
        style={{ color: `var(${token})` }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M1 1L11 11M1 11L11 1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 start-0 end-0 h-1 bg-[var(--border)]">
        <div
          className="h-full rounded-be-[14px] transition-[width] duration-100"
          style={{
            width: `${progress}%`,
            background: `var(${token})`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const lastToastRef = useRef<{ message: string; type: ToastType; at: number } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback((message: string, type: ToastType, duration?: number) => {
    const now = Date.now();
    const lastToast = lastToastRef.current;
    // Deduplicate: skip if same message+type within 1.5s
    if (lastToast && lastToast.message === message && lastToast.type === type && now - lastToast.at < 1500) {
      return;
    }

    lastToastRef.current = { message, type, at: now };
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev.slice(-4), { id, message, type, duration }]);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({
    success: (msg, d) => add(msg, "success", d),
    error:   (msg, d) => add(msg, "error",   d),
    warning: (msg, d) => add(msg, "warning", d),
    info:    (msg, d) => add(msg, "info",    d),
  }), [add]);

  if (!isMounted) {
    return (
      <ToastContext.Provider value={value}>
        {children}
      </ToastContext.Provider>
    );
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div
        className={cn(
          "fixed top-5 start-5 z-[var(--z-toast)]",
          "flex flex-col items-start",
          "pointer-events-none"
        )}
        aria-live="polite"
        aria-label="Notifications"
      >
        <div className="pointer-events-auto">
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onRemove={remove} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
