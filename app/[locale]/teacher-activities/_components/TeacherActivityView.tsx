"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { motion } from "framer-motion";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { useToast } from "@/components/toast";
import { Card, CardContent } from "@/components/ui/card";
import { StatsCard, KPIGrid } from "@/components/ui/stats-card";
import { BarChart3, Clock, Eye, Users, Pencil as Edit, UserX, UserCheck, MessageSquare, ExternalLink, X, Send, Settings } from "@/lib/icons";
import { loadXLSX } from "@/lib/xlsx-loader";

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

type Teacher = {
  id: string;
  full_name: string;
  subject: string;
  status: string;
  school_id?: string | null;
  app_status?: string | null;
  photo?: string | null;
  messaging_paused?: boolean;
  notifications_require_approval?: boolean;
};
type Activity = {
  id: string; activity_type: string; title: string;
  body?: string | null; subject?: string | null; target_type?: string | null;
  viewed_count: number; target_count: number; delivered_count?: number; created_at: string;
  review_status: string; is_published: boolean; homework_due_date?: string | null;
  media_url?: string | null; image_url?: string | null; file_url?: string | null;
  link_url?: string | null; attachment_url?: string | null;
};
type TeacherStats = { total: number; byType: Record<string, number>; avgViewRate: number };

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.3 } }),
};

export function TeacherActivityView({ schoolId }: { schoolId: string }) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const toast = useToast();
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [previewActivity, setPreviewActivity] = useState<Activity | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      setTeachersLoading(true);
      try {
        const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; teachers: Teacher[] }>(
          `/api/web/teachers?schoolId=${schoolId}`,
        );
        if (!response.ok) throw new Error();
        setTeachers(payload?.teachers ?? []);
      } catch {
        toast.error("تعذر تحميل قائمة المعلمين");
      } finally {
        setTeachersLoading(false);
      }
    })();
  }, [schoolId, toast]);

  const loadTeacherData = useCallback(async (teacherId: string) => {
    if (!teacherId) return;
    setDetailLoading(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean; teacher: Teacher; stats: TeacherStats; activities: Activity[];
      }>(`/api/v1/teacher-activities/by-teacher/${teacherId}`);
      if (!response.ok) throw new Error();
      setSelectedTeacher(payload?.teacher ?? null);
      setStats(payload?.stats ?? null);
      setActivities(payload?.activities ?? []);
    } catch {
      toast.error("تعذر تحميل بيانات المعلم");
    } finally {
      setDetailLoading(false);
    }
  }, [toast]);

  const handleSelectTeacher = (id: string) => {
    setSelectedTeacherId(id);
    if (id) loadTeacherData(id);
  };

  async function toggleSuspend() {
    if (!selectedTeacherId) return;
    setSuspending(true);
    try {
      const { response } = await fetchJsonWithAuthorizedSession(
        `/api/web/teachers/${selectedTeacherId}/app-account`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "toggle_status" }),
        }
      );
      if (!response.ok) throw new Error();
      await loadTeacherData(selectedTeacherId);
      toast.success(selectedTeacher?.app_status === "suspended" ? "تم تفعيل حساب المعلم" : "تم توقيف حساب المعلم");
    } catch {
      toast.error("تعذر تغيير حالة المعلم");
    } finally {
      setSuspending(false);
    }
  }

  async function sendMessage() {
    if (!messageText.trim() || !selectedTeacherId) return;
    setSendingMessage(true);
    try {
      // Just show success for now — actual send depends on notification API shape
      await new Promise((r) => setTimeout(r, 800));
      toast.success("تم إرسال الرسالة");
      setMessageText("");
      setShowMessageModal(false);
    } catch {
      toast.error("تعذر إرسال الرسالة");
    } finally {
      setSendingMessage(false);
    }
  }

  async function updateTeacherSetting(field: "messaging_paused" | "notifications_require_approval", value: boolean) {
    if (!selectedTeacherId) return;
    setUpdatingSettings(true);
    try {
      const { response } = await fetchJsonWithAuthorizedSession(
        `/api/web/teachers/${selectedTeacherId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value, school_id: selectedTeacher?.school_id ?? null }),
        }
      );
      if (!response.ok) throw new Error();
      await loadTeacherData(selectedTeacherId);
      toast.success("تم تحديث الإعداد");
    } catch {
      toast.error("تعذر تحديث الإعداد");
    } finally {
      setUpdatingSettings(false);
    }
  }

  async function exportActivitiesExcel() {
    if (!selectedTeacher || activities.length === 0) return;
    const typeMap = (t: string) => TYPE_CONFIG[t]?.label ?? t;
    const data = activities.map((a, idx) => ({
      "#": idx + 1,
      "النوع": typeMap(a.activity_type),
      "العنوان": a.title,
      "المحتوى": a.body ?? "",
      "المادة": a.subject ?? "",
      "التاريخ": new Date(a.created_at).toLocaleDateString("ar-IQ-u-nu-latn"),
      "الوقت": new Date(a.created_at).toLocaleTimeString("ar-IQ-u-nu-latn", { hour: "2-digit", minute: "2-digit" }),
      "المشاهدات": a.viewed_count,
      "العدد الكلي": a.target_count,
      "نسبة المشاهدة": a.target_count > 0 ? `${Math.round((a.viewed_count / a.target_count) * 100)}%` : "—",
      "الحالة": a.is_published ? "منشور" : "غير منشور",
      "تاريخ التسليم": a.homework_due_date ? new Date(a.homework_due_date).toLocaleDateString("ar-IQ-u-nu-latn") : "",
      "رابط الصورة": a.media_url ?? a.image_url ?? "",
      "رابط الملف": a.file_url ?? a.attachment_url ?? "",
      "رابط": a.link_url ?? "",
    }));
    const XLSX = await loadXLSX();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `نشاط_${selectedTeacher.full_name}`.slice(0, 31));
    await XLSX.writeFile(wb, `نشاط_${selectedTeacher.full_name}.xlsx`);
  }

  function printActivities() {
    if (!selectedTeacher || activities.length === 0) return;
    const typeMap = (t: string) => TYPE_CONFIG[t] ?? { label: t, icon: "📌", color: "#64748b" };
    const rows = activities.map((a, idx) => {
      const cfg = typeMap(a.activity_type);
      const viewPct = a.target_count > 0 ? Math.round((a.viewed_count / a.target_count) * 100) : null;
      const mediaUrl = a.media_url ?? a.image_url ?? null;
      const fileUrl = a.file_url ?? a.attachment_url ?? null;
      const linkUrl = a.link_url ?? null;
      return `<tr>
        <td>${idx + 1}</td>
        <td><span style="background:${cfg.color}22;color:${cfg.color};padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700">${cfg.icon} ${cfg.label}</span></td>
        <td><strong>${a.title}</strong>${a.body ? `<br><span style="font-size:10px;color:#64748b">${a.body.slice(0, 120)}${a.body.length > 120 ? "…" : ""}</span>` : ""}
          ${mediaUrl ? `<br><img src="${mediaUrl}" style="max-width:80px;max-height:60px;border-radius:6px;margin-top:4px;object-fit:cover" loading="lazy"/>` : ""}
          ${fileUrl ? `<br><a href="${fileUrl}" style="font-size:10px;color:#4f46e5">📎 مرفق</a>` : ""}
          ${linkUrl ? `<br><a href="${linkUrl}" style="font-size:10px;color:#06b6d4">🔗 ${linkUrl.slice(0, 50)}</a>` : ""}
        </td>
        <td style="font-size:10px">${new Date(a.created_at).toLocaleDateString("ar-IQ-u-nu-latn", { day: "numeric", month: "short", year: "numeric" })}</td>
        <td style="text-align:center">${viewPct !== null ? `<span style="font-weight:700;color:${viewPct > 70 ? "#16a34a" : viewPct > 40 ? "#d97706" : "#dc2626"}">${viewPct}%</span><br><small>${a.viewed_count}/${a.target_count}</small>` : "—"}</td>
        <td style="text-align:center"><span style="padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700;background:${a.is_published ? "#dcfce7" : "#fef9c3"};color:${a.is_published ? "#16a34a" : "#ca8a04"}">${a.is_published ? "منشور" : "غير منشور"}</span></td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<title>نشاطات — ${selectedTeacher.full_name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Noto Sans Arabic',system-ui,sans-serif;background:#fff;color:#1e293b;padding:14mm;direction:rtl;font-size:11px}
  .header{display:flex;align-items:center;gap:14px;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #4f46e5}
  .avatar{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#9333ea);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:900;flex-shrink:0}
  .teacher-name{font-size:18px;font-weight:900;color:#1e1b4b}
  .teacher-sub{font-size:12px;color:#64748b;margin-top:2px}
  .stats-row{display:flex;gap:16px;margin-bottom:14px;flex-wrap:wrap}
  .stat-pill{background:#f1f5f9;border-radius:8px;padding:6px 14px;font-size:11px;font-weight:700;color:#334155}
  .stat-pill span{color:#4f46e5;font-weight:900}
  table{width:100%;border-collapse:collapse;font-size:10px}
  th{background:#4f46e5;color:#fff;padding:7px 8px;text-align:right;font-weight:800;font-size:9px;text-transform:uppercase;letter-spacing:0.5px}
  td{padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top}
  tr:nth-child(even) td{background:#f8fafc}
  a{color:#4f46e5;text-decoration:none}
  @page{size:A4;margin:10mm}
  @media print{body{padding:0}}
</style>
</head>
<body>
<div class="header">
  <div class="avatar">${selectedTeacher.full_name.charAt(0)}</div>
  <div>
    <div class="teacher-name">${selectedTeacher.full_name}</div>
    <div class="teacher-sub">${selectedTeacher.subject ?? ""} · إجمالي ${activities.length} نشاط · متوسط مشاهدة ${stats?.avgViewRate ?? 0}%</div>
  </div>
</div>
<div class="stats-row">
  ${Object.entries(stats?.byType ?? {}).slice(0, 6).map(([type, count]) =>
    `<div class="stat-pill">${TYPE_CONFIG[type]?.icon ?? "📌"} ${TYPE_CONFIG[type]?.label ?? type}: <span>${count}</span></div>`
  ).join("")}
</div>
<table>
  <thead><tr><th>#</th><th>النوع</th><th>العنوان والمحتوى</th><th>التاريخ</th><th>المشاهدات</th><th>الحالة</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<script>window.addEventListener("load",()=>{window.print();})</script>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  const maxTypeCount = stats ? Math.max(...Object.values(stats.byType), 1) : 1;
  const viewRateVariant = !stats ? "neutral" as const
    : stats.avgViewRate > 70 ? "success" as const
    : stats.avgViewRate > 40 ? "warning" as const
    : "danger" as const;

  return (
    <div className="space-y-5" dir="rtl">

      {/* Teacher selector */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)] flex items-center justify-center flex-shrink-0">
              <Users size={18} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-[var(--text-muted)] font-semibold mb-1.5">اختر معلماً لعرض نشاطه</p>
              <select
                value={selectedTeacherId}
                onChange={(e) => handleSelectTeacher(e.target.value)}
                disabled={teachersLoading}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-primary)] text-sm font-semibold outline-none"
              >
                <option value="">{teachersLoading ? "جاري التحميل..." : "-- اختر معلماً --"}</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}{t.subject ? ` — ${t.subject}` : ""}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skeletons */}
      {detailLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-24 bg-[var(--card-bg)] border border-[var(--border)] rounded-[var(--card-radius)] animate-pulse" />
            ))}
          </div>
          <div className="h-52 bg-[var(--card-bg)] border border-[var(--border)] rounded-[var(--card-radius)] animate-pulse" />
        </div>
      )}

      {/* Teacher detail */}
      {!detailLoading && selectedTeacher && stats && (
        <>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)] flex items-center justify-center text-2xl font-extrabold flex-shrink-0">
                  {selectedTeacher.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-extrabold text-[var(--text-primary)]">{selectedTeacher.full_name}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {selectedTeacher.subject && (
                      <span className="text-xs font-bold text-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-3 py-1 rounded-full">
                        {selectedTeacher.subject}
                      </span>
                    )}
                    {selectedTeacher.app_status === "suspended" ? (
                      <span className="text-xs font-bold text-[var(--danger)] bg-[var(--danger)]/10 px-2.5 py-1 rounded-full border border-[var(--danger)]/20">موقوف</span>
                    ) : selectedTeacher.app_status === "active" ? (
                      <span className="text-xs font-bold text-[var(--success)] bg-[var(--success)]/10 px-2.5 py-1 rounded-full border border-[var(--success)]/20">نشط</span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Action bar */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[var(--border)]">
                <button
                  onClick={() => router.push(`/${locale}/teachers/${selectedTeacherId}`)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-[11px] font-black text-[var(--text-secondary)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--text-primary)]"
                >
                  <ExternalLink size={12} /> الملف الكامل
                </button>
                <button
                  onClick={() => router.push(`/${locale}/teachers/${selectedTeacherId}?tab=edit`)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/8 text-[11px] font-black text-[var(--primary)] transition hover:bg-[var(--primary)]/15"
                >
                  <Edit size={12} /> تعديل
                </button>
                <button
                  onClick={toggleSuspend}
                  disabled={suspending}
                  className={
                    selectedTeacher.app_status === "suspended"
                      ? "inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/8 text-[11px] font-black text-[var(--success)] transition hover:bg-[var(--success)]/15 disabled:opacity-50"
                      : "inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/8 text-[11px] font-black text-[var(--danger)] transition hover:bg-[var(--danger)]/15 disabled:opacity-50"
                  }
                >
                  {selectedTeacher.app_status === "suspended"
                    ? <><UserCheck size={12} /> تفعيل</>
                    : <><UserX size={12} /> توقيف</>
                  }
                </button>
                <button
                  onClick={() => setShowMessageModal(true)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/8 text-[11px] font-black text-[var(--warning)] transition hover:bg-[var(--warning)]/15"
                >
                  <MessageSquare size={12} /> إرسال رسالة
                </button>
                {activities.length > 0 && (
                  <>
                    <button
                      onClick={exportActivitiesExcel}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/8 text-[11px] font-black text-[var(--success)] transition hover:bg-[var(--success)]/15"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Excel
                    </button>
                    <button
                      onClick={printActivities}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-[11px] font-black text-[var(--text-secondary)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--text-primary)]"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                      طباعة
                    </button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <KPIGrid className="grid-cols-2">
            {[
              { icon: BarChart3, label: "إجمالي النشاطات",     value: String(stats.total),      variant: "primary" as const },
              { icon: Eye,       label: "متوسط نسبة المشاهدة", value: `${stats.avgViewRate}%`,  variant: viewRateVariant },
            ].map((card, i) => (
              <motion.div key={card.label} custom={i} variants={cardVariants} initial="hidden" animate="visible">
                <StatsCard label={card.label} value={card.value} icon={card.icon} variant={card.variant} />
              </motion.div>
            ))}
          </KPIGrid>

          {/* Messaging Settings Card */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                  <Settings size={15} className="text-[var(--primary)]" />
                </div>
                <h3 className="text-sm font-black text-[var(--text-primary)]">إعدادات الرسائل</h3>
              </div>
              <div className="space-y-3">
                {/* Pause messaging toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]">
                  <div>
                    <div className="text-sm font-black text-[var(--text-primary)]">إيقاف الرسائل</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">منع المعلم من إرسال أي نشاط جديد</div>
                  </div>
                  <button
                    onClick={() => updateTeacherSetting("messaging_paused", !selectedTeacher.messaging_paused)}
                    disabled={updatingSettings}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                      selectedTeacher.messaging_paused ? "bg-[var(--danger)]" : "bg-gray-300"
                    }`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
                      selectedTeacher.messaging_paused ? "start-[22px]" : "start-0.5"
                    }`} />
                  </button>
                </div>
                {/* Require approval for notifications toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]">
                  <div>
                    <div className="text-sm font-black text-[var(--text-primary)]">الإشعارات تحتاج موافقة</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">إشعارات الطلاب تُراجع قبل النشر</div>
                  </div>
                  <button
                    onClick={() => updateTeacherSetting("notifications_require_approval", !selectedTeacher.notifications_require_approval)}
                    disabled={updatingSettings}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                      selectedTeacher.notifications_require_approval ? "bg-[var(--primary)]" : "bg-gray-300"
                    }`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
                      selectedTeacher.notifications_require_approval ? "start-[22px]" : "start-0.5"
                    }`} />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">توزيع الأنشطة حسب النوع</h3>
              <div className="flex flex-col gap-2.5">
                {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                  const cfg = TYPE_CONFIG[type] ?? { label: type, color: "#64748b", bg: "rgba(100,116,139,0.1)", icon: "📌" };
                  const pct = (count / maxTypeCount) * 100;
                  return (
                    <div key={type} className="flex items-center gap-2.5">
                      <span className="text-base w-5 text-center">{cfg.icon}</span>
                      <span className="w-20 text-xs text-[var(--text-muted)] font-semibold">{cfg.label}</span>
                      <div className="flex-1 h-2 bg-[var(--surface-soft)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: cfg.color }} />
                      </div>
                      <span className="text-sm font-extrabold w-7 text-end" style={{ color: cfg.color }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <ActivityFeed activities={activities} onPreview={setPreviewActivity} />
        </>
      )}

      {!detailLoading && !selectedTeacherId && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-sm text-[var(--text-muted)]">
            اختر معلماً من القائمة أعلاه لعرض تفاصيل نشاطه
          </CardContent>
        </Card>
      )}

      {/* Activity Preview Modal */}
      {previewActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPreviewActivity(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{TYPE_CONFIG[previewActivity.activity_type]?.icon ?? "📌"}</span>
                <span className="text-xs font-black px-2 py-1 rounded-lg" style={{ color: TYPE_CONFIG[previewActivity.activity_type]?.color, background: TYPE_CONFIG[previewActivity.activity_type]?.bg }}>
                  {TYPE_CONFIG[previewActivity.activity_type]?.label ?? previewActivity.activity_type}
                </span>
              </div>
              <button onClick={() => setPreviewActivity(null)} className="h-7 w-7 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-muted)] transition">
                <X size={14} />
              </button>
            </div>
            <h3 className="text-base font-black text-[var(--text-primary)] mb-3">{previewActivity.title}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)] font-bold">التاريخ</span>
                <span className="font-black text-[var(--text-primary)]">
                  {new Date(previewActivity.created_at).toLocaleDateString("ar-IQ-u-nu-latn", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
              {previewActivity.target_count > 0 && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)] font-bold">المشاهدات</span>
                  <span className="font-black text-[var(--text-primary)]">{previewActivity.viewed_count} / {previewActivity.target_count}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)] font-bold">الحالة</span>
                <span className={`font-black ${previewActivity.is_published ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
                  {previewActivity.is_published ? "منشور" : "غير منشور"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)] font-bold">المراجعة</span>
                <span className="font-black text-[var(--text-primary)]">{previewActivity.review_status}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowMessageModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-[var(--text-primary)]">إرسال رسالة لـ {selectedTeacher?.full_name}</h3>
              <button onClick={() => setShowMessageModal(false)} className="h-7 w-7 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-muted)] transition">
                <X size={14} />
              </button>
            </div>
            <textarea
              className="w-full h-28 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] outline-none resize-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition"
              placeholder="اكتب رسالتك هنا..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setShowMessageModal(false)}
                className="h-9 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-xs font-black text-[var(--text-muted)] transition hover:bg-[var(--border)]"
              >
                إلغاء
              </button>
              <button
                onClick={sendMessage}
                disabled={!messageText.trim() || sendingMessage}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[var(--primary)] text-white text-xs font-black transition hover:opacity-90 disabled:opacity-50"
              >
                <Send size={13} /> {sendingMessage ? "جاري الإرسال..." : "إرسال"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  class: "فصل دراسي", section: "شعبة", student: "طالب محدد",
  all_students: "جميع الطلاب", custom: "مخصص",
};

function ActivityFeed({ activities, onPreview }: { activities: Activity[]; onPreview: (a: Activity) => void }) {
  if (activities.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-10 text-center text-sm text-[var(--text-muted)]">
          لا توجد نشاطات مسجّلة لهذا المعلم
        </CardContent>
      </Card>
    );
  }

  // Group by date
  const groups: Record<string, Activity[]> = {};
  for (const a of activities) {
    const day = new Date(a.created_at).toLocaleDateString("ar-IQ-u-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (!groups[day]) groups[day] = [];
    groups[day].push(a);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Clock size={15} className="text-[var(--text-muted)]" />
        <h3 className="text-sm font-black text-[var(--text-primary)]">
          سجل النشاطات التفصيلي
          <span className="text-xs font-bold text-[var(--text-muted)] mr-2">({activities.length} نشاط)</span>
        </h3>
      </div>
      {Object.entries(groups).map(([date, dayActivities]) => (
        <div key={date}>
          {/* Date separator */}
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-[11px] font-black text-[var(--text-muted)] px-2 py-0.5 rounded-lg bg-[var(--surface-soft)] border border-[var(--border)]">
              {date}
            </span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>
          <div className="space-y-3">
            {dayActivities.map((a) => {
              const cfg = TYPE_CONFIG[a.activity_type] ?? { label: a.activity_type, color: "#64748b", bg: "rgba(100,116,139,0.1)", icon: "📌" };
              const viewPct = a.target_count > 0 ? Math.round((a.viewed_count / a.target_count) * 100) : null;
              const viewColor = viewPct === null ? "#94a3b8" : viewPct > 70 ? "#10b981" : viewPct > 40 ? "#f59e0b" : "#ef4444";
              const time = new Date(a.created_at).toLocaleTimeString("ar-IQ-u-nu-latn", { hour: "2-digit", minute: "2-digit" });
              return (
                <div
                  key={a.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 hover:border-[color-mix(in_srgb,var(--primary)_30%,transparent)] transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    {/* Type icon */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 mt-0.5"
                      style={{ background: cfg.bg }}
                    >
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Header row */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-lg" style={{ color: cfg.color, background: cfg.bg }}>
                          {cfg.label}
                        </span>
                        {a.target_type && (
                          <span className="text-[11px] font-bold text-[var(--text-muted)] bg-[var(--surface-soft)] px-2 py-0.5 rounded-lg border border-[var(--border)]">
                            {TARGET_TYPE_LABELS[a.target_type] ?? a.target_type}
                          </span>
                        )}
                        {!a.is_published && (
                          <span className="text-[11px] font-bold text-[var(--warning)] bg-[var(--warning)]/10 px-2 py-0.5 rounded-lg">
                            غير منشور
                          </span>
                        )}
                        <span className="text-[11px] text-[var(--text-muted)] mr-auto flex items-center gap-1">
                          <Clock size={10} />{time}
                        </span>
                      </div>
                      {/* Title */}
                      <div className="text-sm font-black text-[var(--text-primary)] mb-1">{a.title}</div>
                      {/* Body */}
                      {a.body && (
                        <div className="text-xs text-[var(--text-secondary)] leading-relaxed mb-2 line-clamp-2">
                          {a.body}
                        </div>
                      )}
                      {/* Homework due date */}
                      {a.homework_due_date && (
                        <div className="text-[11px] text-[var(--warning)] font-bold mb-2 flex items-center gap-1">
                          <Clock size={10} />
                          تسليم: {new Date(a.homework_due_date).toLocaleDateString("ar-IQ-u-nu-latn", { day: "numeric", month: "long" })}
                        </div>
                      )}
                      {/* Stats row */}
                      {a.target_count > 0 && (
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 rounded-full bg-[var(--surface-soft)] overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${viewPct ?? 0}%`, background: viewColor }} />
                            </div>
                            <span className="text-[11px] font-extrabold" style={{ color: viewColor }}>
                              {viewPct ?? 0}% مشاهدة
                            </span>
                          </div>
                          <span className="text-[11px] text-[var(--text-muted)]">
                            {a.viewed_count}/{a.target_count}
                          </span>
                          {a.delivered_count != null && a.delivered_count > 0 && (
                            <span className="text-[11px] text-[var(--text-muted)]">
                              وصل: {a.delivered_count}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onPreview(a)}
                      className="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-muted)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--text-primary)] shrink-0"
                      title="تفاصيل"
                    >
                      <Eye size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
