import * as React from "react";
import { cn } from "@/lib/brand/brand-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  success?: boolean;
}

// ── Textarea Component ───────────────────────────────────────────────────────

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, success, disabled, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={cn(
          // Base styles
          "flex w-full min-h-[120px] rounded-[var(--input-radius)]",
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
          // Resize
          "resize-y",
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

Textarea.displayName = "Textarea";
