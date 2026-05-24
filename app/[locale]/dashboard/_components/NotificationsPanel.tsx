"use client";

import { useTranslations } from "next-intl";
import { Bell, RefreshCw, Info, AlertTriangle } from "@/lib/icons";
import { formatDate } from "@/lib/formatting";
import { DashboardNotification } from "./types";
import { cn } from "@/lib/brand/brand-utils";
import { motion } from "framer-motion";
import { containerVariants, itemVariants, usePrefersReducedMotion, getVariants } from "@/lib/motion-variants";

interface NotificationsPanelProps {
  notifications: DashboardNotification[];
  notificationsEnabled: boolean;
  notificationsLoading: boolean;
  error?: string | null;
  unreadNotifications: number;
  onRefresh: () => Promise<void>;
  onMarkAsRead: (id: string) => Promise<void>;
}

export function NotificationsPanel({
  notifications,
  notificationsEnabled,
  notificationsLoading,
  error,
  unreadNotifications,
  onRefresh,
  onMarkAsRead,
}: NotificationsPanelProps) {
  const t = useTranslations("dashboard.notifications");
  const dashboardT = useTranslations("dashboard");
  const commonT = useTranslations("common");
  const reduced = usePrefersReducedMotion();

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="h-7 w-7 rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)] flex items-center justify-center">
              <Bell size={14} />
            </div>
            {unreadNotifications > 0 && (
              <span className="absolute -top-0.5 -end-0.5 w-2.5 h-2.5 bg-[var(--danger)] border-2 border-[var(--card-bg)] rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-black text-[var(--text-primary)]">{t("title")}</h3>
            {unreadNotifications > 0 && (
              <p className="text-[10px] font-bold text-[var(--danger)] uppercase tracking-wider">
                <motion.span animate={!reduced ? { scale: [1, 1.15, 1] } : {}} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}>
                  {t("unread", { count: unreadNotifications })}
                </motion.span>
              </p>
            )}
          </div>
        </div>

        {notificationsEnabled && (
          <button
            onClick={() => void onRefresh()}
            disabled={notificationsLoading}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={cn(notificationsLoading && "animate-spin")} />
            {t("refresh")}
          </button>
        )}
      </div>

      <div className="p-4">
        {!notificationsEnabled ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-[var(--surface-soft)] text-[var(--text-muted)] flex items-center justify-center">
              <Info size={22} />
            </div>
            <p className="text-sm font-semibold text-[var(--text-muted)]">{t("disabled")}</p>
          </div>
        ) : error && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-[var(--danger)]/10 text-[var(--danger)] flex items-center justify-center">
              <AlertTriangle size={22} />
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">{dashboardT("errors.notificationsTitle")}</p>
            <p className="text-xs text-[var(--text-muted)]">{dashboardT("errors.notificationsDescription")}</p>
            <button onClick={() => void onRefresh()} className="inline-flex items-center h-8 px-3 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition-colors">
              {commonT("retry")}
            </button>
          </div>
        ) : notificationsLoading && notifications.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                <div className="mb-2 h-3 w-1/2 rounded-full bg-[var(--surface-muted)]" />
                <div className="h-2 w-4/5 rounded-full bg-[var(--surface-muted)]" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-[var(--surface-soft)] text-[var(--text-muted)] flex items-center justify-center">
              <Bell size={22} />
            </div>
            <p className="text-sm font-semibold text-[var(--text-muted)]">{t("empty")}</p>
          </div>
        ) : (
          <motion.div className="space-y-2 max-h-[360px] overflow-y-auto" variants={getVariants(reduced, containerVariants(0.07))} initial="hidden" animate="visible">
            {notifications.map((item) => (
              <motion.div key={item.id} variants={getVariants(reduced, itemVariants)}>
              <button
                type="button"
                onClick={() => void onMarkAsRead(item.id)}
                className={cn(
                  "w-full text-start p-3 rounded-xl border transition-colors group relative overflow-hidden",
                  item.is_read
                    ? "bg-[var(--card-bg)] border-[var(--border)] opacity-70 hover:opacity-100"
                    : "bg-[color-mix(in_srgb,var(--primary)_3%,transparent)] border-[var(--primary)]/20 hover:bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]"
                )}
              >
                {!item.is_read && (
                  <div className="absolute top-0 end-0 w-1 h-full bg-[var(--primary)]" />
                )}
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-sm font-semibold",
                    !item.is_read ? "text-[var(--primary)]" : "text-[var(--text-primary)]"
                  )}>
                    {item.title || t("defaultTitle")}
                  </span>
                  <span className="text-[10px] font-bold text-[var(--text-muted)]">
                    {item.created_at ? formatDate(item.created_at) : "—"}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2">
                  {item.message || t("noDetails")}
                </p>
              </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
