"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { useToast } from "@/components/toast";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, Eye, RefreshCw, Search, Trash2, XCircle } from "@/lib/icons";
import { DatePicker } from "@/components/ui/date-picker";

const TYPE_STYLE: Record<string, { color: string; bg: string; icon: string }> = {
  notification:   { color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  icon: "🔔" },
  homework:       { color: "#10b981", bg: "rgba(16,185,129,0.1)",  icon: "📚" },
  photo:          { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: "📷" },
  video:          { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  icon: "🎥" },
  file:           { color: "#6366f1", bg: "rgba(99,102,241,0.1)",  icon: "📄" },
  link:           { color: "#06b6d4", bg: "rgba(6,182,212,0.1)",   icon: "🔗" },
  announcement:   { color: "#ec4899", bg: "rgba(236,72,153,0.1)",  icon: "📢" },
  grade_entry:    { color: "#84cc16", bg: "rgba(132,204,22,0.1)",  icon: "📝" },
  exam_photo:     { color: "#f97316", bg: "rgba(249,115,22,0.1)",  icon: "📸" },
  worksheet:      { color: "#14b8a6", bg: "rgba(20,184,166,0.1)",  icon: "📋" },
  lesson_summary: { color: "#a855f7", bg: "rgba(168,85,247,0.1)",  icon: "📖" },
};

type Attachment = {
  id: string;
  file_type: string;
  file_name: string;
  file_path?: string;
  file_size?: number;
  thumbnail_path?: string;
  external_url?: string;
  url_title?: string;
  duration_seconds?: number;
};

type Activity = {
  id: string;
  activity_type: string;
  title: string;
  body?: string;
  subject?: string;
  target_type: string;
  target_count: number;
  viewed_count: number;
  review_status: string;
  rejection_reason?: string;
  is_published: boolean;
  created_at: string;
  teacher_id: string;
  teachers: { id: string; full_name: string; subject: string } | null;
  activity_attachments?: Attachment[];
};

type ListPayload = { ok: boolean; activities: Activity[]; total: number; pages: number; page: number };

function formatRelativeDate(iso: string, todayLabel: string, yesterdayLabel: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (dDay.getTime() === today.getTime()) return todayLabel;
  if (dDay.getTime() === yesterday.getTime()) return yesterdayLabel;
  return d.toLocaleDateString("ar-IQ-u-nu-latn", { day: "numeric", month: "long", year: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ar-IQ-u-nu-latn", { hour: "2-digit", minute: "2-digit" });
}

export function ActivityTimeline({ schoolId }: { schoolId: string }) {
  const t = useTranslations("teacherActivities");
  const toast = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (pageNum: number, append = false) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const params = new URLSearchParams({ page: String(pageNum), limit: "20" });
        if (search) params.set("q", search);
        if (typeFilter) params.set("type", typeFilter);
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo) params.set("date_to", dateTo);
        const { response, payload } = await fetchJsonWithAuthorizedSession<ListPayload>(
          `/api/v1/teacher-activities?${params}`,
        );
        if (!response.ok) throw new Error();
        const acts = payload?.activities ?? [];
        setActivities((prev) => (append ? [...prev, ...acts] : acts));
        setHasMore((payload?.page ?? 1) < (payload?.pages ?? 1));
        setPage(pageNum);
      } catch {
        toast.error("تعذر تحميل النشاطات");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [search, typeFilter, dateFrom, dateTo, toast],
  );

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => load(1), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm(t("timeline.deleteConfirm"))) return;
    setDeletingId(id);
    try {
      const { response } = await fetchJsonWithAuthorizedSession(`/api/v1/teacher-activities/${id}`, {
        method: "DELETE", headers: withJsonHeaders(), body: JSON.stringify({ reason: "حذف من لوحة الإدارة" }),
      });
      if (!response.ok) throw new Error();
      setActivities((prev) => prev.filter((a) => a.id !== id));
      toast.success(t("timeline.deleteSuccess"));
    } catch {
      toast.error(t("timeline.errorDelete"));
    } finally {
      setDeletingId(null);
    }
  };

  const handleReview = async (id: string, action: "approve" | "reject") => {
    setReviewingId(id);
    try {
      const { response } = await fetchJsonWithAuthorizedSession(`/api/v1/teacher-activities/${id}/review`, {
        method: "PATCH", headers: withJsonHeaders(), body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error();
      setActivities((prev) =>
        prev.map((a) => a.id === id ? { ...a, review_status: action === "approve" ? "approved" : "rejected" } : a),
      );
      toast.success(action === "approve" ? t("timeline.approveSuccess") : t("timeline.rejectSuccess"));
    } catch {
      toast.error(t("timeline.errorReview"));
    } finally {
      setReviewingId(null);
    }
  };

  const grouped: Record<string, Activity[]> = {};
  for (const a of activities) {
    const label = formatRelativeDate(a.created_at, t("timeline.today"), t("timeline.yesterday"));
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(a);
  }

  const inputCls = "w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-primary)] text-sm outline-none";

  return (
    <div className="space-y-5" dir="rtl">

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2.5 flex-wrap items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("timeline.searchPlaceholder")} className={inputCls} style={{ paddingRight: 34 }} />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputCls} style={{ flex: "0 1 160px", cursor: "pointer" }}>
              <option value="">{t("timeline.allTypes")}</option>
              {Object.entries(TYPE_STYLE).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {t(`activityTypes.${k}` as Parameters<typeof t>[0])}</option>
              ))}
            </select>
            <div style={{ flex: "0 1 150px" }}>
              <DatePicker value={dateFrom || undefined} onChange={(v) => setDateFrom(v ?? "")} placeholder="من تاريخ" />
            </div>
            <div style={{ flex: "0 1 150px" }}>
              <DatePicker value={dateTo || undefined} onChange={(v) => setDateTo(v ?? "")} placeholder="إلى تاريخ" />
            </div>
            <button onClick={() => load(1)} title="تحديث" className="w-9 h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-muted)] flex items-center justify-center flex-shrink-0 hover:bg-[var(--card-bg)] transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Skeletons */}
      {loading && (
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-[var(--card-bg)] border border-[var(--border)] rounded-[var(--card-radius)] animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && activities.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-sm font-semibold text-[var(--text-muted)]">
            {t("timeline.noResults")}
          </CardContent>
        </Card>
      )}

      {/* Grouped */}
      {!loading && Object.entries(grouped).map(([dateLabel, acts]) => (
        <div key={dateLabel}>
          <div className="flex items-center gap-3 mb-3.5">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <div className="text-xs font-extrabold text-[var(--text-muted)] bg-[var(--card-bg)] border border-[var(--border)] rounded-full px-3.5 py-1 whitespace-nowrap">
              {dateLabel}
            </div>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <div className="flex flex-col gap-2.5">
            {acts.map((activity) => {
              const cfg = TYPE_STYLE[activity.activity_type] ?? { color: "#64748b", bg: "rgba(100,116,139,0.1)", icon: "📌" };
              const typeLabel = t(`activityTypes.${activity.activity_type}` as Parameters<typeof t>[0], { default: activity.activity_type });
              const expanded = expandedId === activity.id;
              const viewPct = activity.target_count > 0 ? Math.round((activity.viewed_count / activity.target_count) * 100) : 0;
              const viewBarColor = viewPct > 70 ? "#10b981" : viewPct > 40 ? "#f59e0b" : "#ef4444";

              return (
                <div
                  key={activity.id}
                  className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[var(--card-radius)] overflow-hidden transition-shadow duration-200 hover:shadow-lg"
                  style={{ borderRight: `4px solid ${cfg.color}` }}
                >
                  <div className="p-4 cursor-pointer" onClick={() => setExpandedId(expanded ? null : activity.id)}>
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border" style={{ color: cfg.color, background: cfg.bg, borderColor: `${cfg.color}30` }}>
                            {cfg.icon} {typeLabel}
                          </span>
                          {activity.review_status === "pending" && (
                            <span className="text-[11px] font-bold text-[#d97706] bg-[rgba(245,158,11,0.12)] px-2.5 py-0.5 rounded-full border border-[rgba(245,158,11,0.3)]">⏳ {t("timeline.pendingBadge")}</span>
                          )}
                          {activity.review_status === "rejected" && (
                            <span className="text-[11px] font-bold text-[var(--danger)] bg-[rgba(239,68,68,0.1)] px-2.5 py-0.5 rounded-full border border-[rgba(239,68,68,0.25)]">✕ {t("timeline.rejectedBadge")}</span>
                          )}
                          <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mr-auto">
                            <Clock size={11} />{formatTime(activity.created_at)}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-[15px] font-bold text-[var(--text-primary)] truncate">{activity.title}</div>
                            <div className="text-xs text-[var(--text-muted)] font-semibold mt-0.5">
                              {activity.teachers?.full_name ?? ""}
                              {activity.teachers?.subject && (
                                <span className="mr-1.5 text-[11px] text-[var(--primary)] bg-[rgba(99,102,241,0.1)] px-1.5 py-0.5 rounded-md">{activity.teachers.subject}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            {activity.review_status === "pending" && (
                              <>
                                <button onClick={() => handleReview(activity.id, "approve")} disabled={reviewingId === activity.id} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[rgba(16,185,129,0.12)] text-[#10b981] hover:bg-[rgba(16,185,129,0.2)] transition-colors">
                                  <CheckCircle2 size={12} /> {t("timeline.approveBtn")}
                                </button>
                                <button onClick={() => handleReview(activity.id, "reject")} disabled={reviewingId === activity.id} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[rgba(239,68,68,0.1)] text-[var(--danger)] hover:bg-[rgba(239,68,68,0.18)] transition-colors">
                                  <XCircle size={12} /> {t("timeline.rejectBtn")}
                                </button>
                              </>
                            )}
                            <button onClick={() => handleDelete(activity.id)} disabled={deletingId === activity.id} className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-muted)] flex items-center justify-center hover:text-[var(--danger)] transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        {activity.target_count > 0 && (
                          <div className="mt-2.5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 font-semibold"><Eye size={11} /> {t("timeline.viewPct")}</span>
                              <span className="text-[11px] font-bold" style={{ color: viewBarColor }}>{viewPct}% ({activity.viewed_count}/{activity.target_count})</span>
                            </div>
                            <div className="h-1.5 bg-[var(--surface-soft)] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${viewPct}%`, background: viewBarColor }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-[var(--border)] p-4 bg-[var(--surface-soft)] space-y-3">
                      {activity.body && activity.activity_type !== "link" && (
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{activity.body}</p>
                      )}
                      {activity.rejection_reason && (
                        <div className="text-xs text-[var(--danger)] bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.2)] rounded-xl px-3.5 py-2 font-semibold">
                          {t("timeline.rejectionReason")} {activity.rejection_reason}
                        </div>
                      )}

                      {/* Rich media */}
                      {(() => {
                        const atts = activity.activity_attachments ?? [];
                        const bodyUrl = activity.activity_type === "link" && activity.body
                          ? (() => { try { new URL(activity.body); return activity.body; } catch { return null; } })()
                          : null;
                        const links = atts.filter((a) => a.file_type === "link" || a.external_url);
                        const images = atts.filter((a) => a.file_type === "image" && a.file_path);
                        const videos = atts.filter((a) => a.file_type === "video" && a.file_path);
                        const pdfs = atts.filter((a) => (a.file_type === "pdf" || a.file_type === "file") && a.file_path);
                        return (
                          <div className="space-y-2.5">
                            {bodyUrl && (
                              <a href={bodyUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-[rgba(6,182,212,0.3)] bg-[rgba(6,182,212,0.07)] text-[#0891b2] hover:bg-[rgba(6,182,212,0.14)] transition-colors text-sm font-bold break-all"
                              >
                                <span className="text-base flex-shrink-0">🔗</span>
                                <span className="flex-1 min-w-0 truncate">{bodyUrl}</span>
                                <span className="text-xs opacity-70 flex-shrink-0">↗ فتح</span>
                              </a>
                            )}
                            {links.map((att) => (
                              <a key={att.id} href={att.external_url ?? att.file_path} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-[rgba(6,182,212,0.3)] bg-[rgba(6,182,212,0.07)] text-[#0891b2] hover:bg-[rgba(6,182,212,0.14)] transition-colors text-sm font-bold break-all"
                              >
                                <span className="text-base flex-shrink-0">🔗</span>
                                <span className="flex-1 min-w-0 truncate">{att.url_title ?? att.file_name ?? att.external_url}</span>
                                <span className="text-xs opacity-70 flex-shrink-0">↗ فتح</span>
                              </a>
                            ))}
                            {images.length > 0 && (
                              <div className={`grid gap-2 ${images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                                {images.map((att) => (
                                  <a key={att.id} href={att.file_path} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-[var(--border)] hover:opacity-90 transition-opacity">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={att.thumbnail_path ?? att.file_path} alt={att.file_name} className="w-full object-cover" style={{ maxHeight: 220 }} />
                                  </a>
                                ))}
                              </div>
                            )}
                            {videos.map((att) => (
                              <div key={att.id} className="rounded-xl overflow-hidden border border-[var(--border)] bg-black">
                                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                                <video src={att.file_path} controls className="w-full max-h-64" poster={att.thumbnail_path ?? undefined} />
                                {att.file_name && <p className="text-[11px] text-[var(--text-muted)] px-3 py-1.5 bg-[var(--card-bg)]">{att.file_name}</p>}
                              </div>
                            ))}
                            {pdfs.map((att) => (
                              <a key={att.id} href={att.file_path} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[rgba(99,102,241,0.25)] bg-[rgba(99,102,241,0.07)] hover:bg-[rgba(99,102,241,0.12)] transition-colors"
                              >
                                <span className="text-2xl flex-shrink-0">{att.file_type === "pdf" ? "📄" : "📎"}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-[var(--text-primary)] truncate">{att.file_name}</p>
                                  {att.file_size && <p className="text-[11px] text-[var(--text-muted)]">{(att.file_size / 1024).toFixed(0)} KB</p>}
                                </div>
                                <span className="text-xs font-bold text-[#6366f1] flex-shrink-0">↗ فتح</span>
                              </a>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {hasMore && (
        <button onClick={() => load(page + 1, true)} disabled={loadingMore} className="w-full py-3 rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--card-bg)] text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition-colors disabled:opacity-60">
          {loadingMore ? t("timeline.loading") : t("timeline.loadMore")}
        </button>
      )}
    </div>
  );
}
