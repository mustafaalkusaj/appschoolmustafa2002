import * as React from "react";
import { cn } from "@/lib/brand/brand-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  disabled?: boolean;
}

// ── Label Component ───────────────────────────────────────────────────────────

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, disabled, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          // Base styles
          "text-sm font-medium",
          "text-[var(--text-primary)]",
          "cursor-pointer",
          "select-none",
          // Disabled state
          disabled && "opacity-70 cursor-not-allowed",
          className
        )}
        {...props}
      />
    );
  }
);

Label.displayName = "Label";
