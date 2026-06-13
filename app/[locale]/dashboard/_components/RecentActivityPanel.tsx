"use client";

import { useTranslations } from "next-intl";
import { TrendingUp, MessageSquare, ClipboardList, Bell, ChevronLeft, ChevronRight, AlertTriangle } from "@/lib/icons";
import { formatDateTime } from "@/lib/formatting";
import { cn } from "@/lib/brand/brand-utils";
import Link from "next/link";
import { localizeAppPath } from "@/lib/locale-routing";
import { motion } from "framer-motion";
import { containerVariants, itemVariants, usePrefersReducedMotion, getVariants } from "@/lib/motion-variants";

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
  const reduced = usePrefersReducedMotion();

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <h3 className="flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
          <div className="h-7 w-7 rounded-xl bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[var(--warning)] flex items-center justify-center">
            <TrendingUp size={14} />
          </div>
          {t("title")}
        </h3>
        <Link
          href={localizeAppPath("/monitoring", locale)}
          className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline"
        >
          {t("viewAll")}
          {locale === "en" ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </Link>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
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
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-[var(--danger)]/10 text-[var(--danger)] flex items-center justify-center">
              <AlertTriangle size={22} />
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">{dashboardT("errors.activityTitle")}</p>
            <p className="text-xs text-[var(--text-muted)]">{dashboardT("errors.activityDescription")}</p>
            {onRetry && (
              <button onClick={onRetry} className="inline-flex items-center h-8 px-3 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition-colors">
                {commonT("retry")}
              </button>
            )}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-[var(--surface-soft)] text-[var(--text-muted)] flex items-center justify-center">
              <ClipboardList size={22} />
            </div>
            <p className="text-sm font-semibold text-[var(--text-muted)]">{t("empty")}</p>
          </div>
        ) : (
          <motion.div className="space-y-2" variants={getVariants(reduced, containerVariants(0.07))} initial="hidden" animate="visible">
            {activities.map((item) => (
              <motion.div
                key={item.id}
                variants={getVariants(reduced, itemVariants)}
                className="group flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] hover:border-[var(--primary)]/30 transition-colors"
              >
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                  activityStyles[item.type].bg,
                  activityStyles[item.type].text
                )}>
                  {item.type === "message" ? <MessageSquare size={16} /> : item.type === "homework" ? <ClipboardList size={16} /> : <Bell size={16} />}
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
                    {item.teacherName && <span className="truncate">{item.teacherName}</span>}
                    {item.teacherName && item.status && <span>•</span>}
                    {item.status && (
                      <span className={cn(
                        "inline-flex items-center h-4 px-1.5 rounded-full text-[10px] font-bold",
                        item.status === "active"
                          ? "bg-[var(--success)]/10 text-[var(--success)]"
                          : "bg-[var(--warning)]/10 text-[var(--warning)]"
                      )}>
                        {item.status === "active" ? t("status.active") : t("status.updated")}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
