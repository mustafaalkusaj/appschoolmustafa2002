import * as React from "react";
import { motion, type MotionProps } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/brand/brand-utils";
import { cardVariants } from "@/lib/motion-variants";

const MotionCard = motion(Card);

// ── Types ─────────────────────────────────────────────────────────────────────

export type StatsCardVariant =
  | "primary"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

export type TrendVariant = "success" | "danger" | "neutral";

export interface StatsCardTrend {
  value: string | number;
  label: string;
  variant: TrendVariant;
}

export interface StatsCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, keyof MotionProps>,
    MotionProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: StatsCardTrend;
  variant?: StatsCardVariant;
}

// ── Variant Styles ────────────────────────────────────────────────────────────

const variantStyles: Record<StatsCardVariant, string> = {
  primary:
    "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)] border-[color-mix(in_srgb,var(--primary)_10%,transparent)]",
  info: "bg-[color-mix(in_srgb,var(--info)_10%,transparent)] text-[var(--info)] border-[color-mix(in_srgb,var(--info)_10%,transparent)]",
  success:
    "bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_10%,transparent)]",
  warning:
    "bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_10%,transparent)]",
  danger:
    "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_10%,transparent)]",
  neutral:
    "bg-[color-mix(in_srgb,var(--text-muted)_10%,transparent)] text-[var(--text-muted)] border-[color-mix(in_srgb,var(--text-muted)_10%,transparent)]",
};

const trendStyles: Record<TrendVariant, string> = {
  success:
    "bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]",
  danger:
    "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]",
  neutral:
    "bg-[color-mix(in_srgb,var(--text-muted)_10%,transparent)] text-[var(--text-muted)]",
};

// ── StatsCard Component ──────────────────────────────────────────────────────

export const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  (
    {
      label,
      value,
      icon: Icon,
      description,
      trend,
      variant = "primary",
      className,
      ...props
    },
    ref
  ) => {
    return (
      <MotionCard
        ref={ref}
        className={cn(
          "group relative overflow-hidden",
          "rounded-[var(--card-radius)]",
          "hover:-translate-y-1 transition-transform duration-200",
          className
        )}
        variants={cardVariants}
        whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
        {...props}
      >
        <div className="p-[var(--card-padding)]">
          <div className="flex items-start justify-between gap-4">
            {/* Content Section */}
            <div className="flex-1 min-w-0 space-y-1">
              {/* Label */}
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {label}
              </p>

              {/* Value */}
              <p
                className="text-2xl font-bold text-[var(--text-primary)] tabular-nums whitespace-normal break-words leading-tight"
                dir="auto"
              >
                {value}
              </p>

              {/* Trend */}
              {trend && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-semibold",
                      trendStyles[trend.variant]
                    )}
                  >
                    {trend.value}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {trend.label}
                  </span>
                </div>
              )}

              {/* Description */}
              {description && (
                <p className="text-sm text-[var(--text-secondary)] line-clamp-1">
                  {description}
                </p>
              )}
            </div>

            {/* Icon Container */}
            <div
              className={cn(
                "shrink-0 rounded-[var(--radius-lg)] p-3 border",
                "transition-transform duration-200 group-hover:scale-110",
                variantStyles[variant]
              )}
            >
              <Icon className="h-7 w-7" strokeWidth={2.5} />
            </div>
          </div>

          {/* Subtle Decorative Gradient */}
          <div
            className="absolute -bottom-6 -end-6 h-24 w-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: `linear-gradient(to bottom right, color-mix(in_srgb, var(--primary) 5%, transparent), transparent)`,
            }}
          />
        </div>
      </MotionCard>
    );
  }
);

StatsCard.displayName = "StatsCard";

// ── KPIGrid Component ─────────────────────────────────────────────────────────

export interface KPIGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const KPIGrid = React.forwardRef<HTMLDivElement, KPIGridProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

KPIGrid.displayName = "KPIGrid";
