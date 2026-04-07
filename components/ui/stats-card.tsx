import * as React from "react";
import { type LucideIcon } from "lucide-react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  iconColor?: string;
  iconBg?: string;
  trend?: {
    value: string | number;
    label: string;
    variant: "success" | "danger" | "neutral";
  };
  variant?: "primary" | "info" | "success" | "warning" | "danger" | "neutral";
  className?: string;
}

const variantStyles: Record<string, { bg: string; color: string }> = {
  primary: { bg: "rgba(59, 130, 246, 0.10)", color: "var(--primary)" },
  info: { bg: "rgba(59, 130, 246, 0.10)", color: "var(--info)" },
  success: { bg: "rgba(16, 185, 129, 0.10)", color: "var(--success)" },
  warning: { bg: "rgba(245, 158, 11, 0.10)", color: "var(--warning)" },
  danger: { bg: "rgba(239, 68, 68, 0.10)", color: "var(--danger)" },
  neutral: { bg: "rgba(100, 116, 139, 0.10)", color: "var(--text-secondary)" },
};

export function StatsCard({
  label,
  value,
  icon: Icon,
  description,
  iconColor,
  iconBg,
  trend,
  variant = "primary",
  className,
}: StatsCardProps) {
  const styles = variantStyles[variant] ?? variantStyles.primary;
  const resolvedBg = iconBg ?? styles.bg;
  const resolvedColor = iconColor ?? styles.color;

  return (
    <div className={cn("kpi-card", className)}>
      <div className="flex items-center justify-between">
        <div
          className="kpi-card__icon"
          style={{ background: resolvedBg, color: resolvedColor }}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
        {trend && (
          <span
            className={cn(
              "badge",
              trend.variant === "success" && "badge--success",
              trend.variant === "danger" && "badge--danger",
              trend.variant === "neutral" && "badge--neutral"
            )}
          >
            {trend.value} {trend.label}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <div className="kpi-card__label">{label}</div>
        <div className="kpi-card__value">{value}</div>
        {description && <div className="kpi-card__meta">{description}</div>}
      </div>
    </div>
  );
}

export function KPIGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("kpi-grid", className)}>{children}</div>;
}
