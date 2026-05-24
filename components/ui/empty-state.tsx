"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/brand/brand-utils";
import { springBouncy } from "@/lib/motion-variants";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

// ── Default Empty Icon ────────────────────────────────────────────────────────

function DefaultEmptyIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4zm0 36c-8.822 0-16-7.178-16-16S15.178 8 24 8s16 7.178 16 16-7.178 16-16 16z"
        fill="currentColor"
        opacity="0.3"
      />
      <path
        d="M24 18c-3.308 0-6 2.692-6 6s2.692 6 6 6 6-2.692 6-6-2.692-6-6-6zm0 8c-1.102 0-2-.898-2-2s.898-2 2-2 2 .898 2 2-.898 2-2 2z"
        fill="currentColor"
        opacity="0.5"
      />
    </svg>
  );
}

// ── EmptyState Component ──────────────────────────────────────────────────────

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className }, ref) => {
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
        {/* Icon */}
        <motion.div
          className="text-[var(--text-tertiary)] mb-4"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...springBouncy, delay: 0 }}
        >
          {icon || <DefaultEmptyIcon />}
        </motion.div>

        {/* Title */}
        <motion.h3
          className="text-lg font-semibold text-[var(--text-primary)] mb-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {title}
        </motion.h3>

        {/* Description */}
        {description && (
          <motion.p
            className="text-sm text-[var(--text-secondary)] max-w-sm mb-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.18 }}
          >
            {description}
          </motion.p>
        )}

        {/* Action */}
        {action && (
          <motion.div
            className="mt-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.26 }}
          >
            {action}
          </motion.div>
        )}
      </div>
    );
  }
);

EmptyState.displayName = "EmptyState";
