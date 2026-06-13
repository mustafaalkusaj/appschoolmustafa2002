"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/brand/brand-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type DrawerSide = "start" | "end";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  width?: string;
  side?: DrawerSide;
  closeOnBackdrop?: boolean;
  children: React.ReactNode;
  className?: string;
}

interface DrawerHeaderProps {
  title: string;
  description?: string;
  onClose?: () => void;
  className?: string;
}

interface DrawerBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface DrawerFooterProps {
  children: React.ReactNode;
  className?: string;
}

// ── Drawer Context ────────────────────────────────────────────────────────────

const DrawerContext = React.createContext<{
  onClose: () => void;
  titleId: string;
} | null>(null);

function useDrawerContext() {
  const ctx = React.useContext(DrawerContext);
  if (!ctx) {
    throw new Error("Drawer components must be used within a Drawer");
  }
  return ctx;
}

// ── Focus Trap Hook ───────────────────────────────────────────────────────────

function useFocusTrap(open: boolean, containerRef: React.RefObject<HTMLDivElement | null>) {
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const timer = setTimeout(() => {
      if (containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        if (firstElement) {
          firstElement.focus();
        }
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [open, containerRef]);
}

// ── Reduced Motion Check ──────────────────────────────────────────────────────

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
}

// ── Drawer Component ──────────────────────────────────────────────────────────

export function Drawer({
  open,
  onClose,
  width,
  side = "end",
  closeOnBackdrop = true,
  children,
  className,
}: DrawerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const titleId = React.useId();

  // Handle mounting for portal
  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle visibility animation
  React.useEffect(() => {
    if (open) {
      setIsVisible(true);
    }
  }, [open]);

  // Focus trap
  useFocusTrap(open, containerRef);

  // Handle Escape key
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  if (!mounted || !open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleTransitionEnd = () => {
    if (!open) {
      setIsVisible(false);
    }
  };

  // Position styles based on side
  const positionStyles = side === "end" 
    ? "inset-inline-end-0 border-s border-[var(--card-border)]" 
    : "inset-inline-start-0 border-e border-[var(--card-border)]";

  // Animation transform
  const slideTransform = side === "end" 
    ? "translateX(100%)" 
    : "translateX(-100%)";

  // RTL-safe transform (the CSS logical properties handle this, but for animation we need to consider)
  const animationStyles = prefersReducedMotion
    ? { transform: "translateX(0)" }
    : {
        transform: isVisible ? "translateX(0)" : slideTransform,
        transition: "transform 200ms ease-out",
      };

  return createPortal(
    <DrawerContext.Provider value={{ onClose, titleId }}>
      {/* Backdrop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={handleBackdropClick}
        className={cn(
          "fixed inset-0 z-[var(--z-modal)]",
          "bg-[var(--modal-backdrop)]",
          "backdrop-blur-sm",
          // Fade animation
          !prefersReducedMotion && "transition-opacity duration-200",
          isVisible ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Panel */}
        <div
          ref={containerRef}
          onTransitionEnd={handleTransitionEnd}
          className={cn(
            "fixed inset-y-0",
            positionStyles,
            "flex flex-col",
            "w-[var(--drawer-width)]",
            "max-w-[85vw]",
            "bg-[var(--card-bg)]",
            "shadow-xl",
            "focus:outline-none",
            className
          )}
          style={{ ...animationStyles, width: width || undefined }}
        >
          {children}
        </div>
      </div>
    </DrawerContext.Provider>,
    document.body
  );
}

// ── DrawerHeader Component ────────────────────────────────────────────────────

export function DrawerHeader({ title, description, onClose, className }: DrawerHeaderProps) {
  const context = useDrawerContext();
  const handleClose = onClose || context.onClose;

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3",
        "p-[var(--modal-padding)]",
        "border-b border-[var(--card-border)]",
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <h2 id={context.titleId} className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={handleClose}
        className={cn(
          "shrink-0",
          "w-8 h-8",
          "flex items-center justify-center",
          "rounded-[var(--radius-sm)]",
          "border border-[var(--border)]",
          "bg-[var(--surface-soft)]",
          "text-[var(--text-secondary)]",
          "hover:bg-[var(--surface-hover)]",
          "hover:text-[var(--text-primary)]",
          "transition-colors duration-150",
          "focus-visible:outline-none",
          "focus-visible:ring-2",
          "focus-visible:ring-[var(--focus-ring-color)]"
        )}
        aria-label="Close"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M1 1L13 13M1 13L13 1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

// ── DrawerBody Component ──────────────────────────────────────────────────────

export const DrawerBody = React.forwardRef<HTMLDivElement, DrawerBodyProps>(
  ({ children, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex-1",
          "p-[var(--modal-padding)]",
          "overflow-y-auto",
          className
        )}
      >
        {children}
      </div>
    );
  }
);

DrawerBody.displayName = "DrawerBody";

// ── DrawerFooter Component ────────────────────────────────────────────────────

export function DrawerFooter({ children, className }: DrawerFooterProps) {
  return (
    <div
      className={cn(
        "p-[var(--modal-padding)]",
        "flex items-center justify-end gap-3",
        "border-t border-[var(--card-border)]",
        className
      )}
    >
      {children}
    </div>
  );
}
