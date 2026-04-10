import * as React from "react";
import { cn } from "@/lib/brand/brand-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

// "default" is kept for backward compatibility (maps to "primary")
type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive" | "subtle" | "link" | "default";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconOnly?: boolean;
}

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  "aria-label": string;
}

// ── Variant Styles ─────────────────────────────────────────────────────────────

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    "bg-[var(--primary)] text-white",
    "hover:brightness-110 hover:shadow-[var(--shadow-primary)]",
  ].join(" "),
  // "default" is an alias for "primary" (backward compatibility)
  default: [
    "bg-[var(--primary)] text-white",
    "hover:brightness-110 hover:shadow-[var(--shadow-primary)]",
  ].join(" "),
  secondary: [
    "bg-[var(--surface-muted)] text-[var(--text-primary)]",
    "hover:brightness-95",
  ].join(" "),
  outline: [
    "border border-[var(--border-strong)] bg-transparent text-[var(--text-primary)]",
    "hover:bg-[var(--surface-muted)]",
  ].join(" "),
  ghost: [
    "bg-transparent text-[var(--text-primary)]",
    "hover:bg-[var(--surface-muted)]",
  ].join(" "),
  destructive: [
    "bg-[var(--danger)] text-white",
    "hover:brightness-110",
  ].join(" "),
  subtle: [
    "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]",
    "hover:bg-[color-mix(in_srgb,var(--primary)_20%,transparent)]",
  ].join(" "),
  link: [
    "bg-transparent text-[var(--primary)] underline-offset-4",
    "hover:underline",
  ].join(" "),
};

// ── Size Styles ───────────────────────────────────────────────────────────────

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-[var(--button-height-sm)] px-[0.75rem] text-sm",
  md: "h-[var(--button-height-md)] px-[1rem] text-sm",
  lg: "h-[var(--button-height-lg)] px-[1.15rem] text-base",
};

const iconButtonSizeStyles: Record<ButtonSize, string> = {
  sm: "w-[var(--button-height-sm)] h-[var(--button-height-sm)]",
  md: "w-[var(--button-height-md)] h-[var(--button-height-md)]",
  lg: "w-[var(--button-height-lg)] h-[var(--button-height-lg)]",
};

// ── Spinner Component ─────────────────────────────────────────────────────────

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 2.042.767 3.904 2.029 5.323l2.97-2.032z"
      />
    </svg>
  );
}

// ── Button Component ──────────────────────────────────────────────────────────

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      iconOnly = false,
      type = "button",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          // Base styles
          "inline-flex items-center justify-center gap-2",
          "font-semibold",
          "rounded-[var(--button-radius)]",
          "transition-all duration-150",
          // Focus ring
          "focus-visible:outline-none",
          "focus-visible:ring-2",
          "focus-visible:ring-[var(--focus-ring-color)]",
          "focus-visible:ring-offset-[var(--focus-ring-offset)]",
          // Active state
          "active:scale-[0.97]",
          // Disabled state
          "disabled:opacity-50 disabled:pointer-events-none",
          // Variant & size
          variantStyles[variant],
          iconOnly ? iconButtonSizeStyles[size] : sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading && <Spinner className="h-4 w-4 shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

// ── IconButton Component ──────────────────────────────────────────────────────

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = "ghost",
      size = "md",
      loading = false,
      type = "button",
      disabled,
      children,
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-label={ariaLabel}
        className={cn(
          // Base styles
          "inline-flex items-center justify-center",
          "font-semibold",
          "rounded-[var(--button-radius)]",
          "transition-all duration-150",
          // Focus ring
          "focus-visible:outline-none",
          "focus-visible:ring-2",
          "focus-visible:ring-[var(--focus-ring-color)]",
          "focus-visible:ring-offset-[var(--focus-ring-offset)]",
          // Active state
          "active:scale-[0.97]",
          // Disabled state
          "disabled:opacity-50 disabled:pointer-events-none",
          // Variant & size (always square)
          variantStyles[variant],
          iconButtonSizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? <Spinner className="h-4 w-4" /> : children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

// ── Backward Compatibility Aliases ────────────────────────────────────────────

// Map old variant names to new ones for backward compatibility
// "default" → "primary", "outline" → "outline", "secondary" → "secondary"
// Consumers can continue using the old variant names if they update imports
