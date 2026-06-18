"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import {
  ClipboardList, Plus, Trash2, RefreshCw, Filter, X, Loader2,
  Search, TrendingUp, Users, BarChart3, ChevronDown,
} from "@/lib/icons";

// ============================================================
// Types
// ============================================================

type Locale = "ar" | "en";

interface BehaviorLog {
  id: string;
  school_id: string;
  student_id: string | null;
  student_name: string;
  behavior_type: string;
  points: number;
  note: string | null;
  created_at: string;
}

interface StudentSuggestion {
  id: string;
  full_name: string;
}

// ============================================================
// i18n
// ============================================================

const T: Record<string, Record<Locale, string>> = {
  pageTitle: { ar: "سجل السلوك", en: "Behavior Log" },
  pageSubtitle: { ar: "تسجيل ومتابعة الملاحظات السلوكية للطلاب", en: "Record and track student behavior notes" },
  selectSchool: { ar: "يرجى اختيار مدرسة لعرض سجل السلوك", en: "Please select a school to view behavior log" },
  totalRecords: { ar: "إجمالي السجلات", en: "Total Records" },
  positiveCount: { ar: "إيجابي", en: "Positive" },
  negativeCount: { ar: "سلبي", en: "Negative" },
  searchPlaceholder: { ar: "بحث باسم الطالب...", en: "Search by student name..." },
  allTypes: { ar: "كل الأنواع", en: "All Types" },
  positive: { ar: "إيجابي", en: "Positive" },
  negative: { ar: "سلبي", en: "Negative" },
  warning: { ar: "تنبيه", en: "Warning" },
  note: { ar: "ملاحظة", en: "Note" },
  registerBehavior: { ar: "تسجيل سلوك", en: "Record Behavior" },
  registerTitle: { ar: "تسجيل ملاحظة سلوكية", en: "Record Behavior Note" },
  studentName: { ar: "اسم الطالب", en: "Student Name" },
  studentId: { ar: "معرّف الطالب", en: "Student ID" },
  behaviorType: { ar: "نوع السلوك", en: "Behavior Type" },
  selectType: { ar: "اختر النوع", en: "Select Type" },
  points: { ar: "النقاط", en: "Points" },
  noteLabel: { ar: "ملاحظة (اختياري)", en: "Note (optional)" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  save: { ar: "حفظ", en: "Save" },
  noRecords: { ar: "لا توجد سجلات سلوك بعد", en: "No behavior records yet" },
  noRecordsDesc: { ar: "ابدأ بتسجيل ملاحظة سلوكية جديدة", en: "Start by recording a new behavior note" },
  deleteTitle: { ar: "حذف السجل", en: "Delete Record" },
  deleteDesc: { ar: "هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع.", en: "Are you sure you want to delete this record? This cannot be undone." },
  delete: { ar: "حذف", en: "Delete" },
  loadError: { ar: "تعذر تحميل سجل السلوك", en: "Failed to load behavior log" },
  saveError: { ar: "تعذر حفظ السجل", en: "Failed to save record" },
  requiredFields: { ar: "اسم الطالب ونوع السلوك مطلوبان", en: "Student name and behavior type are required" },
  unexpectedError: { ar: "خطأ غير متوقع", en: "Unexpected error" },
  statsPositivePercent: { ar: "نسبة الإيجابي", en: "Positive %" },
  statsNegativePercent: { ar: "نسبة السلبي", en: "Negative %" },
  statsMostCommon: { ar: "الأكثر شيوعاً", en: "Most Common" },
  leaderboard: { ar: "أفضل الطلاب", en: "Top Students" },
  leaderboardDesc: { ar: "حسب النقاط الإيجابية", en: "By positive points" },
  noResults: { ar: "لا توجد نتائج", en: "No results found" },
  page: { ar: "صفحة", en: "Page" },
  of: { ar: "من", en: "of" },
  prev: { ar: "السابق", en: "Previous" },
  next: { ar: "التالي", en: "Next" },
  autoFilled: { ar: "تم التعبئة تلقائياً", en: "Auto-filled" },
};

// ============================================================
// Behavior type config
// ============================================================

const BEHAVIOR_TYPES = [
  { value: "إيجابي", labelKey: "positive", color: "var(--success)", bgAlpha: "14%" },
  { value: "سلبي", labelKey: "negative", color: "var(--danger)", bgAlpha: "14%" },
  { value: "تنبيه", labelKey: "warning", color: "#f59e0b", bgAlpha: "14%" },
  { value: "ملاحظة", labelKey: "note", color: "var(--primary)", bgAlpha: "14%" },
] as const;

function getTypeConfig(type: string) {
  return BEHAVIOR_TYPES.find((t) => t.value === type) ?? { value: type, labelKey: "", color: "var(--text-muted)", bgAlpha: "14%" };
}

// ============================================================
// Helpers
// ============================================================

const EMPTY_FORM = {
  student_name: "",
  student_id: "",
  behavior_type: "",
  points: "0",
  note: "",
};

function formatDate(value: string, locale: Locale) {
  return new Date(value).toLocaleString(locale === "ar" ? "ar-IQ-u-nu-latn" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const PAGE_SIZE = 20;

// ============================================================
// Component
// ============================================================

export default function BehaviorPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as Locale;
  const t = (key: string) => T[key]?.[locale] ?? T[key]?.ar ?? key;

  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const canManage =
    profile?.role === "super_admin" || profile?.role === "admin" || profile?.role === "employee";

  const schoolId =
    schoolScope.selectedSchoolId ??
    profile?.school_id ??
    (profile?.school as { id?: string } | undefined)?.id ??
    null;

  // State
  const [items, setItems] = useState<BehaviorLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Student autocomplete
  const [studentSuggestions, setStudentSuggestions] = useState<StudentSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Fetch behavior logs
  const fetchItems = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ schoolId, page: String(page), limit: String(PAGE_SIZE) });
      if (typeFilter) params.set("type", typeFilter);
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        items: BehaviorLog[];
        total?: number;
        error?: string;
      }>(`/api/web/behavior?${params.toString()}`);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? t("loadError"));
      setItems(payload.items ?? []);
      setTotal(payload.total ?? payload.items?.length ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError"));
    } finally {
      setLoading(false);
    }
  }, [schoolId, typeFilter, page]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.trim().toLowerCase();
    return items.filter((b) => b.student_name.toLowerCase().includes(q));
  }, [items, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const positiveCount = items.filter((b) => b.points > 0).length;
    const negativeCount = items.filter((b) => b.points < 0).length;
    const totalItems = items.length;
    const positivePercent = totalItems > 0 ? Math.round((positiveCount / totalItems) * 100) : 0;
    const negativePercent = totalItems > 0 ? Math.round((negativeCount / totalItems) * 100) : 0;

    // Most common type
    const typeCounts: Record<string, number> = {};
    for (const b of items) {
      if (b.behavior_type) typeCounts[b.behavior_type] = (typeCounts[b.behavior_type] ?? 0) + 1;
    }
    const mostCommon = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    // Leaderboard
    const studentPoints: Record<string, { name: string; points: number }> = {};
    for (const b of items) {
      if (b.points > 0) {
        const key = b.student_name;
        if (!studentPoints[key]) studentPoints[key] = { name: key, points: 0 };
        studentPoints[key].points += b.points;
      }
    }
    const leaderboard = Object.values(studentPoints)
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);

    return { positiveCount, negativeCount, positivePercent, negativePercent, mostCommon, leaderboard };
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Student search for autocomplete
  const searchStudents = useCallback(
    async (query: string) => {
      if (!schoolId || query.trim().length < 2) {
        setStudentSuggestions([]);
        return;
      }
      setLoadingSuggestions(true);
      try {
        const params = new URLSearchParams({ schoolId, q: query.trim() });
        const { payload } = await fetchJsonWithAuthorizedSession<{
          ok: boolean;
          items: StudentSuggestion[];
        }>(`/api/web/attendance/student-search?${params.toString()}`);
        setStudentSuggestions(payload?.items ?? []);
      } catch {
        setStudentSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    },
    [schoolId],
  );

  // Create handler
  async function handleCreate() {
    if (!form.student_name.trim() || !form.behavior_type.trim()) {
      setError(t("requiredFields"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; error?: string }>(
        "/api/web/behavior",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_name: form.student_name,
            student_id: form.student_id || null,
            behavior_type: form.behavior_type,
            points: Number(form.points) || 0,
            note: form.note || null,
            schoolId,
          }),
        },
      );
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? t("saveError"));
      setForm(EMPTY_FORM);
      setShowForm(false);
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError"));
    } finally {
      setSaving(false);
    }
  }

  // Delete handler
  async function handleDelete(id: string) {
    try {
      const params = new URLSearchParams({ id });
      if (schoolId) params.set("schoolId", schoolId);
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; error?: string }>(
        `/api/web/behavior?${params.toString()}`,
        { method: "DELETE" },
      );
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? t("unexpectedError"));
      setItems((prev) => prev.filter((b) => b.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError"));
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/behavior" />
        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title={t("pageTitle")}
            subtitle={t("pageSubtitle")}
            scope={schoolScope}
            fixed
          />
          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-5">
              {error && (
                <div className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 p-4 text-[var(--danger)] font-bold text-sm flex items-center justify-between gap-2">
                  <span>{error}</span>
                  <button onClick={() => setError(null)} className="shrink-0">
                    <X size={16} />
                  </button>
                </div>
              )}

              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {schoolScope.shouldBlockContent ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8">
                  <SchoolScopeEmptyState
                    scope={schoolScope}
                    title={t("pageTitle")}
                    description={t("selectSchool")}
                  />
                </div>
              ) : (
                <>
                  {/* ─── Hero Stats ─── */}
                  <div
                    className="rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 70%, #000) 100%)",
                    }}
                  >
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute -top-10 -end-10 w-40 h-40 rounded-full bg-white/20" />
                      <div className="absolute bottom-0 start-0 w-24 h-24 rounded-full bg-white/10" />
                    </div>
                    <div className="relative flex flex-wrap items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                        <ClipboardList size={24} />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <h1 className="text-xl sm:text-2xl font-black">{t("pageTitle")}</h1>
                        <p className="text-sm opacity-80 mt-0.5">{t("pageSubtitle")}</p>
                      </div>
                    </div>
                    <div className="relative grid grid-cols-3 gap-3 mt-5">
                      <div className="rounded-xl bg-white/15 backdrop-blur-sm p-3 text-center">
                        <p className="text-2xl font-black">{total}</p>
                        <p className="text-xs opacity-80 mt-0.5">{t("totalRecords")}</p>
                      </div>
                      <div className="rounded-xl bg-white/15 backdrop-blur-sm p-3 text-center">
                        <p className="text-2xl font-black">{stats.positiveCount}</p>
                        <p className="text-xs opacity-80 mt-0.5">{t("positiveCount")}</p>
                      </div>
                      <div className="rounded-xl bg-white/15 backdrop-blur-sm p-3 text-center">
                        <p className="text-2xl font-black">{stats.negativeCount}</p>
                        <p className="text-xs opacity-80 mt-0.5">{t("negativeCount")}</p>
                      </div>
                    </div>
                  </div>

                  {/* ─── Filter Bar ─── */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <Search size={16} className="text-[var(--text-muted)] shrink-0" />
                      <input
                        type="text"
                        placeholder={t("searchPlaceholder")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm font-bold text-[var(--text-primary)]"
                      />
                    </div>
                    <div className="flex items-center gap-2 min-w-[160px]">
                      <Filter size={16} className="text-[var(--text-muted)] shrink-0" />
                      <div className="relative flex-1">
                        <select
                          value={typeFilter}
                          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                          className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 pe-8 text-sm font-bold text-[var(--text-primary)] appearance-none"
                        >
                          <option value="">{t("allTypes")}</option>
                          {BEHAVIOR_TYPES.map((bt) => (
                            <option key={bt.value} value={bt.value}>
                              {t(bt.labelKey)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                      </div>
                    </div>
                    <button
                      onClick={() => void fetchItems()}
                      className="w-10 h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] transition"
                    >
                      <RefreshCw size={16} />
                    </button>
                    {canManage && (
                      <button
                        onClick={() => setShowForm((v) => !v)}
                        className="h-10 px-5 rounded-xl text-sm font-black text-white flex items-center gap-1.5 shadow-lg hover:shadow-xl transition-shadow"
                        style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 80%, #000))" }}
                      >
                        <Plus size={15} />
                        {t("registerBehavior")}
                      </button>
                    )}
                  </div>

                  {/* ─── Create Form (Modal-style card) ─── */}
                  {showForm && canManage && (
                    <div
                      className="rounded-2xl border-2 bg-[var(--card-bg)] p-5 sm:p-6 space-y-4 shadow-xl"
                      style={{ borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-black text-[var(--text-primary)] text-lg flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--primary) 14%, transparent)" }}>
                            <Plus size={16} className="text-[var(--primary)]" />
                          </div>
                          {t("registerTitle")}
                        </h3>
                        <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-soft)] transition">
                          <X size={18} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Student name with autocomplete */}
                        <div className="relative">
                          <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">{t("studentName")}</label>
                          <input
                            placeholder={t("studentName")}
                            value={form.student_name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setForm({ ...form, student_name: val, student_id: "" });
                              void searchStudents(val);
                              setShowSuggestions(true);
                            }}
                            onFocus={() => { if (studentSuggestions.length > 0) setShowSuggestions(true); }}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm font-bold text-[var(--text-primary)]"
                          />
                          {showSuggestions && studentSuggestions.length > 0 && (
                            <div className="absolute z-20 top-full mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl overflow-hidden">
                              {loadingSuggestions && (
                                <div className="px-3 py-2 text-xs text-[var(--text-muted)]">
                                  <Loader2 size={12} className="animate-spin inline me-1" />
                                </div>
                              )}
                              {studentSuggestions.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setForm({ ...form, student_name: s.full_name, student_id: s.id });
                                    setShowSuggestions(false);
                                  }}
                                  className="w-full px-3 py-2.5 text-start text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--surface-soft)] transition flex items-center gap-2"
                                >
                                  <span className="w-7 h-7 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-[10px] font-black shrink-0">
                                    {getInitials(s.full_name)}
                                  </span>
                                  {s.full_name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Behavior type */}
                        <div>
                          <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">{t("behaviorType")}</label>
                          <div className="relative">
                            <select
                              value={form.behavior_type}
                              onChange={(e) => {
                                const val = e.target.value;
                                setForm({
                                  ...form,
                                  behavior_type: val,
                                  points: val === "إيجابي" ? "1" : val === "سلبي" ? "-1" : "0",
                                });
                              }}
                              className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 pe-8 text-sm font-bold text-[var(--text-primary)] appearance-none"
                            >
                              <option value="">{t("selectType")}</option>
                              {BEHAVIOR_TYPES.map((bt) => (
                                <option key={bt.value} value={bt.value}>
                                  {t(bt.labelKey)}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={14} className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                          </div>
                        </div>

                        {/* Points */}
                        <div>
                          <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">{t("points")}</label>
                          <input
                            type="number"
                            value={form.points}
                            onChange={(e) => setForm({ ...form, points: e.target.value })}
                            className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm font-bold text-[var(--text-primary)]"
                          />
                        </div>

                        {/* Student ID (hidden - auto-filled from student selection) */}
                        <input type="hidden" value={form.student_id} />
                        {form.student_id && (
                          <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)]">
                            <span className="text-[10px] text-[var(--success)] font-bold">✓</span>
                            <span className="text-sm font-bold text-[var(--text-primary)] truncate">{form.student_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Note */}
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">{t("noteLabel")}</label>
                        <textarea
                          placeholder={t("noteLabel")}
                          value={form.note}
                          onChange={(e) => setForm({ ...form, note: e.target.value })}
                          rows={2}
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)]"
                        />
                      </div>

                      {/* Behavior type color preview */}
                      {form.behavior_type && (
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black"
                            style={{
                              background: `color-mix(in srgb, ${getTypeConfig(form.behavior_type).color} 14%, transparent)`,
                              color: getTypeConfig(form.behavior_type).color,
                            }}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ background: getTypeConfig(form.behavior_type).color }} />
                            {t(getTypeConfig(form.behavior_type).labelKey) || form.behavior_type}
                          </span>
                          <span className="text-sm font-black" style={{ color: Number(form.points) >= 0 ? "var(--success)" : "var(--danger)" }}>
                            {Number(form.points) >= 0 ? `+${form.points}` : form.points}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setShowForm(false)}
                          className="h-10 px-5 rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--surface-soft)] transition"
                        >
                          {t("cancel")}
                        </button>
                        <button
                          onClick={() => void handleCreate()}
                          disabled={saving}
                          className="h-10 px-6 rounded-xl text-sm font-black text-white flex items-center gap-1.5 disabled:opacity-60 shadow-lg"
                          style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 80%, #000))" }}
                        >
                          {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                          {t("save")}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ─── Stats Summary ─── */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard icon={<BarChart3 size={18} />} label={t("totalRecords")} value={String(total)} color="var(--primary)" />
                    <StatCard icon={<TrendingUp size={18} />} label={t("statsPositivePercent")} value={`${stats.positivePercent}%`} color="var(--success)" />
                    <StatCard icon={<ClipboardList size={18} />} label={t("statsNegativePercent")} value={`${stats.negativePercent}%`} color="var(--danger)" />
                    <StatCard icon={<Filter size={18} />} label={t("statsMostCommon")} value={stats.mostCommon} color="#f59e0b" />
                  </div>

                  {/* ─── Leaderboard ─── */}
                  {stats.leaderboard.length > 0 && (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 sm:p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Users size={18} className="text-[var(--primary)]" />
                        <div>
                          <h3 className="font-black text-[var(--text-primary)] text-sm">{t("leaderboard")}</h3>
                          <p className="text-[11px] text-[var(--text-muted)]">{t("leaderboardDesc")}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {stats.leaderboard.map((s, i) => (
                          <div
                            key={s.name}
                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--surface-soft)] transition"
                            style={{ animationDelay: `${i * 60}ms` }}
                          >
                            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                              style={{
                                background: i === 0 ? "linear-gradient(135deg, #f59e0b, #d97706)"
                                  : i === 1 ? "linear-gradient(135deg, #94a3b8, #64748b)"
                                  : i === 2 ? "linear-gradient(135deg, #d97706, #92400e)"
                                  : "var(--text-muted)",
                              }}
                            >
                              {i + 1}
                            </span>
                            <span className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-xs font-black">
                              {getInitials(s.name)}
                            </span>
                            <span className="flex-1 font-bold text-sm text-[var(--text-primary)] truncate">{s.name}</span>
                            <span className="text-sm font-black text-[var(--success)]">+{s.points}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ─── Records List ─── */}
                  {loading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 size={28} className="animate-spin text-[var(--primary)]" />
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-12 text-center">
                      <ClipboardList size={40} className="mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
                      <p className="font-black text-[var(--text-secondary)]">{t("noRecords")}</p>
                      <p className="text-sm text-[var(--text-muted)] mt-1">{t("noRecordsDesc")}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filtered.map((b, i) => {
                        const positive = b.points >= 0;
                        const cfg = getTypeConfig(b.behavior_type);
                        return (
                          <div
                            key={b.id}
                            className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 flex items-start gap-3 hover:shadow-md transition-shadow"
                            style={{
                              animation: `fadeInUp 0.3s ease-out ${Math.min(i, 10) * 40}ms both`,
                            }}
                          >
                            {/* Avatar */}
                            <span
                              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                              style={{
                                background: `color-mix(in srgb, ${cfg.color} 14%, transparent)`,
                                color: cfg.color,
                              }}
                            >
                              {getInitials(b.student_name)}
                            </span>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-black text-[var(--text-primary)]">{b.student_name}</p>
                                <span
                                  className="text-[10px] font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"
                                  style={{
                                    background: `color-mix(in srgb, ${cfg.color} 14%, transparent)`,
                                    color: cfg.color,
                                  }}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                                  {b.behavior_type}
                                </span>
                              </div>
                              {b.note && (
                                <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                                  {b.note}
                                </p>
                              )}
                              <p className="text-[11px] text-[var(--text-muted)] font-bold mt-1">
                                {formatDate(b.created_at, locale)}
                              </p>
                            </div>

                            {/* Points + Actions */}
                            <div className="flex items-center gap-3 shrink-0">
                              <span
                                className="text-sm font-black px-3 py-1 rounded-lg"
                                style={{
                                  background: positive
                                    ? "color-mix(in srgb, var(--success) 14%, transparent)"
                                    : "color-mix(in srgb, var(--danger) 14%, transparent)",
                                  color: positive ? "var(--success)" : "var(--danger)",
                                }}
                              >
                                {positive ? `+${b.points}` : b.points}
                              </span>
                              {canManage && (
                                <button
                                  onClick={() => setDeleteTarget(b.id)}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ─── Pagination ─── */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="h-9 px-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-xs font-bold text-[var(--text-primary)] disabled:opacity-40 hover:bg-[var(--surface-soft)] transition"
                      >
                        {t("prev")}
                      </button>
                      <span className="text-xs font-bold text-[var(--text-muted)]">
                        {t("page")} {page} {t("of")} {totalPages}
                      </span>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="h-9 px-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-xs font-bold text-[var(--text-primary)] disabled:opacity-40 hover:bg-[var(--surface-soft)] transition"
                      >
                        {t("next")}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) void handleDelete(deleteTarget); }}
        title={t("deleteTitle")}
        description={t("deleteDesc")}
        confirmLabel={t("delete")}
      />

      {/* Entrance animation keyframes */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ProtectedRoute>
  );
}

// ============================================================
// Stat Card sub-component
// ============================================================

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 flex flex-col gap-2">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
      >
        {icon}
      </div>
      <p className="text-xl font-black text-[var(--text-primary)]">{value}</p>
      <p className="text-xs font-bold text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
