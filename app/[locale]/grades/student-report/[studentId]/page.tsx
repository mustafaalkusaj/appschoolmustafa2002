"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Printer, BookOpen, TrendingUp, Users, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { useRuntimeBranding } from "@/hooks/brand/useRuntimeBranding";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { printHtmlDocument } from "@/lib/print/branding";
import { computeGradeLabel, computePercentage } from "@/lib/grades/grade-calculator";
import { GradeStatusBadge } from "@/app/[locale]/grades/_components/GradeStatusBadge";
import { GradeLabelBadge } from "@/app/[locale]/grades/_components/GradeLabelBadge";
import { buildGradeReportHtml } from "./_components/buildGradeReportHtml";
import type { GradeEntry } from "@/lib/grades/types";

interface StudentGradeResponse {
  ok: boolean;
  gate: { available: boolean; code?: string; message?: string };
  entries: GradeEntry[];
  grouped: Record<string, Record<string, GradeEntry[]>>;
}

export default function StudentReportPage({
  params,
}: {
  params: Promise<{ studentId: string; locale: string }>;
}) {
  const { studentId } = use(params);
  const pathname = usePathname();
  const router = useRouter();
  const locale = getLocaleFromPath(pathname) === "en" ? "en" : "ar";
  const isAr = locale === "ar";

  const { profile, can } = useRole();
  const schoolScope = useSchoolScope(profile);
  const runtimeBranding = useRuntimeBranding();

  const [entries, setEntries] = useState<GradeEntry[]>([]);
  const [grouped, setGrouped] = useState<Record<string, Record<string, GradeEntry[]>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const printMenuRef = useRef<HTMLDivElement>(null);

  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);

  const canView = can("view_grades");

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (printMenuRef.current && !printMenuRef.current.contains(e.target as Node)) {
        setPrintMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const schoolIdParam = schoolScope.selectedSchoolId
        ? `?schoolId=${schoolScope.selectedSchoolId}`
        : "";
      const { payload } = await fetchJsonWithAuthorizedSession<StudentGradeResponse>(
        `/api/web/grades/student/${studentId}${schoolIdParam}`,
      );
      if (payload?.ok) {
        setEntries(payload.entries ?? []);
        setGrouped(payload.grouped ?? {});
        const years = Object.keys(payload.grouped ?? {}).sort().reverse();
        if (years.length > 0) setSelectedYear(years[0]);
      } else {
        setError(isAr ? "تعذر تحميل سجلات الدرجات." : "Failed to load grade records.");
      }
    } catch {
      setError(isAr ? "حدث خطأ أثناء تحميل البيانات." : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, [studentId, schoolScope.selectedSchoolId, isAr]);

  useEffect(() => { void fetchReport(); }, [fetchReport]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const academicYears = Object.keys(grouped).sort().reverse();
  const semestersInYear = selectedYear
    ? Object.keys(grouped[selectedYear] ?? {}).map(Number).sort()
    : [];
  const currentEntries: GradeEntry[] =
    selectedYear && grouped[selectedYear]?.[String(selectedSemester)]
      ? grouped[selectedYear][String(selectedSemester)]
      : [];

  const firstEntry = entries[0];
  const studentName = firstEntry?.student_name ?? (isAr ? "طالب" : "Student");
  const className = firstEntry?.class_name ?? "";
  const sectionName = firstEntry?.section_name ?? null;

  const totalScore = currentEntries.reduce((s, e) => s + e.score, 0);
  const totalMax = currentEntries.reduce((s, e) => s + e.max_score, 0);
  const avgPct = totalMax > 0 ? computePercentage(totalScore, totalMax) : null;
  const overallLabel = avgPct !== null ? computeGradeLabel(avgPct) : null;
  const passCount = currentEntries.filter((e) => {
    const pct = e.percentage ?? computePercentage(e.score, e.max_score);
    return pct >= 50;
  }).length;
  const failCount = currentEntries.length - passCount;

  const semLabel = (n: number) =>
    isAr ? `الفصل ${n === 1 ? "الأول" : "الثاني"}` : `Semester ${n}`;

  // ── Print ──────────────────────────────────────────────────────────────────

  const brandingProps = {
    schoolName: runtimeBranding.schoolName,
    logoUrl: runtimeBranding.logoUrl,
    primaryColor: runtimeBranding.primaryColor,
    secondaryColor: runtimeBranding.secondaryColor,
  };

  const printCurrentSemester = () => {
    setPrintMenuOpen(false);
    printHtmlDocument(
      buildGradeReportHtml({
        locale,
        studentName,
        className,
        sectionName,
        academicYear: selectedYear ?? "",
        periodLabel: semLabel(selectedSemester),
        sections: [{ label: "", entries: currentEntries }],
        branding: brandingProps,
      }),
    );
  };

  const printFullYear = () => {
    setPrintMenuOpen(false);
    if (!selectedYear) return;
    const yearData = grouped[selectedYear] ?? {};
    const sections = [1, 2]
      .filter((sem) => yearData[String(sem)])
      .map((sem) => ({ label: semLabel(sem), entries: yearData[String(sem)] ?? [] }));
    printHtmlDocument(
      buildGradeReportHtml({
        locale, studentName, className, sectionName,
        academicYear: selectedYear, sections, branding: brandingProps,
      }),
    );
  };

  const printAllYears = () => {
    setPrintMenuOpen(false);
    const sections = academicYears.flatMap((year) =>
      [1, 2]
        .filter((sem) => grouped[year]?.[String(sem)])
        .map((sem) => ({
          label: `${year} – ${semLabel(sem)}`,
          entries: grouped[year]?.[String(sem)] ?? [],
        })),
    );
    printHtmlDocument(
      buildGradeReportHtml({
        locale, studentName, className, sectionName,
        sections, branding: brandingProps,
      }),
    );
  };

  // ── Table headers ──────────────────────────────────────────────────────────

  const tableHeaders = [
    isAr ? "المادة" : "Subject",
    isAr ? "نوع الدرجة" : "Grade Type",
    isAr ? "الدرجة" : "Score",
    isAr ? "من" : "Max",
    "%",
    isAr ? "التقدير" : "Grade",
    isAr ? "الحالة" : "Status",
  ];

  // ── Stats cards ────────────────────────────────────────────────────────────

  const statCards = [
    {
      label: isAr ? "إجمالي المواد" : "Total Subjects",
      value: loading ? "..." : String(currentEntries.length),
      icon: BookOpen,
      color: "var(--primary)",
    },
    {
      label: isAr ? "متوسط النسبة" : "Average",
      value: loading ? "..." : avgPct !== null ? `${avgPct.toFixed(0)}%` : "—",
      icon: TrendingUp,
      color: "var(--success)",
    },
    {
      label: isAr ? "ناجح" : "Passed",
      value: loading ? "..." : String(passCount),
      icon: CheckCircle2,
      color: "var(--success)",
    },
    {
      label: isAr ? "راسب" : "Failed",
      value: loading ? "..." : String(failCount),
      icon: Users,
      color: failCount > 0 ? "var(--danger)" : "var(--text-muted)",
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/grades" />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title={isAr ? "تقرير درجات الطالب" : "Student Grade Report"}
            subtitle={studentName}
            scope={schoolScope}
            fixed
          />

          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-6">

              {/* ── Toolbar ──────────────────────────────────────────────── */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => router.push(`/${locale}/grades`)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <span className="text-base leading-none">{isAr ? "→" : "←"}</span>
                  {isAr ? "الدرجات" : "Grades"}
                </button>

                {/* Split print button */}
                <div className="relative" ref={printMenuRef}>
                  <div className="flex items-stretch h-9 rounded-xl overflow-hidden shadow-sm"
                    style={{ boxShadow: "0 1px 4px color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                    <button
                      onClick={printCurrentSemester}
                      disabled={loading || entries.length === 0}
                      className="flex items-center gap-2 px-4 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                      style={{ background: "var(--primary)" }}
                    >
                      <Printer size={14} />
                      {isAr ? "طباعة الفصل الحالي" : "Print Semester"}
                    </button>
                    <div className="w-px bg-white/20" style={{ background: "color-mix(in srgb, var(--primary) 100%, white)" }} />
                    <button
                      onClick={() => setPrintMenuOpen((o) => !o)}
                      disabled={loading || entries.length === 0}
                      className="flex items-center px-2.5 text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                      style={{ background: "var(--primary)" }}
                      aria-label={isAr ? "المزيد" : "More options"}
                    >
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 ${printMenuOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>

                  {printMenuOpen && (
                    <div className="absolute z-50 top-full mt-1.5 end-0 w-64 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--shadow-lg)] overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-soft)]">
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                          {isAr ? "خيارات الطباعة" : "Print Options"}
                        </p>
                      </div>
                      {[
                        {
                          icon: "📄",
                          label: isAr ? "الفصل الحالي فقط" : "Current Semester",
                          sub: `${selectedYear ?? ""} — ${semLabel(selectedSemester)}`,
                          action: printCurrentSemester,
                        },
                        {
                          icon: "📋",
                          label: isAr ? "السنة الدراسية كاملة" : "Full Academic Year",
                          sub: isAr
                            ? `${selectedYear ?? ""} — الفصلان`
                            : `${selectedYear ?? ""} — Both Semesters`,
                          action: printFullYear,
                          disabled: !selectedYear,
                        },
                        {
                          icon: "📚",
                          label: isAr ? "جميع السنوات" : "All Academic Years",
                          sub: isAr
                            ? `${academicYears.length} سنة دراسية`
                            : `${academicYears.length} year${academicYears.length !== 1 ? "s" : ""}`,
                          action: printAllYears,
                          disabled: academicYears.length === 0,
                        },
                      ].map((item) => (
                        <button
                          key={item.label}
                          onClick={item.action}
                          disabled={item.disabled}
                          className="w-full flex items-start gap-3 px-4 py-3 text-start hover:bg-[var(--surface-soft)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <span className="text-lg shrink-0 mt-0.5">{item.icon}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[var(--text-primary)] leading-tight">{item.label}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{item.sub}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Permission guard ──────────────────────────────────────── */}
              {!canView ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-10 text-center">
                  <p className="text-3xl mb-3">🔒</p>
                  <p className="font-bold text-[var(--text-primary)]">
                    {isAr ? "غير مصرح بالوصول" : "Access Denied"}
                  </p>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 font-semibold">
                      {error}
                    </div>
                  )}

                  {loading ? (
                    <div className="space-y-6">
                      {/* Skeleton stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 animate-pulse" style={{ animationDelay: `${i * 60}ms` }}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="h-10 w-10 rounded-xl bg-[var(--surface-soft)]" />
                              <div className="h-7 w-12 rounded-lg bg-[var(--surface-soft)]" />
                            </div>
                            <div className="h-4 w-20 rounded bg-[var(--surface-soft)]" />
                          </div>
                        ))}
                      </div>
                      {/* Skeleton table */}
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 space-y-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-10 rounded-lg bg-[var(--surface-soft)] animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
                        ))}
                      </div>
                    </div>
                  ) : entries.length === 0 ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-10 text-center">
                      <p className="text-4xl mb-4">📋</p>
                      <p className="font-bold text-[var(--text-primary)] text-lg mb-2">
                        {isAr ? "لا توجد سجلات درجات" : "No Grade Records"}
                      </p>
                      <p className="text-sm text-[var(--text-muted)]">
                        {isAr ? "لم يتم إدخال أي درجات لهذا الطالب بعد." : "No grades entered yet."}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* ── Student info card ─────────────────────────────── */}
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] p-5 flex items-center gap-4"
                      >
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0"
                          style={{ background: "var(--primary)" }}
                        >
                          {studentName.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="font-black text-[var(--text-primary)] text-xl truncate">{studentName}</h2>
                          <p className="text-sm text-[var(--text-muted)] mt-0.5">
                            {[className, sectionName].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        {overallLabel && avgPct !== null && (
                          <div className="shrink-0 text-end">
                            <div className="text-2xl font-black" style={{ color: avgPct >= 50 ? "var(--success)" : "var(--danger)" }}>
                              {avgPct.toFixed(0)}%
                            </div>
                            <div className="text-xs text-[var(--text-muted)] mt-0.5">
                              {overallLabel.badge} {isAr ? overallLabel.labelAr : overallLabel.label}
                            </div>
                          </div>
                        )}
                      </motion.div>

                      {/* ── Stats cards ───────────────────────────────────── */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {statCards.map((card, i) => {
                          const Icon = card.icon;
                          return (
                            <motion.div
                              key={card.label}
                              initial={{ opacity: 0, y: 16 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.06, duration: 0.3 }}
                              className="group relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 overflow-hidden hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200"
                            >
                              <div className="flex flex-col gap-3">
                                <div className="flex items-start justify-between">
                                  <div
                                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                                    style={{
                                      background: `color-mix(in srgb, ${card.color} 12%, transparent)`,
                                      color: card.color,
                                    }}
                                  >
                                    <Icon size={20} />
                                  </div>
                                  <span className="text-2xl font-black leading-none tabular-nums text-[var(--text-primary)]">
                                    {card.value}
                                  </span>
                                </div>
                                <div className="text-sm font-bold text-[var(--text-primary)]">{card.label}</div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* ── Year + Semester tabs ──────────────────────────── */}
                      <div className="flex flex-wrap items-center gap-3">
                        {academicYears.length > 1 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {academicYears.map((year) => (
                              <button
                                key={year}
                                onClick={() => { setSelectedYear(year); setSelectedSemester(1); }}
                                className="px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all duration-200"
                                style={
                                  selectedYear === year
                                    ? { background: "var(--primary)", color: "#fff", boxShadow: "0 2px 8px color-mix(in srgb, var(--primary) 35%, transparent)" }
                                    : { background: "var(--surface-muted)", color: "var(--text-muted)" }
                                }
                              >
                                {year}
                              </button>
                            ))}
                          </div>
                        )}

                        {academicYears.length > 1 && (
                          <div className="w-px h-5 bg-[var(--border)]" />
                        )}

                        <div className="flex items-center gap-1.5">
                          {(semestersInYear.length > 0 ? semestersInYear : [1, 2]).map((sem) => (
                            <button
                              key={sem}
                              onClick={() => setSelectedSemester(sem as 1 | 2)}
                              className="px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all duration-200"
                              style={
                                selectedSemester === sem
                                  ? { background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)", border: "1.5px solid color-mix(in srgb, var(--primary) 30%, transparent)" }
                                  : { background: "var(--surface-muted)", color: "var(--text-muted)", border: "1.5px solid transparent" }
                              }
                            >
                              {semLabel(sem)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ── Grade table ───────────────────────────────────── */}
                      {currentEntries.length > 0 ? (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                          className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] overflow-hidden"
                        >
                          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-xl flex items-center justify-center"
                                style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)" }}>
                                <BookOpen size={16} />
                              </div>
                              <span className="text-sm font-black text-[var(--text-primary)]">
                                {semLabel(selectedSemester)}
                                {selectedYear && <span className="text-[var(--text-muted)] font-semibold ms-1.5">{selectedYear}</span>}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--surface-soft)] px-2.5 py-1 rounded-lg">
                              {currentEntries.length} {isAr ? "مادة" : "subjects"}
                            </span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-sm" dir="rtl">
                              <thead>
                                <tr className="bg-[var(--surface-soft)]">
                                  {tableHeaders.map((h) => (
                                    <th
                                      key={h}
                                      className="px-4 py-3 text-center text-xs font-black text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap border-b border-[var(--border)]"
                                    >
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--border)]">
                                {currentEntries.map((entry, idx) => {
                                  const pct = entry.percentage ?? computePercentage(entry.score, entry.max_score);
                                  return (
                                    <motion.tr
                                      key={entry.id}
                                      initial={{ opacity: 0, x: -4 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                                      className="hover:bg-[var(--surface-soft)] transition-colors"
                                    >
                                      <td className="px-4 py-3 font-bold text-[var(--text-primary)] whitespace-nowrap">
                                        {entry.subject_name ?? entry.subject_id}
                                      </td>
                                      <td className="px-4 py-3 text-center text-[var(--text-muted)] text-xs">
                                        {entry.grade_type_name ?? "—"}
                                      </td>
                                      <td className="px-4 py-3 text-center font-black text-[var(--text-primary)] text-base">
                                        {entry.score}
                                      </td>
                                      <td className="px-4 py-3 text-center text-[var(--text-muted)]">
                                        {entry.max_score}
                                      </td>
                                      <td className="px-4 py-3 text-center font-bold text-[var(--text-secondary)]">
                                        {pct.toFixed(0)}%
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <GradeLabelBadge percentage={pct} />
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <GradeStatusBadge status={entry.status} locale={locale} />
                                      </td>
                                    </motion.tr>
                                  );
                                })}
                              </tbody>

                              {avgPct !== null && (
                                <tfoot>
                                  <tr className="border-t-2 border-[var(--border)]"
                                    style={{ background: "color-mix(in srgb, var(--primary) 4%, var(--surface-soft))" }}>
                                    <td colSpan={4} className="px-4 py-3 text-xs font-black text-[var(--text-muted)] text-start">
                                      {isAr ? "المتوسط الكلي" : "Overall Average"}
                                    </td>
                                    <td className="px-4 py-3 text-center font-black text-base"
                                      style={{ color: "var(--primary)" }}>
                                      {avgPct.toFixed(0)}%
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {overallLabel && (
                                        <span className={`text-sm font-black ${overallLabel.color}`}>
                                          {overallLabel.badge} {isAr ? overallLabel.labelAr : overallLabel.label}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span
                                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                                          avgPct >= 50
                                            ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                                            : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                                        }`}
                                      >
                                        {avgPct >= 50
                                          ? (isAr ? "ناجح" : "Pass")
                                          : (isAr ? "راسب" : "Fail")}
                                      </span>
                                    </td>
                                  </tr>
                                </tfoot>
                              )}
                            </table>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-10 text-center">
                          <p className="text-3xl mb-3">📭</p>
                          <p className="text-sm text-[var(--text-muted)]">
                            {isAr ? "لا توجد سجلات لهذا الفصل الدراسي" : "No records for this semester"}
                          </p>
                        </div>
                      )}
                    </>
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
