"use client";

import { useTranslations } from "next-intl";
import { Bell, RefreshCw, Info } from "@/lib/icons";
import { formatDate } from "@/lib/formatting";
import { DashboardNotification } from "./types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { cn } from "@/lib/brand/brand-utils";

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2 rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
              <Bell size={18} />
            </div>
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -end-1 w-3 h-3 bg-[var(--danger)] border-2 border-[var(--card-bg)] rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <CardTitle>{t("title")}</CardTitle>
            {unreadNotifications > 0 && (
              <p className="text-[10px] font-bold text-[var(--danger)] uppercase tracking-wider mt-0.5">
                {t("unread", { count: unreadNotifications })}
              </p>
            )}
          </div>
        </div>
        
        {notificationsEnabled && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => void onRefresh()}
            disabled={notificationsLoading}
            className="gap-2"
          >
            <RefreshCw size={12} className={cn(notificationsLoading && "animate-spin")} />
            {t("refresh")}
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {!notificationsEnabled ? (
          <EmptyState
            icon={<Info size={24} />}
            title={t("disabled")}
          />
        ) : error && notifications.length === 0 ? (
          <ErrorState
            title={dashboardT("errors.notificationsTitle")}
            description={dashboardT("errors.notificationsDescription")}
            onRetry={() => void onRefresh()}
            retryLabel={commonT("retry")}
            className="min-h-[220px] px-0 py-8"
          />
        ) : notificationsLoading && notifications.length === 0 ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                <div className="mb-2 h-3 w-1/2 rounded-full bg-[var(--surface-muted)]" />
                <div className="h-2 w-4/5 rounded-full bg-[var(--surface-muted)]" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Bell size={24} />}
            title={t("empty")}
          />
        ) : (
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {notifications.map((item) => (
              <button
                key={item.id}
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
