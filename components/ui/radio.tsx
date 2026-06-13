import * as React from "react";
import { cn } from "@/lib/brand/brand-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

// ── Radio Component ───────────────────────────────────────────────────────────

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, disabled, checked, ...props }, ref) => {
    const autoId = React.useId();
    const id = props.id || props.name || autoId;

    return (
      <div className="flex items-center gap-2">
        <div className="relative inline-flex items-center">
          {/* Hidden native input */}
          <input
            ref={ref}
            type="radio"
            id={id}
            disabled={disabled}
            checked={checked}
            className="sr-only peer"
            {...props}
          />
          {/* Visual radio circle */}
          <span
            className={cn(
              // Base styles - circle
              "flex items-center justify-center",
              "w-5 h-5 rounded-full",
              "border-2 border-[var(--input-border)]",
              "bg-transparent",
              "transition-all duration-150",
              // Focus-visible ring on visual circle
              "peer-focus-visible:outline-none",
              "peer-focus-visible:ring-2",
              "peer-focus-visible:ring-[var(--focus-ring-color)]",
              "peer-focus-visible:ring-offset-2",
              // Checked state - border color
              "peer-checked:border-[var(--primary)]",
              // Disabled state
              disabled && "opacity-50 cursor-not-allowed",
              className
            )}
            aria-hidden="true"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--primary)] opacity-0 transition-opacity duration-150 peer-checked:opacity-100" />
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

Radio.displayName = "Radio";
