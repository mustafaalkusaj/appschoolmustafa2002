import * as React from "react";
import { cn } from "@/lib/brand/brand-utils";
import { Label } from "./label";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

// ── FormField Component ───────────────────────────────────────────────────────

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      label,
      htmlFor,
      error,
      helpText,
      required,
      disabled,
      children,
      className,
    },
    ref
  ) => {
    const hasError = Boolean(error);

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-2",
          className
        )}
      >
        {/* Label */}
        {label && (
          <div className="flex items-center gap-1">
            <Label htmlFor={htmlFor} disabled={disabled}>
              {label}
            </Label>
            {required && (
              <span className="text-[var(--danger)] text-sm" aria-hidden="true">
                *
              </span>
            )}
          </div>
        )}

        {/* Input child */}
        {children}

        {/* Help text or Error text */}
        {hasError ? (
          <span
            className="text-xs text-[var(--danger)]"
            role="alert"
            aria-live="polite"
          >
            {error}
          </span>
        ) : helpText ? (
          <span className="text-xs text-[var(--text-tertiary)]">
            {helpText}
          </span>
        ) : null}
      </div>
    );
  }
);

FormField.displayName = "FormField";
