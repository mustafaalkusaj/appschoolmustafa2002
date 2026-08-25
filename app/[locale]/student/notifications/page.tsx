"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  Star,
  BookOpen,
  AlertCircle,
  Megaphone,
  ExternalLink,
  CreditCard,
  CalendarDays,
  MessageSquare,
} from "lucide-react";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface NotificationItem {
  id: string;
  source: "announcement" | "notification";
  type: string;
  title: string;
  body: string | null;
  link_url: string | null;
  author_name: string | null;
  status: string | null;
  created_at: string;
}

const ICON_MAP: Record<string, typeof Bell> = {
  announcement: Megaphone,
  behavior: Star,
  grade: BookOpen,
  grades: BookOpen,
  payment: CreditCard,
  attendance: CalendarDays,
  message: MessageSquare,
  alert: AlertCircle,
  general: Bell,
};

function getIcon(type: string) {
  return ICON_MAP[type] ?? Bell;
}

function getIconColor(type: string): string {
  switch (type) {
    case "behavior":
      return "var(--warning)";
    case "grade":
    case "grades":
      return "var(--success)";
    case "alert":
      return "var(--danger)";
    case "payment":
      return "var(--primary)";
    default:
      return "var(--text-muted)";
  }
}

function timeAgo(dateStr: string, isAr: boolean): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return isAr ? "الآن" : "just now";

  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  const weeks = Math.floor(days / 7);

  if (minutes < 1) return isAr ? "الآن" : "just now";
  if (minutes < 60)
    return isAr ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
  if (hours < 24) return isAr ? `منذ ${hours} ساعة` : `${hours}h ago`;
  if (days < 7) return isAr ? `منذ ${days} يوم` : `${days}d ago`;
  return isAr ? `منذ ${weeks} أسبوع` : `${weeks}w ago`;
}

export default function StudentNotificationsPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/student/notifications")
      .then((res) => {
        if (res.response.ok)
          setNotifications((res.payload as any)?.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <StudentShell
      currentPath="/student/notifications"
      titleAr="إشعاراتي"
      titleEn="My Notifications"
    >
      <div className="space-y-3 sm:space-y-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-[80px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse"
              />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={
              <Bell className="h-12 w-12 text-[var(--text-tertiary)]" />
            }
            title={t("لا توجد إشعارات", "No notifications")}
          />
        ) : (
          notifications.map((n) => {
            const Icon = getIcon(n.type);
            const iconColor = getIconColor(n.type);

            return (
              <Card key={`${n.source}-${n.id}`}>
                <CardContent className="p-2.5 sm:p-3">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div
                      className="shrink-0 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${iconColor} 12%, transparent)`,
                      }}
                    >
                      <Icon
                        className="h-4 w-4 sm:h-5 sm:w-5"
                        style={{ color: iconColor }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] line-clamp-1">
                          {n.title}
                        </h3>
                        <span className="text-[10px] sm:text-xs text-[var(--text-muted)] shrink-0 pt-0.5">
                          {timeAgo(n.created_at, isAr)}
                        </span>
                      </div>

                      {n.body && (
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1.5">
                        {n.author_name && (
                          <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">
                            {n.author_name}
                          </span>
                        )}
                        {n.link_url && (
                          <a
                            href={n.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium text-[var(--primary)] hover:underline"
                          >
                            {t("عرض", "View")}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </StudentShell>
  );
}
