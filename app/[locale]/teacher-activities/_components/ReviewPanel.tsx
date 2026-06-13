"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { useToast } from "@/components/toast";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, Flag, XCircle } from "@/lib/icons";

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  notification:   { label: "إشعار",        color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  icon: "🔔" },
  homework:       { label: "واجب",          color: "#10b981", bg: "rgba(16,185,129,0.1)",  icon: "📚" },
  photo:          { label: "صورة",          color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: "📷" },
  video:          { label: "فيديو",         color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  icon: "🎥" },
  file:           { label: "ملف",           color: "#6366f1", bg: "rgba(99,102,241,0.1)",  icon: "📄" },
  link:           { label: "رابط",          color: "#06b6d4", bg: "rgba(6,182,212,0.1)",   icon: "🔗" },
  announcement:   { label: "إعلان",         color: "#ec4899", bg: "rgba(236,72,153,0.1)",  icon: "📢" },
  grade_entry:    { label: "درجات",         color: "#84cc16", bg: "rgba(132,204,22,0.1)",  icon: "📝" },
  exam_photo:     { label: "صورة امتحان",   color: "#f97316", bg: "rgba(249,115,22,0.1)",  icon: "📸" },
  worksheet:      { label: "ورقة عمل",      color: "#14b8a6", bg: "rgba(20,184,166,0.1)",  icon: "📋" },
  lesson_summary: { label: "ملخص درس",      color: "#a855f7", bg: "rgba(168,85,247,0.1)",  icon: "📖" },
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
  review_status: string;
  rejection_reason?: string;
  flag_reason?: string;
  created_at: string;
  teacher_id: string;
  teachers: { id: string; full_name: string; subject: string } | null;
  activity_attachments?: Attachment[];
};

type ReviewTab = "pending" | "approved" | "rejected" | "flagged";

const TAB_CONFIG: Record<ReviewTab, { label: string; color: string; bg: string; icon: string }> = {
  pending:  { label: "معلق",       color: "#d97706", bg: "rgba(245,158,11,0.12)",  icon: "⏳" },
  approved: { label: "موافق عليه", color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: "✅" },
  rejected: { label: "مرفوض",      color: "#ef4444", bg: "rgba(239,68,68,0.12)",  icon: "✕" },
  flagged:  { label: "مُبلَّغ",    color: "#f97316", bg: "rgba(249,115,22,0.12)", icon: "🚩" },
};

function ActivityMedia({ activity }: { activity: Activity }) {
  const atts = activity.activity_attachments ?? [];

  // Detect inline URL in body for link-type activities
  const bodyUrl = (() => {
    if (activity.activity_type === "link" && activity.body) {
      try { new URL(activity.body); return activity.body; } catch { return null; }
    }
    return null;
  })();

  const links = atts.filter((a) => a.file_type === "link" || a.external_url);
  const images = atts.filter((a) => a.file_type === "image" && a.file_path);
  const videos = atts.filter((a) => a.file_type === "video" && a.file_path);
  const pdfs = atts.filter((a) => (a.file_type === "pdf" || a.file_type === "file") && a.file_path);

  const hasAny = bodyUrl || links.length || images.length || videos.length || pdfs.length;
  if (!hasAny) return null;

  return (
    <div className="space-y-3 pt-3 border-t border-[var(--border)] mt-3">
      {/* Body URL link */}
      {bodyUrl && (
        <a href={bodyUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-[rgba(6,182,212,0.3)] bg-[rgba(6,182,212,0.07)] text-[#0891b2] hover:bg-[rgba(6,182,212,0.14)] transition-colors text-sm font-bold break-all"
        >
          <span className="text-base flex-shrink-0">🔗</span>
          <span className="flex-1 min-w-0 truncate">{bodyUrl}</span>
          <span className="text-xs opacity-70 flex-shrink-0">↗ فتح</span>
        </a>
      )}

      {/* Link attachments */}
      {links.map((att) => (
        <a key={att.id} href={att.external_url ?? att.file_path} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-[rgba(6,182,212,0.3)] bg-[rgba(6,182,212,0.07)] text-[#0891b2] hover:bg-[rgba(6,182,212,0.14)] transition-colors text-sm font-bold break-all"
        >
          <span className="text-base flex-shrink-0">🔗</span>
          <span className="flex-1 min-w-0 truncate">{att.url_title ?? att.file_name ?? att.external_url}</span>
          <span className="text-xs opacity-70 flex-shrink-0">↗ فتح</span>
        </a>
      ))}

      {/* Images */}
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

      {/* Videos */}
      {videos.map((att) => (
        <div key={att.id} className="rounded-xl overflow-hidden border border-[var(--border)] bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={att.file_path} controls className="w-full max-h-64" poster={att.thumbnail_path ?? undefined} />
          {att.file_name && <p className="text-[11px] text-[var(--text-muted)] px-3 py-1.5 bg-[var(--card-bg)]">{att.file_name}</p>}
        </div>
      ))}

      {/* PDFs & files */}
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
}

export function ReviewPanel({ schoolId }: { schoolId: string }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<ReviewTab>("pending");
  const [activities, setActivities] = useState<Record<ReviewTab, Activity[]>>({ pending: [], approved: [], rejected: [], flagged: [] });
  const [counts, setCounts] = useState<Record<ReviewTab, number>>({ pending: 0, approved: 0, rejected: 0, flagged: 0 });
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const tabs: ReviewTab[] = ["pending", "approved", "rejected", "flagged"];
      const results = await Promise.all(
        tabs.map((tab) =>
          fetchJsonWithAuthorizedSession<{ ok: boolean; activities: Activity[]; total: number }>(
            `/api/v1/teacher-activities?review_status=${tab}&limit=50`,
          ),
        ),
      );
      const newActivities = {} as Record<ReviewTab, Activity[]>;
      const newCounts = {} as Record<ReviewTab, number>;
      results.forEach(({ payload }, i) => {
        newActivities[tabs[i]] = payload?.activities ?? [];
        newCounts[tabs[i]] = payload?.total ?? 0;
      });
      setActivities(newActivities);
      setCounts(newCounts);
    } catch {
      toast.error("تعذر تحميل بيانات المراجعة");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (id: string, action: "approve" | "reject" | "flag", reason?: string) => {
    setActionId(id);
    try {
      const { response } = await fetchJsonWithAuthorizedSession(`/api/v1/teacher-activities/${id}/review`, {
        method: "PATCH", headers: withJsonHeaders(), body: JSON.stringify({ action, reason }),
      });
      if (!response.ok) throw new Error();
      toast.success(action === "approve" ? "تمت الموافقة" : action === "reject" ? "تم الرفض" : "تم التبليغ");
      await load();
    } catch {
      toast.error("تعذر تنفيذ الإجراء");
    } finally {
      setActionId(null);
      setRejectModal(null);
      setRejectReason("");
    }
  };

  const list = activities[activeTab] ?? [];

  return (
    <div className="space-y-5" dir="rtl">

      {/* Tab pills */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2 flex-wrap">
            {(["pending", "approved", "rejected", "flagged"] as ReviewTab[]).map((tab) => {
              const cfg = TAB_CONFIG[tab];
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-150"
                  style={{
                    border: `2px solid ${isActive ? cfg.color : "var(--border)"}`,
                    background: isActive ? cfg.color : "var(--card-bg)",
                    color: isActive ? "#fff" : "var(--text-secondary)",
                    boxShadow: isActive ? `0 4px 12px ${cfg.color}40` : "none",
                  }}
                >
                  <span>{cfg.icon}</span>
                  {cfg.label}
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-extrabold min-w-[22px] text-center"
                    style={{
                      background: isActive ? "rgba(255,255,255,0.25)" : "var(--surface-soft)",
                      color: isActive ? "#fff" : "var(--text-muted)",
                    }}
                  >
                    {counts[tab]}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-[var(--card-bg)] border border-[var(--border)] rounded-[var(--card-radius)] animate-pulse" />
          ))}
        </div>
      )}

      {!loading && list.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-sm font-semibold text-[var(--text-muted)]">
            لا توجد نشاطات في هذا القسم
          </CardContent>
        </Card>
      )}

      {/* Pending notifications section — shown only on pending tab */}
      {!loading && activeTab === "pending" && (() => {
        const pendingNotifications = list.filter((a) => a.activity_type === "notification");
        if (pendingNotifications.length === 0) return null;
        return (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">🔔</span>
                <h3 className="text-sm font-black text-[var(--text-primary)]">إشعارات تنتظر الموافقة</h3>
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold bg-[rgba(59,130,246,0.12)] text-[#3b82f6] border border-[rgba(59,130,246,0.25)]">
                  {pendingNotifications.length}
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {pendingNotifications.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(59,130,246,0.05)] border border-[rgba(59,130,246,0.2)]"
                  >
                    <span className="text-lg flex-shrink-0">🔔</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[var(--text-primary)] truncate">{activity.title}</div>
                      {activity.teachers?.full_name && (
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">👤 {activity.teachers.full_name}</div>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleReview(activity.id, "approve")}
                        disabled={actionId === activity.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-[rgba(16,185,129,0.12)] text-[#10b981] hover:bg-[rgba(16,185,129,0.2)] transition-colors whitespace-nowrap disabled:opacity-50"
                      >
                        موافقة
                      </button>
                      <button
                        onClick={() => setRejectModal({ id: activity.id })}
                        disabled={actionId === activity.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-[rgba(239,68,68,0.1)] text-[var(--danger)] hover:bg-[rgba(239,68,68,0.18)] transition-colors whitespace-nowrap disabled:opacity-50"
                      >
                        رفض
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {!loading && list.map((activity) => {
        const cfg = TYPE_CONFIG[activity.activity_type] ?? { label: activity.activity_type, color: "#64748b", bg: "rgba(100,116,139,0.1)", icon: "📌" };
        const tabCfg = TAB_CONFIG[activeTab];
        return (
          <div
            key={activity.id}
            className="bg-[var(--card-bg)] rounded-[var(--card-radius)] overflow-hidden"
            style={{
              border: activeTab === "pending" ? "1px solid rgba(245,158,11,0.3)" : "1px solid var(--border)",
              borderRight: `4px solid ${cfg.color}`,
            }}
          >
            <div className="p-5">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[22px] flex-shrink-0" style={{ background: cfg.bg, border: `1px solid ${cfg.color}25` }}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-base font-extrabold text-[var(--text-primary)]">{activity.title}</span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border" style={{ color: cfg.color, background: cfg.bg, borderColor: `${cfg.color}30` }}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={{ color: tabCfg.color, background: tabCfg.bg }}>
                      {tabCfg.icon} {tabCfg.label}
                    </span>
                  </div>
                  <div className="flex gap-3 items-center flex-wrap mb-1.5">
                    {activity.teachers?.full_name && (
                      <span className="text-xs text-[var(--text-secondary)] font-bold">👤 {activity.teachers.full_name}</span>
                    )}
                    {activity.teachers?.subject && (
                      <span className="text-[11px] font-bold text-[var(--primary)] bg-[rgba(99,102,241,0.1)] px-2 py-0.5 rounded-lg">{activity.teachers.subject}</span>
                    )}
                    <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(activity.created_at).toLocaleDateString("ar-IQ-u-nu-latn", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </div>
                  {activity.body && activity.activity_type !== "link" && (
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2">{activity.body}</p>
                  )}
                  {activity.rejection_reason && (
                    <div className="text-xs text-[var(--danger)] bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.2)] rounded-xl px-3.5 py-2 mt-2.5 font-semibold">
                      سبب الرفض: {activity.rejection_reason}
                    </div>
                  )}
                  {activity.flag_reason && (
                    <div className="text-xs text-[#f97316] bg-[rgba(249,115,22,0.06)] border border-[rgba(249,115,22,0.2)] rounded-xl px-3.5 py-2 mt-2.5 font-semibold">
                      سبب التبليغ: {activity.flag_reason}
                    </div>
                  )}
                  <ActivityMedia activity={activity} />
                </div>
                {activeTab === "pending" && (
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button onClick={() => handleReview(activity.id, "approve")} disabled={actionId === activity.id} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-[rgba(16,185,129,0.12)] text-[#10b981] hover:bg-[rgba(16,185,129,0.2)] transition-colors whitespace-nowrap">
                      <CheckCircle2 size={15} /> موافقة
                    </button>
                    <button onClick={() => setRejectModal({ id: activity.id })} disabled={actionId === activity.id} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-[rgba(239,68,68,0.1)] text-[var(--danger)] hover:bg-[rgba(239,68,68,0.18)] transition-colors whitespace-nowrap">
                      <XCircle size={15} /> رفض
                    </button>
                    <button onClick={() => handleReview(activity.id, "flag")} disabled={actionId === activity.id} className="flex items-center justify-center px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-[#f97316] hover:bg-[rgba(249,115,22,0.08)] transition-colors">
                      <Flag size={15} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {rejectModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={() => setRejectModal(null)}>
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-2xl p-7 w-[440px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-[rgba(239,68,68,0.12)] text-[var(--danger)] flex items-center justify-center">
                <XCircle size={18} />
              </div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)]">سبب الرفض</h3>
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="اكتب سبب الرفض هنا..."
              rows={4}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-primary)] text-sm resize-y outline-none leading-relaxed"
            />
            <div className="flex gap-2.5 mt-4 justify-end">
              <button onClick={() => setRejectModal(null)} className="px-5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)] text-sm font-semibold hover:bg-[var(--card-bg)] transition-colors">
                إلغاء
              </button>
              <button onClick={() => handleReview(rejectModal.id, "reject", rejectReason)} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--danger)] text-white text-sm font-extrabold hover:opacity-90 transition-opacity">
                <XCircle size={14} /> تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
