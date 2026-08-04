"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, ArrowLeft } from "@/lib/icons";
import {
  slideDownVariants,
  containerVariants,
  itemVariants,
  usePrefersReducedMotion,
  getVariants,
} from "@/lib/motion-variants";
import {
  fetchJsonWithAuthorizedSession,
  fetchWithAuthorizedSession,
  withJsonHeaders,
} from "@/lib/authorized-api";
import { deduplicatedFetch } from "@/lib/request-cache";
import { formatDate } from "@/lib/formatting";
import { getSupabase } from "@/lib/supabase";
import { cn } from "@/lib/brand/brand-utils";
import type { NotificationCategory, NotificationPriority } from "@/lib/notifications/types";

interface NotificationItem {
  id: string;
  notificationId: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
}

interface Props {
  userId: string;
  schoolId: string;
  locale: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  general: "🔔",
  exams: "📝",
  homework: "📚",
  holiday: "🎉",
  financial: "💳",
  activity: "⚽",
};

const PRIORITY_DOT: Record<string, string> = {
  normal: "var(--text-muted)",
  important: "var(--warning)",
  urgent: "var(--danger)",
};

export function NotificationBell({ userId, schoolId, locale }: Props) {
  const reduced = usePrefersReducedMotion();
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isRTL = locale === "ar";

  // تحميل العدد الأولي
  const loadUnread = useCallback(async () => {
    try {
      // BranchDashboardExperience fetches the same count on mount, so the bell
      // and the dashboard each issued their own request on every load. Share
      // one through deduplicatedFetch, keyed on the URL both of them build.
      // fetchJsonWithAuthorizedSession is used here rather than the raw-Response
      // helper on purpose: it hands back already-parsed JSON, so two callers
      // awaiting the same promise cannot fight over a single consumable body.
      const url = `/api/web/notifications/insite/unread?schoolId=${schoolId}`;
      const { payload } = await deduplicatedFetch(url, () =>
        fetchJsonWithAuthorizedSession<{ ok: boolean; count: number }>(url),
      );
      if (payload?.ok) setUnreadCount(payload.count ?? 0);
    } catch {
      // silent
    }
  }, [schoolId]);

  // تحميل آخر 5 إشعارات للـ dropdown
  const loadRecentItems = useCallback(async () => {
    try {
      const res = await fetchWithAuthorizedSession(
        `/api/web/notifications/insite?schoolId=${schoolId}&pageSize=5`,
      );
      const data = await res.json().catch(() => null);
      if (data?.ok) setItems(data.items ?? []);
    } catch {
      // silent
    }
  }, [schoolId]);

  // Supabase Realtime — يُحدّث العداد فوراً عند وصول إشعار جديد
  useEffect(() => {
    void loadUnread();

    const supabase = getSupabase();
    const channel = supabase
      .channel(`notif-bell-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notification_recipients",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setUnreadCount((prev) => prev + 1);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, loadUnread]);

  // تحميل الإشعارات عند فتح الـ dropdown
  useEffect(() => {
    if (open) {
      void loadRecentItems();
    }
  }, [open, loadRecentItems]);

  // إغلاق عند الضغط خارج الـ dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await fetchWithAuthorizedSession("/api/web/notifications/insite/mark-read", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({ all: true, schoolId }),
      });
      setUnreadCount(0);
      setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    } finally {
      setMarkingAll(false);
    }
  }

  const displayCount = unreadCount > 99 ? "99+" : unreadCount;

  const unreadItems = items.filter((i) => !i.isRead);
  const readItems = items.filter((i) => i.isRead);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* زر الجرس */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-[var(--button-radius)] transition-all",
          "bg-[var(--surface-muted)] text-[var(--text-secondary)]",
          "hover:bg-[var(--surface-hover)] hover:text-[var(--primary)]",
          open && "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]",
        )}
        aria-label={locale === "ar" ? "الإشعارات" : "Notifications"}
      >
        <motion.div
          key={unreadCount}
          animate={!reduced && unreadCount > 0 ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          <Bell size={18} />
        </motion.div>

        {/* Badge with ping animation */}
        {unreadCount > 0 && (
          <>
            {/* Ping ring */}
            <span
              className="absolute -top-1 -end-1 flex h-4 min-w-4 rounded-full animate-ping"
              style={{
                background: "var(--danger)",
                opacity: 0.5,
              }}
            />
            {/* Solid badge */}
            <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[9px] font-bold text-white leading-none">
              {displayCount}
            </span>
          </>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            variants={getVariants(reduced, slideDownVariants)}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "absolute top-12 z-[var(--z-dropdown)] w-80 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] shadow-xl",
              isRTL ? "start-0" : "end-0",
            )}
            style={{ backdropFilter: "blur(4px)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-[var(--primary)]" />
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  {locale === "ar" ? "الإشعارات" : "Notifications"}
                </span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[var(--danger)] text-white text-[9px] font-bold">
                    {displayCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  disabled={markingAll}
                  className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline font-medium disabled:opacity-50"
                >
                  <CheckCheck size={13} />
                  {locale === "ar" ? "قراءة الكل" : "Mark all read"}
                </button>
              )}
            </div>

            {/* القائمة */}
            <div className="max-h-72 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-[var(--text-muted)]">
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <Bell size={28} className="opacity-30" />
                  </motion.div>
                  <p className="text-xs font-medium">
                    {locale === "ar" ? "لا توجد إشعارات" : "No notifications"}
                  </p>
                </div>
              ) : (
                <motion.div
                  variants={getVariants(reduced, containerVariants(0.06))}
                  initial="hidden"
                  animate="visible"
                >
                  {/* Unread group */}
                  {unreadItems.length > 0 && (
                    <>
                      <div className="px-4 py-1.5 bg-[var(--surface-soft)] border-b border-[var(--border)]">
                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                          {locale === "ar" ? "غير مقروءة" : "Unread"}
                        </p>
                      </div>
                      {unreadItems.map((item) => (
                        <motion.div key={item.id} variants={getVariants(reduced, itemVariants)}>
                          <NotificationRow item={item} />
                        </motion.div>
                      ))}
                    </>
                  )}

                  {/* Separator */}
                  {unreadItems.length > 0 && readItems.length > 0 && (
                    <div className="px-4 py-1.5 bg-[var(--surface-soft)] border-b border-[var(--border)]">
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        {locale === "ar" ? "مقروءة" : "Read"}
                      </p>
                    </div>
                  )}

                  {/* Read group */}
                  {readItems.map((item) => (
                    <motion.div key={item.id} variants={getVariants(reduced, itemVariants)}>
                      <NotificationRow item={item} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-[var(--border)]">
              <Link
                href={`/${locale}/notifications`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 text-xs text-[var(--primary)] font-semibold hover:underline"
              >
                {locale === "ar" ? "عرض كل الإشعارات" : "View all notifications"}
                <ArrowLeft size={12} className={isRTL ? "rotate-180" : ""} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const emoji = item.category ? (CATEGORY_EMOJI[item.category] ?? "🔔") : "🔔";
  const priorityColor = item.priority ? (PRIORITY_DOT[item.priority] ?? "var(--text-muted)") : undefined;

  return (
    <div
      className={cn(
        "relative px-4 py-3 border-b border-[var(--border)] last:border-0 transition-colors",
        !item.isRead
          ? "bg-[color-mix(in_srgb,var(--primary)_3%,transparent)]"
          : "hover:bg-[var(--surface-hover)]",
      )}
    >
      {/* Unread left bar */}
      {!item.isRead && (
        <span className="absolute top-0 start-0 w-0.5 h-full bg-[var(--primary)] rounded-full" />
      )}

      <div className="flex items-start gap-2">
        {/* Category emoji */}
        <span className="text-sm flex-shrink-0 mt-0.5">{emoji}</span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            {/* Priority dot */}
            {priorityColor && item.priority !== "normal" && (
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: priorityColor }}
              />
            )}
            <p
              className={cn(
                "text-xs font-semibold leading-snug line-clamp-1",
                !item.isRead ? "text-[var(--primary)]" : "text-[var(--text-primary)]",
              )}
            >
              {item.title}
            </p>
          </div>
          <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
            {item.body}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            {item.createdAt ? formatDate(item.createdAt) : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
