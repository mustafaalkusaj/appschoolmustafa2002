import * as React from "react"
import { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/brand/brand-utils"

interface StatsCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: {
    value: string | number
    label: string
    variant: "success" | "danger" | "neutral"
  }
  variant?: "primary" | "info" | "success" | "warning" | "danger" | "neutral"
  className?: string
}

export function StatsCard({
  label,
  value,
  icon: Icon,
  description,
  trend,
  variant = "primary",
  className,
}: StatsCardProps) {
  const variants = {
    primary: "bg-primary/10 text-primary",
    info: "bg-blue-500/10 text-blue-500",
    success: "bg-emerald-500/10 text-emerald-500",
    warning: "bg-amber-500/10 text-amber-500",
    danger: "bg-rose-500/10 text-rose-500",
    neutral: "bg-slate-500/10 text-slate-500",
  }

  return (
    <Card className={cn("overflow-hidden border-none shadow-md bg-white dark:bg-slate-900/50", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4 rtl:space-x-reverse">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className="flex items-baseline space-x-2 rtl:space-x-reverse">
              <h2 className="text-2xl font-bold tracking-tight">{value}</h2>
              {trend && (
                <span
                  className={cn(
                    "text-xs font-medium",
                    trend.variant === "success" && "text-emerald-500",
                    trend.variant === "danger" && "text-rose-500",
                    trend.variant === "neutral" && "text-slate-500"
                  )}
                >
                  {trend.value} {trend.label}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={cn("rounded-2xl p-3", variants[variant])}>
            <Icon className="h-6 w-6" strokeWidth={2.5} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function KPIGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {children}
    </div>
  )
}
