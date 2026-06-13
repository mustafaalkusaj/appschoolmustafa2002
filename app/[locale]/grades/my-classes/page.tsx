"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner } from "@/components/SchoolScopeBanner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { GradesNavTabs } from "../_components/GradesNavTabs";

// ── Types ───────────────────────────────────────────────────────────────────

interface SubjectSummary {
  subjectId: string;
  subjectName: string;
  classId: string | null;
  className: string | null;
  totalEntries: number;
  draftCount: number;
  confirmedCount: number;
  lockedCount: number;
  avgScore: number | null;
}

interface SummaryResponse {
  ok: boolean;
  gate: { available: boolean; code?: string; message?: string };
  data: SubjectSummary[];
}

// ── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] p-5 space-y-3 animate-pulse">
      <div className="h-4 w-3/4 rounded bg-[var(--surface-muted)]" />
      <div className="h-8 w-1/3 rounded bg-[var(--surface-muted)]" />
      <div className="h-2 rounded-full bg-[var(--surface-muted)]" />
      <div className="flex gap-3">
        <div className="h-5 w-16 rounded bg-[var(--surface-muted)]" />
        <div className="h-5 w-16 rounded bg-[var(--surface-muted)]" />
        <div className="h-5 w-16 rounded bg-[var(--surface-muted)]" />
      </div>
    </div>
  );
}

// ── Subject/Class card ───────────────────────────────────────────────────────

function SubjectCard({ item, locale, onOpen }: { item: SubjectSummary; locale: string; onOpen: () => void }) {
  const passRate =
    item.totalEntries > 0
      ? Math.round(((item.confirmedCount + item.lockedCount) / item.totalEntries) * 100)
      : 0;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div>
        <p className="text-xs text-[var(--text-muted)] font-medium mb-0.5">
          {item.className ?? (locale === "ar" ? "صف غير محدد" : "Unassigned class")}
        </p>
        <h3 className="font-black text-[var(--text-primary)] text-base leading-snug">
          {item.subjectName}
        </h3>
      </div>

      {/* Average score */}
      <div className="flex items-end gap-2">
        <span className="text-4xl font-black text-[var(--primary)]">
          {item.avgScore !== null ? item.avgScore : "—"}
        </span>
        <span className="text-xs text-[var(--text-muted)] pb-1">
          {locale === "ar" ? "متوسط الدرجات" : "Avg score"}
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[var(--text-muted)]">
            {locale === "ar" ? "نسبة الاكتمال" : "Completion"}
          </span>
          <span className="text-[10px] font-bold text-[var(--text-primary)]">{passRate}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--surface-muted)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${passRate}%`,
              background:
                passRate >= 80
                  ? "var(--success)"
                  : passRate >= 50
                  ? "var(--warning)"
                  : "var(--danger)",
            }}
          />
        </div>
      </div>

      {/* Status chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
          {locale === "ar" ? `مسودة: ${item.draftCount}` : `Draft: ${item.draftCount}`}
        </span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 border border-blue-200">
          {locale === "ar" ? `مؤكد: ${item.confirmedCount}` : `Confirmed: ${item.confirmedCount}`}
        </span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 border border-green-200">
          {locale === "ar" ? `مقفل: ${item.lockedCount}` : `Locked: ${item.lockedCount}`}
        </span>
      </div>

      {/* Action */}
      <button
        onClick={onOpen}
        className="w-full mt-auto py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
        style={{ background: "var(--primary)" }}
      >
        {locale === "ar" ? "فتح جدول الدرجات" : "Open Grade Sheet"}
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MyClassesPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = getLocaleFromPath(pathname) === "en" ? "en" : "ar";

  const { profile, can } = useRole();
  const schoolScope = useSchoolScope(profile);

  const [summary, setSummary] = useState<SubjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canView = can("view_grades");

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const schoolIdParam = schoolScope.selectedSchoolId
        ? `?schoolId=${schoolScope.selectedSchoolId}`
        : "";
      const { payload } = await fetchJsonWithAuthorizedSession<SummaryResponse>(
        `/api/web/grades/my-summary${schoolIdParam}`,
      );
      if (payload?.ok) {
        setSummary(payload.data ?? []);
      } else {
        setError(locale === "ar" ? "تعذر تحميل ملخص الدرجات." : "Failed to load grade summary.");
      }
    } catch {
      setError(locale === "ar" ? "حدث خطأ أثناء تحميل البيانات." : "An error occurred while loading data.");
    } finally {
      setLoading(false);
    }
  }, [schoolScope.selectedSchoolId, locale]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  // Summary stats across all subjects
  const totalEntries = summary.reduce((s, i) => s + i.totalEntries, 0);
  const totalDraft = summary.reduce((s, i) => s + i.draftCount, 0);
  const totalConfirmed = summary.reduce((s, i) => s + i.confirmedCount, 0);
  const totalLocked = summary.reduce((s, i) => s + i.lockedCount, 0);

  const copy = {
    topbarTitle: locale === "ar" ? "صفوفي ودرجاتي" : "My Classes & Grades",
    topbarSubtitle:
      locale === "ar"
        ? "نظرة عامة على أداء الطلاب في المواد المسندة إليك"
        : "Overview of student performance across your assigned subjects",
    heroLabel: locale === "ar" ? "لوحة المعلم · الدرجات" : "Teacher Panel · Grades",
    heroTitle: locale === "ar" ? "صفوفي ودرجاتي" : "My Classes & Grades",
    heroDescription:
      locale === "ar"
        ? "نظرة عامة على أداء الطلاب في المواد المسندة إليك"
        : "Overview of student performance across your assigned subjects",
    accessDeniedTitle: locale === "ar" ? "غير مصرح بالوصول" : "Access Denied",
    accessDeniedDescription:
      locale === "ar"
        ? "ليس لديك صلاحية لعرض هذه الصفحة."
        : "You do not have permission to view this page.",
    emptyTitle: locale === "ar" ? "لم يتم إسناد أي مواد إليك بعد" : "No subjects assigned yet",
    emptyDescription:
      locale === "ar"
        ? "تواصل مع مسؤول المدرسة لإسناد المواد إليك."
        : "Contact the school administrator to assign subjects to you.",
  };

  const handleOpenGrades = (item: SubjectSummary) => {
    const base = `/${locale}/grades`;
    const qs = new URLSearchParams();
    if (item.classId) qs.set("classId", item.classId);
    if (item.subjectId) qs.set("subjectId", item.subjectId);
    router.push(`${base}?${qs.toString()}`);
  };

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
      <div className="flex min-h-screen bg-[var(--surface-muted)]">
        <AppSidebar currentPath="/grades/my-classes" />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title={copy.topbarTitle}
            subtitle={copy.topbarSubtitle}
            scope={schoolScope}
            fixed
          />

          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-6">

              {/* ── Hero Banner ──────────────────────────────────────────── */}
              <div
                className="relative rounded-2xl overflow-hidden p-6 md:p-8"
                style={{
                  background:
                    "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, #7c3aed) 100%)",
                }}
              >
                <div
                  className="absolute top-0 end-0 w-72 h-72 rounded-full pointer-events-none opacity-[0.08]"
                  style={{ background: "white", transform: "translate(35%,-40%)" }}
                />
                <div
                  className="absolute bottom-0 start-12 w-48 h-48 rounded-full pointer-events-none opacity-[0.06]"
                  style={{ background: "white", transform: "translateY(60%)" }}
                />
                <div className="relative flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white/60 text-xs font-medium mb-2 tracking-widest uppercase">
                      {copy.heroLabel}
                    </p>
                    <h1 className="text-2xl md:text-3xl font-black text-white mb-1.5 leading-tight">
                      {copy.heroTitle}
                    </h1>
                    <p className="text-white/70 text-sm">{copy.heroDescription}</p>
                  </div>
                  <div
                    className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                  >
                    <span className="text-4xl">📚</span>
                  </div>
                </div>
              </div>

              {/* ── School Scope Banner ───────────────────────────────────── */}
              <SchoolScopeBanner scope={schoolScope} />

              {/* ── Nav tabs ─────────────────────────────────────────────── */}
              <GradesNavTabs
                active="my-classes"
                locale={locale}
                canViewAnalytics={can("view_grade_analytics")}
                showMyClasses
              />

              {/* ── Permission guard ─────────────────────────────────────── */}
              {!canView ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] p-8 text-center">
                  <p className="text-2xl mb-3">🔒</p>
                  <p className="font-bold text-[var(--text-primary)] mb-1">{copy.accessDeniedTitle}</p>
                  <p className="text-sm text-[var(--text-muted)]">{copy.accessDeniedDescription}</p>
                </div>
              ) : (
                <>
                  {/* ── Error ─────────────────────────────────────────────── */}
                  {error && (
                    <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 font-medium">
                      {error}
                    </div>
                  )}

                  {/* ── Summary stat cards ────────────────────────────────── */}
                  {!loading && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        {
                          label: locale === "ar" ? "إجمالي السجلات" : "Total Entries",
                          value: totalEntries,
                          color: "var(--primary)",
                          bg: "color-mix(in srgb, var(--primary) 10%, transparent)",
                        },
                        {
                          label: locale === "ar" ? "مسودة" : "Draft",
                          value: totalDraft,
                          color: "var(--text-muted)",
                          bg: "var(--surface-muted)",
                        },
                        {
                          label: locale === "ar" ? "مؤكد" : "Confirmed",
                          value: totalConfirmed,
                          color: "#3b82f6",
                          bg: "rgb(239 246 255)",
                        },
                        {
                          label: locale === "ar" ? "مقفل" : "Locked",
                          value: totalLocked,
                          color: "var(--success)",
                          bg: "color-mix(in srgb, var(--success) 10%, transparent)",
                        },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] p-4 text-center"
                        >
                          <p
                            className="text-3xl font-black"
                            style={{ color: stat.color }}
                          >
                            {stat.value}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Content ───────────────────────────────────────────── */}
                  {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <SkeletonCard key={i} />
                      ))}
                    </div>
                  ) : summary.length === 0 ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] p-10 text-center">
                      <p className="text-4xl mb-4">📭</p>
                      <p className="font-bold text-[var(--text-primary)] text-lg mb-2">{copy.emptyTitle}</p>
                      <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">{copy.emptyDescription}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {summary.map((item) => (
                        <SubjectCard
                          key={`${item.subjectId}__${item.classId}`}
                          item={item}
                          locale={locale}
                          onOpen={() => handleOpenGrades(item)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
