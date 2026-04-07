import * as React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, startIcon, endIcon, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-semibold text-[var(--text-primary)]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {startIcon && (
            <span
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
              style={{ insetInlineStart: "0.875rem" }}
            >
              {startIcon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            className={cn(
              "ui-input",
              startIcon && "ps-10",
              endIcon && "pe-10",
              className
            )}
            aria-invalid={Boolean(error)}
            {...props}
          />
          {endIcon && (
            <span
              className="absolute top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
              style={{ insetInlineEnd: "0.875rem" }}
            >
              {endIcon}
            </span>
          )}
        </div>
        {error && (
          <p className="text-xs font-semibold text-[var(--danger)]">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
