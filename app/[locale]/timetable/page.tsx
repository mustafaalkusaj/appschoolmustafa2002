"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import { cn } from "@/lib/brand/brand-utils";
import { Plus, Trash2, RefreshCw, X, CalendarDays } from "@/lib/icons";

type ScheduleRow = {
  id: string;
  class_name: string;
  section: string | null;
  day_of_week: string;
  period_number: number;
  subject: string;
  teacher_name: string | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
};

type TimetableResponse = {
  ok?: boolean;
  rows?: ScheduleRow[];
  classNames?: string[];
  error?: { message?: string };
};

type MutationResponse = {
  ok?: boolean;
  row?: ScheduleRow;
  deletedId?: string;
  error?: { message?: string };
};

const DAYS = [
  { key: "sunday", label: "الأحد" },
  { key: "monday", label: "الاثنين" },
  { key: "tuesday", label: "الثلاثاء" },
  { key: "wednesday", label: "الأربعاء" },
  { key: "thursday", label: "الخميس" },
] as const;

type DayKey = (typeof DAYS)[number]["key"];

const PERIODS = Array.from({ length: 8 }, (_, i) => i + 1);

const PERIOD_LABELS: Record<number, string> = {
  1: "الحصة ١",
  2: "الحصة ٢",
  3: "الحصة ٣",
  4: "الحصة ٤",
  5: "الحصة ٥",
  6: "الحصة ٦",
  7: "الحصة ٧",
  8: "الحصة ٨",
};

function getApiErrorMessage(payload: { error?: { message?: string } } | null | undefined, fallback: string) {
  return typeof payload?.error?.message === "string" && payload.error.message.trim()
    ? payload.error.message
    : fallback;
}

const inputClasses =
  "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 w-full";

type AddForm = {
  class_name: string;
  section: string;
  day_of_week: DayKey;
  period_number: string;
  subject: string;
  teacher_name: string;
  start_time: string;
  end_time: string;
};

const EMPTY_FORM: AddForm = {
  class_name: "",
  section: "",
  day_of_week: "sunday",
  period_number: "1",
  subject: "",
  teacher_name: "",
  start_time: "",
  end_time: "",
};

export default function TimetablePage() {
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const isAdmin = profile?.role === "super_admin" || profile?.role === "admin";

  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [classNames, setClassNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Filters
  const [classFilter, setClassFilter] = useState("");
  // Mobile: single-day view
  const [mobileDay, setMobileDay] = useState<DayKey>("sunday");

  // Add form
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AddForm>(EMPTY_FORM);

  // Pending delete
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const resolveScopedSchoolId = useCallback(async () => {
    return resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
  }, [profile, schoolScope.selectedSchoolId]);

  const fetchTimetable = useCallback(async () => {
    const scopedSchoolId = await resolveScopedSchoolId();
    if (!scopedSchoolId) {
      setRows([]);
      setClassNames([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ schoolId: scopedSchoolId });
      if (classFilter) params.set("classFilter", classFilter);

      const { response, payload } = await fetchJsonWithAuthorizedSession<TimetableResponse>(
        `/api/web/timetable?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, "تعذر تحميل الجدول الدراسي."));
      }

      setRows(payload?.rows ?? []);
      setClassNames(payload?.classNames ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل الجدول الدراسي.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [classFilter, resolveScopedSchoolId]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchTimetable();
  }, [fetchTimetable, profile, schoolScope.scopeLoading]);

  function getCell(day: DayKey, period: number): ScheduleRow | undefined {
    return rows.find((r) => r.day_of_week === day && r.period_number === period);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const scopedSchoolId = await resolveScopedSchoolId();
    if (!scopedSchoolId) { setError("لا يمكن تحديد المدرسة."); return; }

    setSaving(true);
    setError("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<MutationResponse>(
        "/api/web/timetable",
        {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            schoolId: scopedSchoolId,
            class_name: form.class_name,
            section: form.section || null,
            day_of_week: form.day_of_week,
            period_number: Number(form.period_number),
            subject: form.subject,
            teacher_name: form.teacher_name || null,
            start_time: form.start_time || null,
            end_time: form.end_time || null,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, "تعذر إضافة الحصة."));
      }

      setSuccess("تمت إضافة الحصة بنجاح ✓");
      setShowForm(false);
      setForm(EMPTY_FORM);
      await fetchTimetable();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إضافة الحصة.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const scopedSchoolId = await resolveScopedSchoolId();
    if (!scopedSchoolId) return;

    setDeleting(true);
    setError("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<MutationResponse>(
        "/api/web/timetable",
        {
          method: "DELETE",
          headers: withJsonHeaders(),
          body: JSON.stringify({ schoolId: scopedSchoolId, id }),
        },
      );

      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, "تعذر حذف الحصة."));
      }

      setSuccess("تم حذف الحصة ✓");
      setPendingDeleteId(null);
      await fetchTimetable();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حذف الحصة.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
      <div className="flex min-h-screen bg-[var(--surface-muted)]">
        <AppSidebar currentPath="/timetable" showFloatingToggle />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title="الجداول الدراسية"
            subtitle="عرض وإدارة جداول الحصص الأسبوعية"
            scope={schoolScope}
            fixed
          />

          <main className="flex-1 pt-16 overflow-y-auto custom-scrollbar">
            <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-8">

              {success && (
                <div className="rounded-2xl border border-[var(--success)]/30 bg-[var(--success)]/10 p-4 text-[var(--success)] font-bold">
                  {success}
                </div>
              )}
              {error && (
                <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 text-[var(--danger)] font-bold">
                  {error}
                </div>
              )}

              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {schoolScope.shouldBlockContent ? (
                <div className="rounded-[40px] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-lg">
                  <SchoolScopeEmptyState
                    scope={schoolScope}
                    title="الجداول الدراسية"
                    description="اختر مدرسة من القائمة لعرض جداولها الدراسية."
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Toolbar */}
                  <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-lg">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Class filter */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">الصف</label>
                          <select
                            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] min-w-[140px]"
                            value={classFilter}
                            onChange={(e) => setClassFilter(e.target.value)}
                          >
                            <option value="">كل الصفوف</option>
                            {classNames.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        {/* Mobile day picker — hidden on md+ */}
                        <div className="space-y-1 md:hidden">
                          <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">اليوم</label>
                          <select
                            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                            value={mobileDay}
                            onChange={(e) => setMobileDay(e.target.value as DayKey)}
                          >
                            {DAYS.map((d) => (
                              <option key={d.key} value={d.key}>{d.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2 items-center">
                        <button
                          type="button"
                          title="تحديث"
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--primary)] hover:bg-[var(--border)] transition-colors"
                          onClick={() => void fetchTimetable()}
                        >
                          <RefreshCw size={16} />
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            className="flex items-center gap-2 h-10 px-4 rounded-full bg-[var(--primary)] text-white text-xs font-black shadow-lg shadow-[var(--primary)]/20 transition-all hover:scale-[1.02] active:scale-95"
                            onClick={() => { setForm(EMPTY_FORM); setShowForm(true); }}
                          >
                            <Plus size={15} />
                            إضافة حصة
                          </button>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Grid */}
                  <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-4 sm:p-6 shadow-lg overflow-hidden">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="h-12 w-12 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
                        <span className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">جارٍ التحميل...</span>
                      </div>
                    ) : (
                      <>
                        {/* Desktop grid — hidden on mobile */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr>
                                <th className="p-3 text-start text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] w-28 border-b border-[var(--border)]">
                                  الحصة / اليوم
                                </th>
                                {DAYS.map((d) => (
                                  <th
                                    key={d.key}
                                    className="p-3 text-center text-[11px] font-black text-[var(--text-primary)] border-b border-[var(--border)] min-w-[130px]"
                                  >
                                    {d.label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {PERIODS.map((period) => (
                                <tr key={period} className="border-b border-[var(--border)] last:border-0">
                                  <td className="p-3 text-[11px] font-black text-[var(--text-muted)] bg-[var(--surface-muted)] rounded-s-xl">
                                    {PERIOD_LABELS[period]}
                                  </td>
                                  {DAYS.map((d) => {
                                    const cell = getCell(d.key, period);
                                    return (
                                      <td key={d.key} className="p-2 align-top">
                                        {cell ? (
                                          <div className="group relative rounded-2xl bg-[var(--primary)]/8 border border-[var(--primary)]/20 p-3 min-h-[72px] flex flex-col gap-1">
                                            <span className="text-[11px] font-black text-[var(--primary)] leading-tight">{cell.subject}</span>
                                            {cell.teacher_name && (
                                              <span className="text-[10px] text-[var(--text-muted)] leading-tight">{cell.teacher_name}</span>
                                            )}
                                            {(cell.start_time || cell.end_time) && (
                                              <span className="text-[9px] text-[var(--text-muted)] font-mono mt-auto">
                                                {cell.start_time}{cell.start_time && cell.end_time ? " – " : ""}{cell.end_time}
                                              </span>
                                            )}
                                            {cell.section && (
                                              <span className="absolute top-2 end-2 text-[9px] px-1.5 py-0.5 rounded-md bg-[var(--primary)]/10 text-[var(--primary)] font-black">
                                                {cell.section}
                                              </span>
                                            )}
                                            {isAdmin && (
                                              <button
                                                type="button"
                                                className="absolute bottom-2 end-2 h-6 w-6 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => setPendingDeleteId(cell.id)}
                                                title="حذف الحصة"
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="rounded-2xl border border-dashed border-[var(--border)] min-h-[72px] flex items-center justify-center">
                                            <span className="text-[10px] text-[var(--text-muted)]/40">—</span>
                                          </div>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile single-day view */}
                        <div className="md:hidden space-y-3">
                          <div className="text-center">
                            <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider">
                              {DAYS.find((d) => d.key === mobileDay)?.label}
                            </span>
                          </div>
                          {PERIODS.map((period) => {
                            const cell = getCell(mobileDay, period);
                            return (
                              <div key={period} className="flex gap-3 items-start">
                                <div className="w-16 flex-shrink-0 text-[11px] font-black text-[var(--text-muted)] pt-3 text-center">
                                  {PERIOD_LABELS[period]}
                                </div>
                                <div className="flex-1">
                                  {cell ? (
                                    <div className="rounded-2xl bg-[var(--primary)]/8 border border-[var(--primary)]/20 p-3 flex items-start justify-between gap-2">
                                      <div className="space-y-0.5">
                                        <div className="text-sm font-black text-[var(--primary)]">{cell.subject}</div>
                                        {cell.teacher_name && (
                                          <div className="text-xs text-[var(--text-muted)]">{cell.teacher_name}</div>
                                        )}
                                        {(cell.start_time || cell.end_time) && (
                                          <div className="text-[10px] font-mono text-[var(--text-muted)]">
                                            {cell.start_time}{cell.start_time && cell.end_time ? " – " : ""}{cell.end_time}
                                          </div>
                                        )}
                                      </div>
                                      {isAdmin && (
                                        <button
                                          type="button"
                                          className="h-7 w-7 flex-shrink-0 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] flex items-center justify-center"
                                          onClick={() => setPendingDeleteId(cell.id)}
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="rounded-2xl border border-dashed border-[var(--border)] h-12 flex items-center justify-center">
                                      <span className="text-[10px] text-[var(--text-muted)]/40">فارغة</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </section>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--text-primary)]/20"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div className="w-full max-w-lg bg-[var(--surface-strong)] rounded-[32px] shadow-2xl border border-[var(--border)] overflow-hidden">
            <div className="px-8 py-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-muted)]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                  <CalendarDays size={20} />
                </div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">إضافة حصة دراسية</h3>
              </div>
              <button
                type="button"
                className="h-8 w-8 flex items-center justify-center rounded-full bg-[var(--surface-strong)] shadow-sm border border-[var(--border)]"
                onClick={() => setShowForm(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-8 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">الصف *</label>
                  <input
                    className={inputClasses}
                    required
                    placeholder="مثال: الخامس"
                    value={form.class_name}
                    list="class-names-list"
                    onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                  />
                  <datalist id="class-names-list">
                    {classNames.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">الشعبة</label>
                  <input
                    className={inputClasses}
                    placeholder="مثال: أ"
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">اليوم *</label>
                  <select
                    className={inputClasses}
                    required
                    value={form.day_of_week}
                    onChange={(e) => setForm({ ...form, day_of_week: e.target.value as DayKey })}
                  >
                    {DAYS.map((d) => (
                      <option key={d.key} value={d.key}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">رقم الحصة *</label>
                  <select
                    className={inputClasses}
                    required
                    value={form.period_number}
                    onChange={(e) => setForm({ ...form, period_number: e.target.value })}
                  >
                    {PERIODS.map((p) => (
                      <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">المادة *</label>
                <input
                  className={inputClasses}
                  required
                  placeholder="مثال: الرياضيات"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">اسم الأستاذ</label>
                <input
                  className={inputClasses}
                  placeholder="اختياري..."
                  value={form.teacher_name}
                  onChange={(e) => setForm({ ...form, teacher_name: e.target.value })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">وقت البدء</label>
                  <input
                    className={inputClasses}
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">وقت الانتهاء</label>
                  <input
                    className={inputClasses}
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 h-12 bg-[var(--primary)] text-white rounded-2xl font-black shadow-lg shadow-[var(--primary)]/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? "جارٍ الحفظ..." : "إضافة الحصة"}
                </button>
                <button
                  type="button"
                  className="px-8 h-12 bg-[var(--surface-muted)] text-[var(--text-secondary)] rounded-2xl font-black"
                  onClick={() => setShowForm(false)}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {pendingDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--text-primary)]/20"
          onClick={(e) => { if (e.target === e.currentTarget) setPendingDeleteId(null); }}
        >
          <div className="w-full max-w-sm bg-[var(--surface-strong)] rounded-[32px] shadow-2xl border border-[var(--border)] p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[var(--danger)]/10 text-[var(--danger)] flex items-center justify-center">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-[var(--text-primary)]">حذف الحصة</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">سيتم حذف هذه الحصة نهائياً من الجدول.</p>
              </div>
            </div>
            <div className={cn("flex gap-3")}>
              <button
                type="button"
                className="flex-1 h-11 rounded-2xl bg-[var(--danger)] text-white font-black text-sm shadow-lg shadow-[var(--danger)]/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                disabled={deleting}
                onClick={() => void handleDelete(pendingDeleteId)}
              >
                {deleting ? "جارٍ الحذف..." : "نعم، احذف"}
              </button>
              <button
                type="button"
                className="flex-1 h-11 rounded-2xl bg-[var(--surface-muted)] text-[var(--text-secondary)] font-black text-sm"
                onClick={() => setPendingDeleteId(null)}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
