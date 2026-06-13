import * as React from "react";
import { cn } from "@/lib/brand/brand-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

// ── Check Icon ────────────────────────────────────────────────────────────────

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("pointer-events-none", className)}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Checkbox Component ───────────────────────────────────────────────────────

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, disabled, checked, ...props }, ref) => {
    const autoId = React.useId();
    const id = props.id || props.name || autoId;

    return (
      <div className="flex items-center gap-2">
        <div className="relative inline-flex items-center">
          {/* Hidden native input */}
          <input
            ref={ref}
            type="checkbox"
            id={id}
            disabled={disabled}
            checked={checked}
            className="sr-only peer"
            {...props}
          />
          {/* Visual checkbox */}
          <span
            className={cn(
              // Base styles
              "flex items-center justify-center",
              "w-5 h-5 rounded-[var(--radius-xs)]",
              "border-2 border-[var(--input-border)]",
              "bg-transparent",
              "transition-all duration-150",
              // Focus-visible ring on visual box
              "peer-focus-visible:outline-none",
              "peer-focus-visible:ring-2",
              "peer-focus-visible:ring-[var(--focus-ring-color)]",
              "peer-focus-visible:ring-offset-2",
              // Checked state
              "peer-checked:bg-[var(--primary)]",
              "peer-checked:border-[var(--primary)]",
              // Disabled state
              disabled && "opacity-50 cursor-not-allowed",
              className
            )}
            aria-hidden="true"
          >
            <CheckIcon className="text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100" />
          </span>
        </div>
        {/* Label */}
        {label && (
          <label
            htmlFor={id}
            className={cn(
              "text-sm text-[var(--text-primary)] cursor-pointer select-none",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
