import * as React from "react";
import { cn } from "@/lib/brand/brand-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "md";
  className?: string;
  id?: string;
  name?: string;
}

// ── Size Styles ───────────────────────────────────────────────────────────────

const trackSizeStyles = {
  sm: "w-9 h-5", // 36px x 20px
  md: "w-11 h-6", // 44px x 24px
};

const thumbSizeStyles = {
  sm: "w-4 h-4", // 16px
  md: "w-5 h-5", // 20px
};

const thumbTranslateStyles = {
  sm: "translate-x-4 rtl:translate-x-[-1rem]",
  md: "translate-x-5 rtl:translate-x-[-1.25rem]",
};

// ── Switch Component ──────────────────────────────────────────────────────────

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      checked = false,
      onChange,
      disabled = false,
      label,
      size = "md",
      id,
      name,
    },
    ref
  ) => {
    const autoId = React.useId();
    const generatedId = id || name || autoId;

    const handleClick = () => {
      if (!disabled && onChange) {
        onChange(!checked);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    };

    return (
      <div className="flex items-center gap-2">
        {/* Hidden input for form submission */}
        {name && (
          <input
            type="checkbox"
            name={name}
            checked={checked}
            onChange={() => {}}
            className="sr-only"
            tabIndex={-1}
          />
        )}
        {/* Track button */}
        <button
          ref={ref}
          type="button"
          role="switch"
          id={generatedId}
          aria-checked={checked}
          disabled={disabled}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={cn(
            // Base styles
            "relative inline-flex items-center shrink-0",
            "rounded-full",
            "transition-all duration-150",
            // Track size
            trackSizeStyles[size],
            // Track colors
            checked
              ? "bg-[var(--primary)]"
              : "bg-[var(--border-strong)]",
            // Focus-visible ring
            "focus-visible:outline-none",
            "focus-visible:ring-2",
            "focus-visible:ring-[var(--focus-ring-color)]",
            "focus-visible:ring-offset-2",
            // Disabled state
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        >
          {/* Thumb */}
          <span
            className={cn(
              // Base thumb styles
              "pointer-events-none inline-block rounded-full",
              "bg-white shadow-sm",
              "transition-transform duration-150",
              // Thumb size
              thumbSizeStyles[size],
              // Thumb position
              checked
                ? thumbTranslateStyles[size]
                : "translate-x-0.5 rtl:translate-x-[-0.125rem]",
              // Margin for spacing
              "mx-0.5"
            )}
          />
        </button>
        {/* Label */}
        {label && (
          <label
            htmlFor={generatedId}
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

Switch.displayName = "Switch";
