"use client";

import { useEffect, useState } from "react";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { cn } from "@/lib/brand/brand-utils";
import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  GraduationCap,
  Loader2,
  Users,
} from "@/lib/icons";

interface TeacherEntry {
  id: string;
  full_name: string;
  salary_type: string | null;
  app_status: string | null;
  hire_date: string | null;
  contract_type: string | null;
}

interface SubjectGroup {
  subject: string;
  count: number;
  teachers: TeacherEntry[];
}

interface ClassEntry {
  id: string;
  name: string;
  grade: number | null;
  section: string | null;
}

interface ActivityLog {
  id: string;
  created_at: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action_type: string | null;
  entity_type: string | null;
  summary: string | null;
}

interface DashboardData {
  ok: boolean;
  stats: {
    students: { total: number; active: number; transferred: number };
    teachers: { total: number; by_subject: SubjectGroup[] };
    classes: { total: number };
    finance: { expenses_this_month: number };
  };
  classes: ClassEntry[];
  activity_logs: ActivityLog[];
}

interface BranchDetailPanelProps {
  schoolId: string;
  branchId: string;
}

type Tab = "teachers" | "classes" | "activity";

function contractLabel(v: string | null) {
  if (v === "full_time") return "دوام كامل";
  if (v === "part_time") return "دوام جزئي";
  if (v === "contract") return "عقد";
  return v ?? "—";
}

function statusLabel(v: string | null) {
  if (v === "active") return "نشط";
  if (v === "inactive") return "غير نشط";
  return v ?? "—";
}

function actionConfig(type: string | null): { label: string; className: string } {
  switch (type) {
    case "create":  return { label: "إضافة",   className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    case "update":  return { label: "تعديل",   className: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "delete":  return { label: "حذف",     className: "bg-red-50 text-red-700 border border-red-200" };
    case "payment": return { label: "دفعة",    className: "bg-violet-50 text-violet-700 border border-violet-200" };
    case "login":   return { label: "دخول",    className: "bg-amber-50 text-amber-700 border border-amber-200" };
    default:        return { label: type ?? "—", className: "bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)]" };
  }
}

function actionDot(type: string | null) {
  switch (type) {
    case "create":  return "bg-emerald-500";
    case "update":  return "bg-blue-500";
    case "delete":  return "bg-red-500";
    case "payment": return "bg-violet-500";
    case "login":   return "bg-amber-500";
    default:        return "bg-[var(--text-muted)]";
  }
}

function relativeTime(dateStr: string | null) {
  if (!dateStr) return "—";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "الآن";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

// Pastel color palette for subject cards
const SUBJECT_COLORS = [
  { bg: "bg-violet-50", border: "border-violet-200", badge: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  { bg: "bg-blue-50",   border: "border-blue-200",   badge: "bg-blue-100 text-blue-700",     dot: "bg-blue-500" },
  { bg: "bg-emerald-50",border: "border-emerald-200",badge: "bg-emerald-100 text-emerald-700",dot: "bg-emerald-500" },
  { bg: "bg-amber-50",  border: "border-amber-200",  badge: "bg-amber-100 text-amber-700",   dot: "bg-amber-500" },
  { bg: "bg-rose-50",   border: "border-rose-200",   badge: "bg-rose-100 text-rose-700",     dot: "bg-rose-500" },
  { bg: "bg-cyan-50",   border: "border-cyan-200",   badge: "bg-cyan-100 text-cyan-700",     dot: "bg-cyan-500" },
  { bg: "bg-indigo-50", border: "border-indigo-200", badge: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  { bg: "bg-teal-50",   border: "border-teal-200",   badge: "bg-teal-100 text-teal-700",     dot: "bg-teal-500" },
];

export function BranchDetailPanel({ schoolId, branchId }: BranchDetailPanelProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("teachers");
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = `/api/web/branch/dashboard?schoolId=${schoolId}&branchId=${branchId}`;
    fetchJsonWithAuthorizedSession<DashboardData & { message?: string }>(url)
      .then(({ payload, response }) => {
        if (cancelled) return;
        if (!response.ok || !payload?.ok) {
          setError(payload?.message ?? `خطأ ${response.status}`);
        } else {
          setData(payload as DashboardData);
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!cancelled) { setError(String(err)); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [schoolId, branchId]);

  const tabs: { key: Tab; label: string; Icon: typeof Users; count?: number }[] = [
    { key: "teachers", label: "الأساتذة", Icon: Users,      count: data?.stats.teachers.total },
    { key: "classes",  label: "الصفوف",   Icon: BookOpen,   count: data?.stats.classes.total },
    { key: "activity", label: "النشاط",   Icon: Activity,   count: data?.activity_logs.length },
  ];

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">

      {/* ── Mini stats bar ── */}
      {data && (
        <div className="grid grid-cols-3 border-b border-[var(--border)] divide-x divide-[var(--border)] rtl:divide-x-reverse">
          {[
            { label: "الطلاب",  value: data.stats.students.total,   Icon: GraduationCap, color: "text-violet-600" },
            { label: "الأساتذة", value: data.stats.teachers.total,  Icon: Users,          color: "text-blue-600" },
            { label: "الصفوف",  value: data.stats.classes.total,    Icon: BookOpen,       color: "text-emerald-600" },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="flex items-center gap-2 px-4 py-2.5">
              <div className={cn("rounded-lg bg-[var(--surface-muted)] p-1.5", color)}>
                <Icon size={13} />
              </div>
              <div>
                <div className="text-sm font-black text-[var(--text-primary)] tabular-nums leading-none">{value}</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="flex gap-1 border-b border-[var(--border)] bg-[var(--surface-muted)] px-3 pt-2">
        {tabs.map(({ key, label, Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-1.5 rounded-t-lg px-3.5 py-2 text-xs font-bold transition-all",
              tab === key
                ? "border border-b-0 border-[var(--border)] bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
            )}
          >
            <Icon size={12} />
            {label}
            {count !== undefined && count > 0 && (
              <span className={cn(
                "rounded-full px-1.5 py-px text-[9px] font-black",
                tab === key
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--border)] text-[var(--text-muted)]",
              )}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div className="p-4">

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-[var(--text-muted)]">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs">جاري التحميل...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-xs text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* ══════════════════════════════════════════
                Tab: الأساتذة
            ══════════════════════════════════════════ */}
            {tab === "teachers" && (
              <div className="space-y-4">

                {data.stats.teachers.by_subject.length === 0 ? (
                  <p className="py-8 text-center text-xs text-[var(--text-muted)]">لا يوجد أساتذة مسجلون لهذا الفرع.</p>
                ) : (
                  <>
                    {/* Subject grid */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {data.stats.teachers.by_subject.map((sg, i) => {
                        const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
                        const isOpen = expandedSubject === sg.subject;
                        return (
                          <div
                            key={sg.subject}
                            className={cn(
                              "overflow-hidden rounded-xl border transition-all",
                              color.bg, color.border,
                            )}
                          >
                            <button
                              onClick={() => setExpandedSubject(isOpen ? null : sg.subject)}
                              className="flex w-full items-center justify-between px-3 py-2.5 text-start"
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn("h-2 w-2 rounded-full", color.dot)} />
                                <div>
                                  <div className="text-[11px] font-black text-[var(--text-primary)]">{sg.subject}</div>
                                  <div className={cn("text-[10px] font-bold mt-px", color.badge.split(" ").slice(1).join(" "))}>
                                    {sg.count} {sg.count === 1 ? "أستاذ" : "أساتذة"}
                                  </div>
                                </div>
                              </div>
                              {isOpen
                                ? <ChevronDown size={11} className="shrink-0 opacity-60" />
                                : <ChevronRight size={11} className="shrink-0 opacity-40" />}
                            </button>

                            {isOpen && (
                              <div className="border-t border-current/10 divide-y divide-current/10">
                                {sg.teachers.map((t) => (
                                  <div key={t.id} className="flex items-center justify-between px-3 py-2">
                                    <span className="text-[11px] font-bold text-[var(--text-primary)] truncate max-w-[110px]">
                                      {t.full_name}
                                    </span>
                                    <div className="flex gap-1 shrink-0">
                                      <span className={cn("rounded-md px-1.5 py-0.5 text-[9px] font-black", color.badge)}>
                                        {contractLabel(t.contract_type)}
                                      </span>
                                      <span className={cn(
                                        "rounded-md px-1.5 py-0.5 text-[9px] font-black",
                                        t.app_status === "active"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
                                      )}>
                                        {statusLabel(t.app_status)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Full teachers table */}
                    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                      <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
                        <span className="text-[11px] font-black text-[var(--text-muted)]">
                          قائمة الأساتذة ({data.stats.teachers.total})
                        </span>
                      </div>
                      <table className="w-full text-xs">
                        <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)]/50">
                          <tr>
                            {["الاسم", "المادة", "العقد", "الحالة"].map((h) => (
                              <th key={h} className="px-3 py-2 text-start text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)]">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {data.stats.teachers.by_subject.flatMap((sg, i) => {
                            const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
                            return sg.teachers.map((t) => (
                              <tr key={t.id} className="group hover:bg-[var(--surface-muted)]/50 transition-colors">
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-black shrink-0", color.badge)}>
                                      {(t.full_name || "؟")[0]}
                                    </div>
                                    <span className="font-bold text-[var(--text-primary)]">{t.full_name}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold", color.badge)}>
                                    {sg.subject}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-[var(--text-secondary)]">{contractLabel(t.contract_type)}</td>
                                <td className="px-3 py-2.5">
                                  <span className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black",
                                    t.app_status === "active"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)]",
                                  )}>
                                    <span className={cn("h-1.5 w-1.5 rounded-full", t.app_status === "active" ? "bg-emerald-500" : "bg-[var(--text-muted)]")} />
                                    {statusLabel(t.app_status)}
                                  </span>
                                </td>
                              </tr>
                            ));
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════
                Tab: الصفوف
            ══════════════════════════════════════════ */}
            {tab === "classes" && (
              data.classes.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-[var(--text-muted)]">
                  <BookOpen size={28} className="opacity-30" />
                  <p className="text-xs">لا توجد صفوف مسجلة لهذا الفرع.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {data.classes.map((cls, i) => {
                    const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
                    return (
                      <div
                        key={cls.id}
                        className={cn(
                          "rounded-xl border px-3 py-3 flex items-center gap-3",
                          color.bg, color.border,
                        )}
                      >
                        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black", color.badge)}>
                          {cls.grade ?? "—"}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[11px] font-black text-[var(--text-primary)]">{cls.name}</div>
                          {cls.section && (
                            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">شعبة {cls.section}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* ══════════════════════════════════════════
                Tab: النشاط
            ══════════════════════════════════════════ */}
            {tab === "activity" && (
              data.activity_logs.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-[var(--text-muted)]">
                  <Activity size={28} className="opacity-30" />
                  <p className="text-xs">لا توجد سجلات نشاط.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {data.activity_logs.map((log) => {
                    const { label, className } = actionConfig(log.action_type);
                    const dot = actionDot(log.action_type);
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/40 px-3 py-2.5 hover:bg-[var(--surface-muted)] transition-colors"
                      >
                        {/* Dot */}
                        <div className="mt-1 flex shrink-0 flex-col items-center gap-1">
                          <div className={cn("h-2 w-2 rounded-full", dot)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-black text-[var(--text-primary)]">
                              {log.actor_name ?? "—"}
                            </span>
                            <span className={cn("rounded-md px-1.5 py-0.5 text-[9px] font-black", className)}>
                              {label}
                            </span>
                            {log.entity_type && (
                              <span className="text-[10px] text-[var(--text-muted)]">{log.entity_type}</span>
                            )}
                          </div>
                          {log.summary && (
                            <p className="mt-0.5 truncate text-[10px] text-[var(--text-secondary)]">{log.summary}</p>
                          )}
                        </div>

                        {/* Time */}
                        <div className="flex shrink-0 items-center gap-1 text-[10px] text-[var(--text-muted)]">
                          <Clock size={9} />
                          {relativeTime(log.created_at)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
