"use client";
import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { AppIcon } from "@/components/AppIcon";

// ─── أنواع ───────────────────────────────────────────────────────────────────
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

// ─── إعدادات كل نوع ──────────────────────────────────────────────────────────
const CONFIGS: Record<ToastType, { icon: string; color: string; bg: string; border: string; progress: string }> = {
  success: {
    icon: "✓",
    color: "#065F46",
    bg: "rgba(209,250,229,0.95)",
    border: "#6EE7B7",
    progress: "#10B981",
  },
  error: {
    icon: "✕",
    color: "#991B1B",
    bg: "rgba(254,226,226,0.95)",
    border: "#FCA5A5",
    progress: "#EF4444",
  },
  warning: {
    icon: "⚠",
    color: "#92400E",
    bg: "rgba(254,243,199,0.95)",
    border: "#FDE68A",
    progress: "#F59E0B",
  },
  info: {
    icon: "ℹ",
    color: "#1E40AF",
    bg: "rgba(219,234,254,0.95)",
    border: "#93C5FD",
    progress: "#3B82F6",
  },
};

// ─── Toast Item ───────────────────────────────────────────────────────────────
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const cfg = CONFIGS[toast.type];
  const duration = toast.duration ?? 3500;
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Slide in
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

  return (
    <div
      onClick={handleClose}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "flex-start",
        gap: ".7rem",
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        borderRadius: "14px",
        padding: ".85rem 1rem .85rem .9rem",
        marginBottom: ".6rem",
        cursor: "pointer",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        fontFamily: "var(--font-ui)",
        direction: "rtl",
        minWidth: "280px",
        maxWidth: "360px",
        overflow: "hidden",
        transform: visible ? "translateX(0) scale(1)" : "translateX(60px) scale(0.95)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
      }}
    >
      {/* أيقونة */}
      <div style={{
        width: "28px", height: "28px", borderRadius: "8px",
        background: cfg.progress, color: "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: ".85rem", fontWeight: 900, flexShrink: 0,
      }}>
        <AppIcon token={cfg.icon} size={14} className="text-white" />
      </div>

      {/* النص */}
      <div style={{ flex: 1, paddingTop: "3px" }}>
        <div style={{ fontSize: ".82rem", fontWeight: 700, color: cfg.color, lineHeight: 1.4 }}>
          {toast.message}
        </div>
      </div>

      {/* زر الإغلاق */}
      <div style={{
        color: cfg.color, opacity: 0.5, fontSize: ".75rem",
        paddingTop: "2px", flexShrink: 0,
      }}><AppIcon token="✕" size={12} /></div>

      {/* شريط التقدم */}
      <div style={{
        position: "absolute", bottom: 0, right: 0, left: 0,
        height: "3px", background: "rgba(0,0,0,0.06)",
      }}>
        <div style={{
          height: "100%", background: cfg.progress,
          width: `${progress}%`,
          transition: "width 0.1s linear",
          borderRadius: "0 0 0 14px",
        }} />
      </div>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback((message: string, type: ToastType, duration?: number) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev.slice(-4), { id, message, type, duration }]);
  }, []);

  const value: ToastContextValue = {
    success: (msg, d) => add(msg, "success", d),
    error:   (msg, d) => add(msg, "error",   d),
    warning: (msg, d) => add(msg, "warning", d),
    info:    (msg, d) => add(msg, "info",    d),
  };

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
      {/* حاوية الإشعارات */}
      <div style={{
        position: "fixed",
        top: "1.2rem",
        left: "1.2rem",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        pointerEvents: "none",
      }}>
        <div style={{ pointerEvents: "auto" }}>
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onRemove={remove} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
