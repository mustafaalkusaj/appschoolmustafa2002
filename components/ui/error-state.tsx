"use client";

import * as React from "react";
import { cn } from "@/lib/brand/brand-utils";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

// ── Error Icon ─────────────────────────────────────────────────────────────────

function ErrorIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.3"
      />
      <path
        d="M24 14v12"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle
        cx="24"
        cy="32"
        r="2"
        fill="currentColor"
      />
    </svg>
  );
}

// ── ErrorState Component ──────────────────────────────────────────────────────

export const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    {
      title = "Something went wrong",
      description = "An error occurred while loading this content. Please try again.",
      onRetry,
      retryLabel = "Try again",
      className,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center",
          "text-center",
          "p-8 py-12",
          "min-h-[200px]",
          className
        )}
      >
        {/* Error Icon */}
        <div className="text-[var(--danger)] mb-4">
          <ErrorIcon />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-4">
            {description}
          </p>
        )}

        {/* Retry Button */}
        {onRetry && (
          <div className="mt-2">
            <Button variant="outline" onClick={onRetry}>
              {retryLabel}
            </Button>
          </div>
        )}
      </div>
    );
  }
);

ErrorState.displayName = "ErrorState";
