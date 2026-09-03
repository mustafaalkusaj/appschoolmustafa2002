"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { TeacherShell } from "@/components/TeacherShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  is_read: boolean;
}

function timeAgo(dateStr: string, isAr: boolean): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return isAr ? "الآن" : "now";
  if (diffMin < 60) return isAr ? `${diffMin} د` : `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return isAr ? `${diffHr} س` : `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return isAr ? `${diffDay} ي` : `${diffDay}d`;
  const diffMonth = Math.floor(diffDay / 30);
  return isAr ? `${diffMonth} ش` : `${diffMonth}mo`;
}

export default function TeacherNotificationsPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/teacher/notifications")
      .then((res) => {
        if (res.response.ok) {
          setNotifications(
            ((res.payload as { data: Notification[] })?.data ?? []),
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );

    try {
      await fetchJsonWithAuthorizedSession(`/api/teacher/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true }),
      });
    } catch {
      // Optimistic update stays; silent on network failure
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <TeacherShell
      currentPath="/teacher/notifications"
      titleAr="الاشعارات"
      titleEn="Notifications"
      subtitleAr={unreadCount > 0 ? `${unreadCount} غير مقروء` : undefined}
      subtitleEn={unreadCount > 0 ? `${unreadCount} unread` : undefined}
    >
      <div className="space-y-3 max-w-3xl mx-auto">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse"
              />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={
              <Bell className="h-12 w-12 text-[var(--text-tertiary)]" />
            }
            title={t("لا توجد اشعارات", "No notifications")}
            description={t(
              "ليس لديك اي اشعارات حالياً",
              "You don't have any notifications right now",
            )}
          />
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.is_read) markAsRead(n.id);
                }}
                className={`w-full text-start p-4 rounded-[var(--card-radius)] border transition-colors ${
                  n.is_read
                    ? "border-[var(--card-border)] bg-[var(--card-bg)] opacity-70"
                    : "border-[var(--primary)]/30 bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-xs sm:text-sm ${
                          n.is_read
                            ? "font-medium text-[var(--text-primary)]"
                            : "font-semibold text-[var(--text-primary)]"
                        }`}
                      >
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <span className="shrink-0 h-2 w-2 rounded-full bg-[var(--primary)]" />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                        {n.body}
                      </p>
                    )}
                    <p className="text-xs text-[var(--text-muted)] mt-1.5">
                      {timeAgo(n.created_at, isAr)}
                    </p>
                  </div>
                  {n.is_read && (
                    <CheckCheck className="h-4 w-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </TeacherShell>
  );
}
