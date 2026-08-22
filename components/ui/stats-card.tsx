"use client";

import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/brand/brand-utils";
import type { LucideIcon } from "lucide-react";

const VARIANT_STYLES: Record<string, { bg: string; color: string }> = {
  primary: { bg: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)" },
  info: { bg: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)" },
  success: { bg: "color-mix(in srgb, var(--success) 10%, transparent)", color: "var(--success)" },
  warning: { bg: "color-mix(in srgb, var(--warning) 10%, transparent)", color: "var(--warning)" },
  danger: { bg: "color-mix(in srgb, var(--danger) 10%, transparent)", color: "var(--danger)" },
  neutral: { bg: "var(--surface-soft)", color: "var(--text-secondary)" },
};

export function StatsCard({
  label,
  value,
  icon: Icon,
  description,
  variant = "info",
  variants,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  variant?: string;
  variants?: Variants;
}) {
  const style = VARIANT_STYLES[variant] ?? VARIANT_STYLES.info;
  const Wrapper = variants ? motion.div : "div";
  const wrapperProps = variants ? { variants } : {};
  return (
    <Wrapper
      {...(wrapperProps as Record<string, unknown>)}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: style.bg }}
        >
          <Icon className="h-5 w-5" style={{ color: style.color }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-[var(--text-muted)]">{label}</p>
          <p className="text-xl font-bold tabular-nums text-[var(--text-primary)]">{value}</p>
        </div>
      </div>
      {description && (
        <p className="mt-2 text-xs text-[var(--text-muted)]">{description}</p>
      )}
    </Wrapper>
  );
}

export function KPIGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {children}
    </div>
  );
}
