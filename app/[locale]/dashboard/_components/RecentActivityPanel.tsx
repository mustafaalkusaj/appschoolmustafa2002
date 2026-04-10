"use client";

import { useTranslations } from "next-intl";
import { TrendingUp, MessageSquare, ClipboardList, Bell, ChevronLeft, ChevronRight } from "@/lib/icons";
import { formatDateTime } from "@/lib/formatting";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/brand/brand-utils";
import Link from "next/link";
import { localizeAppPath } from "@/lib/locale-routing";

interface ActivityItem {
  id: string;
  type: "message" | "homework" | "alert";
  title: string;
  teacherName?: string;
  createdAt: string;
  status?: string;
}

interface RecentActivityPanelProps {
  activities: ActivityItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  locale: string;
}

const activityStyles = {
  message: {
    bg: "bg-[color-mix(in_srgb,var(--info)_10%,transparent)]",
    text: "text-[var(--info)]",
  },
  homework: {
    bg: "bg-[color-mix(in_srgb,var(--success)_10%,transparent)]",
    text: "text-[var(--success)]",
  },
  alert: {
    bg: "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]",
    text: "text-[var(--danger)]",
  },
};

export function RecentActivityPanel({ activities, loading, error, onRetry, locale }: RecentActivityPanelProps) {
  const t = useTranslations("dashboard.activity");
  const dashboardT = useTranslations("dashboard");
  const commonT = useTranslations("common");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[var(--warning)]">
            <TrendingUp size={18} />
          </div>
          <CardTitle>{t("title")}</CardTitle>
        </div>
        <Link href={localizeAppPath("/monitoring", locale)}>
          <Button variant="ghost" size="sm" className="gap-2">
            {t("viewAll")}
            {locale === "en" ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </Button>
        </Link>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[var(--surface-muted)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 rounded-full bg-[var(--surface-muted)]" />
                    <div className="h-2 w-2/3 rounded-full bg-[var(--surface-muted)]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title={dashboardT("errors.activityTitle")}
            description={dashboardT("errors.activityDescription")}
            onRetry={onRetry}
            retryLabel={commonT("retry")}
            className="min-h-[220px] px-0 py-8"
          />
        ) : activities.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={32} />}
            title={t("empty")}
          />
        ) : (
          <div className="space-y-3">
            {activities.map((item) => (
              <div
                key={item.id}
                className="group flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] hover:border-[var(--primary)]/30 transition-colors"
              >
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                  activityStyles[item.type].bg,
                  activityStyles[item.type].text
                )}>
                  {item.type === "message" ? <MessageSquare size={18} /> : item.type === "homework" ? <ClipboardList size={18} /> : <Bell size={18} />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--primary)] transition-colors">
                      {item.title}
                    </h4>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] shrink-0">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    {item.teacherName && (
                      <span className="truncate">{item.teacherName}</span>
                    )}
                    {item.teacherName && item.status && <span>•</span>}
                    {item.status && (
                      <Badge variant={item.status === "active" ? "success" : "warning"} size="sm">
                        {item.status === "active" ? t("status.active") : t("status.updated")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
