import * as React from "react";
import { cn } from "@/lib/brand/brand-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BadgeVariant =
  | "primary"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

// ── Variant Styles ────────────────────────────────────────────────────────────

const variantStyles: Record<BadgeVariant, string> = {
  primary:
    "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]",
  info: "bg-[color-mix(in_srgb,var(--info)_10%,transparent)] text-[var(--info)]",
  success:
    "bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]",
  warning:
    "bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[var(--warning)]",
  danger:
    "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]",
  neutral:
    "bg-[color-mix(in_srgb,var(--text-muted)_10%,transparent)] text-[var(--text-muted)]",
};

// ── Size Styles ───────────────────────────────────────────────────────────────

const sizeStyles: Record<BadgeSize, string> = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-0.5",
};

// ── Dot Colors ────────────────────────────────────────────────────────────────

const dotColors: Record<BadgeVariant, string> = {
  primary: "bg-[var(--primary)]",
  info: "bg-[var(--info)]",
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  danger: "bg-[var(--danger)]",
  neutral: "bg-[var(--text-muted)]",
};

// ── Badge Component ───────────────────────────────────────────────────────────

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      dot = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          // Base styles
          "inline-flex items-center gap-1.5",
          "rounded-full",
          "font-semibold",
          // Variant & size
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant])}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";
