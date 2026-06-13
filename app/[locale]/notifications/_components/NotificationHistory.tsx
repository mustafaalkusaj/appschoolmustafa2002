"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { History, Search, ChevronLeft, ChevronRight, Users } from "@/lib/icons";
import { fetchWithAuthorizedSession } from "@/lib/authorized-api";
import { formatDate } from "@/lib/formatting";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { cn } from "@/lib/brand/brand-utils";
import type { NotificationListItem, NotificationStatus, NotificationPriority, NotificationCategory } from "@/lib/notifications/types";

interface Props {
  schoolId: string;
  locale: string;
  refreshKey?: number;
}

const CATEGORY_CONFIG: Record<NotificationCategory, { bg: string; text: string; label: string; emoji: string }> = {
  general:   { bg: "color-mix(in srgb, var(--primary) 10%, transparent)",  text: "var(--primary)",  label: "عام",      emoji: "🔔" },
  exams:     { bg: "color-mix(in srgb, var(--danger) 10%, transparent)",   text: "var(--danger)",   label: "امتحانات", emoji: "📝" },
  homework:  { bg: "rgba(37,99,235,0.1)",                                  text: "#2563EB",         label: "واجبات",   emoji: "📚" },
  holiday:   { bg: "color-mix(in srgb, var(--success) 10%, transparent)",  text: "var(--success)",  label: "إجازات",   emoji: "🎉" },
  financial: { bg: "color-mix(in srgb, var(--warning) 10%, transparent)",  text: "var(--warning)",  label: "مالي",     emoji: "💳" },
  activity:  { bg: "rgba(124,58,237,0.1)",                                 text: "#7C3AED",         label: "نشاط",     emoji: "⚽" },
};

const PRIORITY_CONFIG: Record<NotificationPriority, { label: string; color: string; borderColor: string }> = {
  normal:    { label: "عادي",  color: "var(--text-muted)",  borderColor: "var(--border)" },
  important: { label: "مهم",   color: "var(--warning)",     borderColor: "var(--warning)" },
  urgent:    { label: "عاجل",  color: "var(--danger)",      borderColor: "var(--danger)" },
};

const STATUS_CONFIG: Record<NotificationStatus, { bg: string; color: string; label: string }> = {
  sent:   { bg: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)", label: "تم الإرسال" },
  failed: { bg: "color-mix(in srgb, var(--danger) 12%, transparent)",  color: "var(--danger)",  label: "فشل" },
  draft:  { bg: "color-mix(in srgb, var(--warning) 12%, transparent)", color: "var(--warning)", label: "مسودة" },
};

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 flex gap-4">
      <div className="w-1 self-stretch rounded-full bg-[var(--surface-soft)]" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 rounded bg-[var(--surface-soft)]" />
        <div className="h-3 w-64 rounded bg-[var(--surface-soft)]" />
        <div className="flex gap-2 mt-3">
          <div className="h-5 w-16 rounded-full bg-[var(--surface-soft)]" />
          <div className="h-5 w-16 rounded-full bg-[var(--surface-soft)]" />
        </div>
      </div>
      <div className="space-y-1 text-end">
        <div className="h-3 w-20 rounded bg-[var(--surface-soft)]" />
        <div className="h-3 w-10 rounded bg-[var(--surface-soft)]" />
      </div>
    </div>
  );
}

export function NotificationHistory({ schoolId, locale, refreshKey }: Props) {
  const t = useTranslations("notifications.history");
  const commonT = useTranslations("common");

  const [items, setItems] = useState<NotificationListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ view: "history", schoolId, page: String(page), pageSize: String(pageSize) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetchWithAuthorizedSession(`/api/web/notifications/insite?${params.toString()}`);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setItems(data.items ?? []);
        setTotalCount(data.totalCount ?? 0);
      } else {
        setError(data?.error ?? "Error");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, page, debouncedSearch]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)] flex flex-row items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)" }}>
            <History size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">{t("heading")}</h2>
            {totalCount > 0 && <p className="text-xs text-[var(--text-muted)] mt-0.5">{t("total", { count: totalCount })}</p>}
          </div>
        </div>
        <div className="relative">
          <Search size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-[var(--text-muted)]" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="ps-8 pe-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--success)]/30 focus:border-[var(--success)] w-52 transition"
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && items.length === 0 ? (
          <ErrorState title={t("errorTitle")} description={t("errorDesc")} onRetry={() => void load()} retryLabel={commonT("retry")} />
        ) : loading && items.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={<History size={24} />} title={t("empty")} />
        ) : (
          <>
            <div className="space-y-2.5">
              {items.map((item) => {
                const catCfg = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.general;
                const priCfg = PRIORITY_CONFIG[item.priority] ?? PRIORITY_CONFIG.normal;
                const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.sent;
                return (
                  <div
                    key={item.id}
                    className="group relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] hover:border-[var(--primary)]/30 hover:shadow-[var(--shadow-sm)] transition-all duration-200 overflow-hidden flex"
                  >
                    {/* Priority left border */}
                    <div className="w-1 flex-shrink-0" style={{ background: priCfg.borderColor }} />

                    <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[var(--text-primary)] text-sm leading-snug line-clamp-1 mb-1">{item.title}</p>
                        <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">{item.body}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2.5">
                          {/* Category badge */}
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
                            style={{ background: catCfg.bg, color: catCfg.text }}
                          >
                            {catCfg.emoji} {catCfg.label}
                          </span>
                          {/* Priority */}
                          <span className="text-xs font-semibold" style={{ color: priCfg.color }}>
                            ● {priCfg.label}
                          </span>
                        </div>
                      </div>

                      {/* Right side */}
                      <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 flex-shrink-0">
                        <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                          {item.createdAt ? formatDate(item.createdAt) : "—"}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                          <Users size={11} />
                          {item.recipientCount}
                        </span>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
                          style={{ background: statusCfg.bg, color: statusCfg.color }}
                        >
                          {t(`status.${item.status}`)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)]">{t("page", { current: page, total: totalPages })}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                    <ChevronRight size={14} />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                    <ChevronLeft size={14} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
