import * as React from "react";
import { cn } from "@/lib/brand/brand-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  error?: boolean;
}

// ── Calendar Icon ─────────────────────────────────────────────────────────────

function CalendarIcon({ className }: { className?: string }) {
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
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

// ── DatePicker Component ─────────────────────────────────────────────────────

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, error, disabled, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          ref={ref}
          type="date"
          disabled={disabled}
          className={cn(
            // Base styles
            "flex w-full h-[var(--input-height)] rounded-[var(--input-radius)]",
            "border bg-[var(--surface-soft)]",
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
            // RTL support - icon on the other side
            "rtl:pe-[0.75rem] rtl:ps-[2.5rem]",
            // Hide default calendar icon in some browsers for custom styling
            "[&::-webkit-calendar-picker-indicator]:hidden",
            "[&::-webkit-calendar-picker-indicator]:appearance-none",
            // Ensure consistent appearance
            "[&::-webkit-date-and-time-value]:text-[var(--text-primary)]",
            className
          )}
          {...props}
        />
        {/* Calendar icon - positioned based on direction */}
        <CalendarIcon
          className={cn(
            "absolute top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]",
            "end-[0.75rem]",
            "rtl:end-auto rtl:start-[0.75rem]",
            disabled && "opacity-50"
          )}
        />
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker";
