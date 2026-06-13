import * as React from "react";
import { cn } from "@/lib/brand/brand-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

// ── Chevron Icon ──────────────────────────────────────────────────────────────

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("pointer-events-none", className)}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// ── Select Component ─────────────────────────────────────────────────────────

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, error, disabled, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            // Base styles
            "flex w-full h-[var(--input-height)] rounded-[var(--input-radius)]",
            "border bg-[var(--surface-soft)] appearance-none",
            "px-[0.75rem] pe-[2.5rem]",
            "text-sm text-[var(--text-primary)]",
            // Default border
            "border-[var(--input-border)]",
            // Transitions
            "transition-all duration-150",
            // Focus state
            "focus-visible:outline-none",
            "focus-visible:ring-2",
            "focus-visible:ring-[var(--focus-ring-color)]",
            "focus-visible:ring-offset-2",
            "focus-visible:border-[var(--input-border-focus)]",
            // Hover state
            "hover:border-[var(--border-strong)]",
            // Error state
            error && "border-[var(--input-border-error)] focus-visible:border-[var(--input-border-error)]",
            // Disabled state
            disabled && "opacity-50 cursor-not-allowed",
            // RTL support - chevron on the other side
            "rtl:pe-[0.75rem] rtl:ps-[2.5rem]",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {/* Custom chevron - positioned based on direction */}
        <ChevronIcon
          className={cn(
            "absolute top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]",
            "end-[0.75rem]",
            "rtl:end-auto rtl:start-[0.75rem]",
            "transition-transform duration-150",
            disabled && "opacity-50"
          )}
        />
      </div>
    );
  }
);

Select.displayName = "Select";
