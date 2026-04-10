import * as React from "react";
import { cn } from "@/lib/brand/brand-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
}

// ── Input Component ──────────────────────────────────────────────────────────

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, success, disabled, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        disabled={disabled}
        className={cn(
          // Base styles
          "flex w-full h-[var(--input-height)] rounded-[var(--input-radius)]",
          "border bg-[var(--surface-soft)]",
          "px-[0.75rem] py-[1rem]",
          "text-sm text-[var(--text-primary)]",
          "placeholder:text-[var(--text-tertiary)]",
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
          // Success state
          success && "border-[var(--input-border-success)] focus-visible:border-[var(--input-border-success)]",
          // Disabled state
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
