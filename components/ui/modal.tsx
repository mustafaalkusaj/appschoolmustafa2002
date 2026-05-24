"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/brand/brand-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  children: React.ReactNode;
  className?: string;
}

interface ModalHeaderProps {
  title: string;
  description?: string;
  onClose?: () => void;
  className?: string;
}

interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

// ── Size Styles ───────────────────────────────────────────────────────────────

const sizeStyles: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-4xl",
};

// ── Modal Context for Focus Management ────────────────────────────────────────

const ModalContext = React.createContext<{
  onClose: () => void;
  titleId: string;
} | null>(null);

function useModalContext() {
  const ctx = React.useContext(ModalContext);
  if (!ctx) {
    throw new Error("Modal components must be used within a Modal");
  }
  return ctx;
}

// ── Focus Trap Hook ───────────────────────────────────────────────────────────

function useFocusTrap(open: boolean, containerRef: React.RefObject<HTMLDivElement | null>) {
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    // Store the previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus the first focusable element in the modal
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
      // Restore focus when modal closes
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

// ── Modal Component ───────────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  size = "md",
  closeOnBackdrop = true,
  children,
  className,
}: ModalProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const titleId = React.useId();

  // Handle mounting for portal
  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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

  if (!mounted) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  const springTransition = { type: "spring" as const, stiffness: 380, damping: 28 };

  return createPortal(
    <ModalContext.Provider value={{ onClose, titleId }}>
      <AnimatePresence>
        {open && (
          /* Backdrop */
          <motion.div
            key="modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={handleBackdropClick}
            className={cn(
              "fixed inset-0 z-[var(--z-modal)]",
              "flex items-center justify-center p-4",
              "bg-[var(--modal-backdrop)] backdrop-blur-sm"
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Panel */}
            <motion.div
              ref={containerRef}
              className={cn(
                "w-full",
                sizeStyles[size],
                "bg-[var(--card-bg)]",
                "rounded-[var(--modal-radius)]",
                "border border-[var(--card-border)]",
                "shadow-xl",
                "focus:outline-none",
                className
              )}
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={springTransition}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalContext.Provider>,
    document.body
  );
}

// ── ModalHeader Component ─────────────────────────────────────────────────────

export function ModalHeader({ title, description, onClose, className }: ModalHeaderProps) {
  const context = useModalContext();
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

// ── ModalBody Component ───────────────────────────────────────────────────────

export const ModalBody = React.forwardRef<HTMLDivElement, ModalBodyProps>(
  ({ children, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "p-[var(--modal-padding)]",
          "overflow-y-auto",
          "max-h-[calc(100vh-200px)]",
          className
        )}
      >
        {children}
      </div>
    );
  }
);

ModalBody.displayName = "ModalBody";

// ── ModalFooter Component ─────────────────────────────────────────────────────

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        "p-[var(--modal-padding)] pt-0",
        "flex items-center justify-end gap-3",
        "border-t border-[var(--card-border)]",
        "mt-auto",
        className
      )}
    >
      {children}
    </div>
  );
}
