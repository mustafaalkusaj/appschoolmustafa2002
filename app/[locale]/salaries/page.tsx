"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { formatNumber, formatDate } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useRuntimeBranding } from "@/hooks/brand";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { printHtmlDocument, wrapPrintDocument, escapeHtml } from "@/lib/print/branding";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { useSalariesData } from "./_hooks";
import {
  SalariesSidebar,
  QuickAccessGrid,
  TeachersTable,
  TeacherDetailPanel,
  TeacherModal,
  PaySalaryModal,
  TeacherDropdownMenu,
  ScheduleSection,
  DeductionsSection,
  ReportsSection,
  CalendarSection,
  ArchiveSection,
  SettingsSection,
  PricesModal,
  LessonTimesModal,
  DailyLogModal,
  ExportModal,
  PrintModal,
  ManagerModals,
} from "./_components";
import { EMPTY_TEACHER_FORM, EMPTY_SALARY_FORM, EMPTY_EXPORT_OPTIONS, SIDEBAR_ITEMS, type Teacher, type TeacherFormData, type SalaryFormData, type ExportOptions } from "./_types";
import { cn } from "@/lib/brand/brand-utils";
import { AlertCircle, Wallet, Users, Banknote, CalendarCheck, CheckCircle2, Archive, CalendarDays, CalendarRange, BarChart3, Settings } from "@/lib/icons";
import { useArchiveMode } from "@/hooks/useArchiveMode";
import { useCurrency } from "@/hooks/useCurrency";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect as useEffectAnim } from "react";

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);
  useEffectAnim(() => { const u = rounded.on("change", setDisplay); return u; }, [rounded]);
  useEffectAnim(() => { const c = animate(motionVal, value, { duration: 0.7, ease: "easeOut" }); return c.stop; }, [value, motionVal]);
  return <span>{display.toLocaleString("ar-IQ-u-nu-latn")}</span>;
}

type SalaryPaymentResponse = {
  salary?: {
    id: string;
    school_id: string;
    branch_id: string | null;
    teacher_id: string;
    gross_salary: number;
    deductions: number;
    month: string;
    is_paid: boolean;
    paid_at: string | null;
    notes: string | null;
    created_at?: string;
    teachers?: {
      full_name: string | null;
      subject: string | null;
    } | null;
  };
  warning?: string;
  error?: { message?: string };
};

export default function SalariesPage() {
  const t = useTranslations();
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isEnglish = locale === "en";
  const { profile, canAny } = useRole();
  const runtimeBranding = useRuntimeBranding();
  const canManageTeacher = canAny(["manage_salaries"]);
  const schoolScope = useSchoolScope(profile);

  const currency = useCurrency();
  const archiveMode = useArchiveMode();

  // Main data hook
  const salariesData = useSalariesData(profile, schoolScope, runtimeBranding.branchId);
  const {
    schoolId,
    loading,
    error,
    success,
    teachers,
    salaries,
    classes,
    subjectsList,
    jobTitlesList,
    dailyLectures,
    archives,
    lessonTimes,
    lecturePrices,
    deductionsList,
    calLectureDates,
    reportSummary,
    reportTotals,
    reportLoading,
    setSuccess,
    setError,
    fetchAll,
    ensureReferenceData,
    ensureArchivesData,
    fetchCalendarLectures,
    fetchDetailedReportAll,
    fetchReportSummary,
    fetchDeductionsList,
    loadTeacherMonthLectures,
    getBranchId,
    archiveMonth,
  } = salariesData;

  // UI State
  const [activeSection, setActiveSection] = useState("main");
  const [showQuickAll, setShowQuickAll] = useState(false);
  const [currentMonth] = useState(new Date().toISOString().slice(0, 7));

  // Teacher Modal State
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherModalSaving, setTeacherModalSaving] = useState(false);
  const [teacherModalError, setTeacherModalError] = useState("");
  const [teacherEditId, setTeacherEditId] = useState<string | null>(null);
  const [teacherForm, setTeacherForm] = useState<TeacherFormData>(EMPTY_TEACHER_FORM);

  // Pay Salary Modal State
  const [showPaySalary, setShowPaySalary] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [savingSalary, setSavingSalary] = useState(false);
  const [salaryForm, setSalaryForm] = useState<SalaryFormData>(EMPTY_SALARY_FORM);
  const [lectureSalaryCalc, setLectureSalaryCalc] = useState({ count: 0, total: 0 });

  // Detail Panel State
  const [showDetail, setShowDetail] = useState(false);
  const [detailTeacher, setDetailTeacher] = useState<Teacher | null>(null);

  // Dropdown Menu State
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  // Schedule State
  const [scheduleGrade, setScheduleGrade] = useState("");
  const [scheduleSection, setScheduleSection] = useState("");
  const [scheduleGrid, setScheduleGrid] = useState<Record<string, string>>({});
  const [scheduleSaving, setScheduleSaving] = useState(false);

  // Deductions State
  const [deductionTeacher, setDeductionTeacher] = useState("");
  const [deductionAmount, setDeductionAmount] = useState("0");
  const [deductionNotes, setDeductionNotes] = useState("");
  const [savingDeduction, setSavingDeduction] = useState(false);

  // Reports State
  const [reportView, setReportView] = useState<"summary" | "details">("summary");
  const [reportTeacher, setReportTeacher] = useState("");

  // Calendar State
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  // Prices State
  const [showPrices, setShowPrices] = useState(false);
  const [priceEdits, setPriceEdits] = useState<Record<string, number>>({});

  // Lesson Times State
  const [showLessonTimes, setShowLessonTimes] = useState(false);
  const [timeEdits, setTimeEdits] = useState<Record<string, string>>({});

  // Daily Log State
  const [showDailyLog, setShowDailyLog] = useState(false);
  const [dailyTeacher, setDailyTeacher] = useState("");
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split("T")[0]);
  const [dailyGrades, setDailyGrades] = useState<string[]>([]);
  const [dailyPeriods, setDailyPeriods] = useState<string[]>([]);
  const [savingDaily, setSavingDaily] = useState(false);

  // Export State
  const [showExport, setShowExport] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>(EMPTY_EXPORT_OPTIONS);

  // Print State
  const [showPrint, setShowPrint] = useState(false);
  const [printTeacher, setPrintTeacher] = useState("");

  // Manager Modals State
  const [showSubjectsMgr, setShowSubjectsMgr] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [showJobTitlesMgr, setShowJobTitlesMgr] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [showClassesMgr, setShowClassesMgr] = useState(false);
  const [newGrade, setNewGrade] = useState("");
  const [newSection, setNewSection] = useState("");
  const [newSectionGrade, setNewSectionGrade] = useState("");

  // Archive Confirm
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Derived data
  const monthSalaries = useMemo(() => salaries.filter((s) => s.month === currentMonth), [salaries, currentMonth]);
  const paidTeacherIds = useMemo(() => monthSalaries.map((s) => s.teacher_id), [monthSalaries]);
  const unpaidTeachers = useMemo(() => teachers.filter((t) => !paidTeacherIds.includes(t.id) && t.status === "active"), [teachers, paidTeacherIds]);
  const totalBaseSalaries = useMemo(() => teachers.filter((t) => t.status === "active").reduce((a, t) => a + t.base_salary, 0), [teachers]);
  const totalPaidThisMonth = useMemo(() => monthSalaries.reduce((a, s) => a + Math.max(0, (s.gross_salary || 0) - (s.deductions || 0)), 0), [monthSalaries]);
  const activeTeachers = useMemo(() => teachers.filter((t) => t.status === "active").length, [teachers]);
  const gradeOptions = useMemo(() => Array.from(new Set(classes.map((c) => c.grade))) as string[], [classes]);
  const isMainSection = activeSection === "main";

  const handleResponsiveSectionChange = (section: string) => {
    setActiveSection(section);
    if (section === "deductions") void fetchDeductionsList();
    if (section === "calendar") void fetchCalendarLectures(calYear, calMonth);
  };

  // Effects & Logic (same as before)
  useEffect(() => {
    const close = () => setActiveMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    if (activeSection === "calendar") void fetchCalendarLectures(calYear, calMonth);
  }, [activeSection, calYear, calMonth, fetchCalendarLectures]);

  useEffect(() => {
    if (activeSection === "reports" && reportView === "summary") void fetchReportSummary();
    if (activeSection === "reports" && reportView === "details") void fetchDetailedReportAll(reportTeacher);
  }, [activeSection, fetchDetailedReportAll, fetchReportSummary, reportTeacher, reportView]);

  useEffect(() => {
    if (activeSection === "deductions") void fetchDeductionsList();
  }, [activeSection, fetchDeductionsList]);

  useEffect(() => {
    if (activeSection === "archive") void ensureArchivesData();
  }, [activeSection, ensureArchivesData]);

  useEffect(() => {
    if (activeSection === "schedule_tab" || showTeacherModal || showSubjectsMgr || showJobTitlesMgr || showClassesMgr || showPrices || showLessonTimes || showDailyLog || showExport) {
      void ensureReferenceData();
    }
  }, [activeSection, ensureReferenceData, showClassesMgr, showDailyLog, showExport, showJobTitlesMgr, showLessonTimes, showPrices, showSubjectsMgr, showTeacherModal]);

  useEffect(() => {
    if (!showPrices) return;
    const edits: Record<string, number> = {};
    gradeOptions.forEach((grade) => {
      edits[grade] = lecturePrices.find((p) => p.grade === grade)?.price_per_lecture || 0;
    });
    setPriceEdits(edits);
  }, [classes, lecturePrices, showPrices, gradeOptions]);

  useEffect(() => {
    if (!showPaySalary || !selectedTeacher || !schoolId) return;
    let canceled = false;
    (async () => {
      const stats = await loadTeacherMonthLectures(selectedTeacher, salaryForm.month);
      if (canceled) return;
      setLectureSalaryCalc(stats);
      let grossBase = parseFloat(salaryForm.gross_salary) || 0;
      if (selectedTeacher.salary_type === "fixed") grossBase = Number(selectedTeacher.base_salary) || 0;
      else if (selectedTeacher.salary_type === "hourly") grossBase = stats.total;
      else if (selectedTeacher.salary_type === "mixed") grossBase = (Number(selectedTeacher.base_salary) || 0) + stats.total;
      setSalaryForm((prev) => ({ ...prev, gross_salary: grossBase.toString() }));
    })();
    return () => { canceled = true; };
  }, [showPaySalary, selectedTeacher, salaryForm.month, schoolId, loadTeacherMonthLectures]);

  // Operations
  const openTeacherAdd = async () => { await ensureReferenceData(); setTeacherEditId(null); setTeacherForm(EMPTY_TEACHER_FORM); setTeacherModalError(""); setShowTeacherModal(true); };
  const openTeacherEdit = async (t: Teacher) => {
    await ensureReferenceData();
    setTeacherEditId(t.id);
    const ct = (t.classes_taught as { grade: string; section: string }[]) || [];
    setTeacherForm({
      full_name: String(t.full_name ?? ""),
      job_title: String(t.job_title ?? ""),
      salary_type:
        t.salary_type === "fixed" || t.salary_type === "hourly" || t.salary_type === "mixed"
          ? t.salary_type
          : "fixed",
      subject: String(t.subject ?? ""),
      phone: String(t.phone ?? ""),
      address: String(t.address ?? ""),
      base_salary: String(t.base_salary ?? ""),
      lecture_price: String(t.lecture_price ?? ""),
      weekly_hours: String(t.weekly_hours ?? ""),
      classes_taught: ct.length ? ct : [{ grade: "", section: "" }],
      status: t.status === "inactive" ? "inactive" : "active",
    });
    setTeacherModalError(""); setShowTeacherModal(true);
  };

  const saveTeacherModal = async (e: React.FormEvent) => {
    e.preventDefault(); if (!canManageTeacher || !schoolId) return;
    setTeacherModalSaving(true); setTeacherModalError("");
    const validClasses = teacherForm.classes_taught.filter((c) => c.grade);
    const payload = { school_id: schoolId, full_name: teacherForm.full_name.trim(), subject: teacherForm.subject || null, job_title: teacherForm.job_title || null, salary_type: teacherForm.salary_type, phone: teacherForm.phone || null, address: teacherForm.address || null, base_salary: parseInt(teacherForm.base_salary, 10) || 0, lecture_price: parseInt(teacherForm.lecture_price, 10) || 0, weekly_hours: parseInt(teacherForm.weekly_hours, 10) || 0, classes_taught: validClasses.length ? validClasses : [], status: teacherForm.status };
    if (!payload.full_name) { setTeacherModalError("يرجى إدخال الاسم"); setTeacherModalSaving(false); return; }
    const { response, payload: res } = await fetchJsonWithAuthorizedSession<{ teacher?: Teacher; error?: { message?: string } }>(teacherEditId ? `/api/web/teachers/${teacherEditId}` : "/api/web/teachers", { method: teacherEditId ? "PATCH" : "POST", headers: withJsonHeaders(), body: JSON.stringify(payload) });
    if (!response.ok) setTeacherModalError(res?.error?.message || "تعذر حفظ البيانات.");
    else { setShowTeacherModal(false); await fetchAll(); }
    setTeacherModalSaving(false);
  };

  const handlePaySalary = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedTeacher) return;
    setSavingSalary(true); setError("");
    let gross = 0;
    if (selectedTeacher.salary_type === "fixed") gross = Number(selectedTeacher.base_salary) || 0;
    else if (selectedTeacher.salary_type === "hourly") gross = lectureSalaryCalc.total;
    else if (selectedTeacher.salary_type === "mixed") gross = (Number(selectedTeacher.base_salary) || 0) + lectureSalaryCalc.total;
    else gross = parseFloat(salaryForm.gross_salary) || Number(selectedTeacher.base_salary) || 0;
    const { response, payload } = await fetchJsonWithAuthorizedSession<SalaryPaymentResponse>("/api/web/salaries/pay", { method: "POST", headers: withJsonHeaders(), body: JSON.stringify({ school_id: schoolId, teacher_id: selectedTeacher.id, gross_salary: gross, deductions: parseFloat(salaryForm.deductions) || 0, month: salaryForm.month, notes: salaryForm.notes || null, branch_id: runtimeBranding.branchId || null }) });
    if (!response.ok) setError(payload?.error?.message || "تعذر صرف الراتب.");
    else { setSuccess(`تم دفع الراتب بنجاح ✓`); setShowPaySalary(false); fetchAll(); setTimeout(() => setSuccess(""), 3000); }
    setSavingSalary(false);
  };

  const fetchSchedule = async (grade: string, section: string) => {
    if (!schoolId) return;
    const params = new URLSearchParams({ schoolId, grade, section });
    if (runtimeBranding.branchId) params.set("branchId", runtimeBranding.branchId);
    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      schedule?: { day: string; period: number; session_type: string; teacher_id: string | null }[];
      error?: { message?: string };
    }>(`/api/web/salaries/schedule?${params.toString()}`);
    if (!response.ok) {
      setError(payload?.error?.message || "تعذر تحميل الجدول.");
      return;
    }
    const grid: Record<string, string> = {};
    payload?.schedule?.forEach((entry) => {
      grid[`${entry.day}-${entry.period}-${entry.session_type}`] = entry.teacher_id || "";
    });
    setScheduleGrid(grid);
  };

  const saveSchedule = async () => {
    if (!schoolId || !scheduleGrade || !scheduleSection) return;
    setScheduleSaving(true);
    setError("");

    try {
      const rows = Object.entries(scheduleGrid)
        .filter(([, teacherId]) => Boolean(teacherId))
        .map(([key, teacherId]) => {
          const [day, period, sessionType] = key.split("-");
          return { day, period: parseInt(period, 10), session_type: sessionType, teacher_id: teacherId };
        });

      const { response, payload } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>(
        "/api/web/salaries/schedule",
        {
          method: "PUT",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            school_id: schoolId,
            branch_id: runtimeBranding.branchId || null,
            grade: scheduleGrade,
            section: scheduleSection,
            rows,
          }),
        },
      );
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر حفظ الجدول.");
      setSuccess("تم حفظ الجدول ✓");
      setTimeout(() => setSuccess(""), 3000);
    } catch (scheduleError) {
      setError(scheduleError instanceof Error ? scheduleError.message : "تعذر حفظ الجدول.");
    } finally {
      setScheduleSaving(false);
    }
  };

  const savePrices = async () => {
    if (!schoolId) return;
    setError("");

    try {
      const entries = gradeOptions.map((grade) => ({ grade, price: priceEdits[grade] || 0 }));
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>(
        "/api/web/salaries/prices",
        {
          method: "PUT",
          headers: withJsonHeaders(),
          body: JSON.stringify({ school_id: schoolId, entries }),
        },
      );
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر حفظ الأسعار.");
      setSuccess("تم حفظ الأسعار ✓");
      setShowPrices(false);
      await fetchAll();
      setTimeout(() => setSuccess(""), 3000);
    } catch (priceError) {
      setError(priceError instanceof Error ? priceError.message : "تعذر حفظ الأسعار.");
    }
  };

  const saveLessonTimes = async () => {
    if (!schoolId) return;
    setError("");

    try {
      const updates = lessonTimes.map((lessonTime) => ({
        id: lessonTime.id,
        start_time: timeEdits[`${lessonTime.period}-${lessonTime.session_type}-start`] ?? lessonTime.start_time ?? null,
        end_time: timeEdits[`${lessonTime.period}-${lessonTime.session_type}-end`] ?? lessonTime.end_time ?? null,
      }));

      const { response, payload } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>(
        "/api/web/salaries/lesson-times",
        {
          method: "PATCH",
          headers: withJsonHeaders(),
          body: JSON.stringify({ school_id: schoolId, updates }),
        },
      );
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر حفظ التوقيتات.");
      setSuccess("تم حفظ توقيتات الدروس ✓");
      setShowLessonTimes(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (lessonTimesError) {
      setError(lessonTimesError instanceof Error ? lessonTimesError.message : "تعذر حفظ توقيتات الدروس.");
    }
  };

  const saveDailyLog = async () => {
    if (!schoolId || !dailyTeacher || !dailyDate) return;
    setSavingDaily(true);
    setError("");

    try {
      const branchId = await getBranchId();
      const selectedTeacherRow = teachers.find((teacher) => teacher.id === dailyTeacher);
      const teacherLecturePrice = Number(selectedTeacherRow?.lecture_price) || 0;
      const rows = dailyGrades.flatMap((gradeSection) => {
        const [grade, section] = gradeSection.split("||");
        const classPrice = lecturePrices.find((entry) => entry.grade === grade)?.price_per_lecture || 0;
        const price = teacherLecturePrice > 0 ? teacherLecturePrice : classPrice;

        return dailyPeriods.map((periodKey) => {
          const [period, sessionType] = periodKey.split("-");
          return {
            school_id: schoolId,
            branch_id: branchId,
            teacher_id: dailyTeacher,
            grade,
            section,
            period: parseInt(period, 10),
            session_type: sessionType,
            lecture_date: dailyDate,
            price,
          };
        });
      });

      if (rows.length > 0) {
        const { error: insertError } = await supabase.from("daily_lectures").insert(rows);
        if (insertError) {
          throw insertError;
        }
      }

      setSuccess(`تم تسجيل ${rows.length} محاضرة ✓`);
      setDailyGrades([]);
      setDailyPeriods([]);
      setShowDailyLog(false);
      await fetchDetailedReportAll();
      await fetchCalendarLectures(calYear, calMonth);
      setTimeout(() => setSuccess(""), 3000);
    } catch (dailyLogError) {
      setError(dailyLogError instanceof Error ? dailyLogError.message : "تعذر تسجيل المحاضرات.");
    } finally {
      setSavingDaily(false);
    }
  };

  const saveDeduction = async () => {
    if (!schoolId || !deductionTeacher || !deductionAmount) return;
    setSavingDeduction(true);
    setError("");

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>("/api/web/salaries/deductions", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          school_id: schoolId,
          teacher_id: deductionTeacher,
          amount: parseFloat(deductionAmount) || 0,
          notes: deductionNotes || null,
          deduction_date: new Date().toISOString().split("T")[0],
        }),
      });

      if (!response.ok) {
        setError(payload?.error?.message || "تعذر تسجيل السحب.");
        return;
      }

      setSuccess("تم تسجيل السحب ✓");
      setDeductionTeacher("");
      setDeductionAmount("0");
      setDeductionNotes("");
      await fetchDeductionsList();
      setTimeout(() => setSuccess(""), 3000);
    } finally {
      setSavingDeduction(false);
    }
  };

  const doExport = async () => {
    await ensureReferenceData();
    let exportLectures = dailyLectures;

    if (exportOptions.lectures && dailyLectures.length === 0) {
      await fetchDetailedReportAll(reportTeacher);
      exportLectures = reportTeacher ? dailyLectures.filter((lecture) => lecture.teacher_id === reportTeacher) : dailyLectures;
    }

    const { downloadExcelExport } = await import("@/lib/excel-client");
    const sheets = [];

    if (exportOptions.teachers) {
      sheets.push({
        name: "الأساتذة", title: "الأساتذة",
        columns: [
          { header: "الاسم",        key: "name",    width: 26 },
          { header: "المسمى",       key: "title",   width: 18 },
          { header: "المادة",       key: "subject", width: 16 },
          { header: "الراتب",       key: "salary",  width: 16, numFmt: "#,##0" },
          { header: "سعر المحاضرة",key: "price",   width: 16, numFmt: "#,##0" },
        ],
        rows: teachers.map((teacher) => ({
          name: teacher.full_name, title: teacher.job_title || "",
          subject: teacher.subject || "", salary: teacher.base_salary,
          price: teacher.lecture_price || 0,
        })),
      });
    }

    if (exportOptions.subjects) {
      sheets.push({
        name: "المواد", title: "المواد",
        columns: [{ header: "المادة", key: "name", width: 28 }],
        rows: subjectsList.map((subject) => ({ name: subject.name })),
      });
    }

    if (exportOptions.classes) {
      sheets.push({
        name: "الصفوف", title: "الصفوف",
        columns: [
          { header: "الصف",   key: "grade",   width: 16 },
          { header: "الشعبة", key: "section", width: 12 },
        ],
        rows: classes.map((classroom) => ({ grade: classroom.grade, section: classroom.section })),
      });
    }

    if (exportOptions.prices) {
      sheets.push({
        name: "الأسعار", title: "أسعار المحاضرات",
        columns: [
          { header: "الصف",  key: "grade", width: 16 },
          { header: "السعر", key: "price", width: 16, numFmt: "#,##0" },
        ],
        rows: lecturePrices.map((entry) => ({ grade: entry.grade, price: entry.price_per_lecture })),
      });
    }

    if (exportOptions.fixed_salaries) {
      sheets.push({
        name: "الرواتب", title: "الرواتب الشهرية",
        columns: [
          { header: "الأستاذ",   key: "teacher",    width: 24 },
          { header: "الشهر",     key: "month",      width: 14 },
          { header: "الإجمالي",  key: "gross",      width: 16, numFmt: "#,##0" },
          { header: "الخصومات",  key: "deductions", width: 16, numFmt: "#,##0", fixedColor: "red" as const },
          { header: "الصافي",    key: "net",        width: 16, numFmt: "#,##0", fixedColor: "green" as const },
        ],
        rows: salaries.map((salary) => ({
          teacher: salary.teachers?.full_name || "", month: salary.month,
          gross: salary.gross_salary, deductions: salary.deductions || 0,
          net: Math.max(0, (salary.gross_salary || 0) - (salary.deductions || 0)),
        })),
      });
    }

    if (exportOptions.lectures) {
      sheets.push({
        name: "المحاضرات", title: "سجل المحاضرات",
        columns: [
          { header: "الأستاذ", key: "teacher", width: 24 },
          { header: "التاريخ", key: "date",    width: 14 },
          { header: "الصف",    key: "grade",   width: 12 },
          { header: "الشعبة",  key: "section", width: 10 },
          { header: "الدرس",   key: "period",  width: 10 },
          { header: "النوع",   key: "type",    width: 12 },
          { header: "السعر",   key: "price",   width: 14, numFmt: "#,##0" },
        ],
        rows: exportLectures.map((lecture) => ({
          teacher: lecture.teachers?.full_name || "", date: lecture.lecture_date,
          grade: lecture.grade, section: lecture.section,
          period: lecture.period, type: lecture.session_type, price: lecture.price,
        })),
      });
    }

    if (exportOptions.lesson_times) {
      sheets.push({
        name: "التوقيتات", title: "توقيتات الدروس",
        columns: [
          { header: "الفترة",  key: "session", width: 12 },
          { header: "الدرس",   key: "period",  width: 10 },
          { header: "البداية", key: "start",   width: 12 },
          { header: "النهاية", key: "end",     width: 12 },
        ],
        rows: lessonTimes.map((lessonTime) => ({
          session: lessonTime.session_type === "morning" ? "صباحي" : "ظهري",
          period: lessonTime.period, start: lessonTime.start_time, end: lessonTime.end_time,
        })),
      });
    }

    if (sheets.length === 0) {
      setError("اختر بيانات للتصدير");
      return;
    }

    await downloadExcelExport({ filename: `تصدير_${formatDate(new Date())}.xlsx`, sheets });
    setShowExport(false);
  };

  const openPrintWindow = (title: string, subtitle: string, bodyHtml: string) => {
    printHtmlDocument(
      wrapPrintDocument({
        title,
        subtitle,
        bodyHtml,
        branding: {
          schoolName: runtimeBranding.schoolName,
          logoUrl: runtimeBranding.logoUrl,
          primaryColor: runtimeBranding.primaryColor,
          secondaryColor: runtimeBranding.secondaryColor,
          locale: isEnglish ? "en" : "ar",
        },
        autoPrint: false,
      })
    );
  };

  const printSalarySlip = (salary: (typeof salaries)[number]) => {
    const net = Math.max(0, (salary.gross_salary || 0) - (salary.deductions || 0));
    openPrintWindow(
      isEnglish ? "Salary slip" : "قسيمة راتب",
      escapeHtml(salary.teachers?.full_name || (isEnglish ? "Teacher account" : "سجل الأستاذ")),
      `<div class="print-grid">
        <div class="print-panel"><span class="print-label">${isEnglish ? "Teacher" : "الاسم"}</span><div class="print-value">${escapeHtml(salary.teachers?.full_name || "—")}</div></div>
        <div class="print-panel"><span class="print-label">${isEnglish ? "Month" : "الشهر"}</span><div class="print-value">${escapeHtml(salary.month || "—")}</div></div>
        <div class="print-panel"><span class="print-label">${isEnglish ? "Gross salary" : "الإجمالي"}</span><div class="print-value">${currency} ${formatNumber(salary.gross_salary || 0)}</div></div>
        <div class="print-panel"><span class="print-label">${isEnglish ? "Deductions" : "الخصومات"}</span><div class="print-value" style="color:#dc2626">${currency} ${formatNumber(salary.deductions || 0)}</div></div>
      </div>
      <div class="print-panel" style="margin-top:16px;text-align:center;background:linear-gradient(135deg,var(--print-surface),#ffffff)">
        <span class="print-label">${isEnglish ? "Net amount" : "الصافي"}</span>
        <div class="print-value" style="font-size:30px">${currency} ${formatNumber(net)}</div>
      </div>`
    );
  };

  const printReport = (teacherId = reportTeacher) => {
    const teacher = teacherId ? teachers.find((entry) => entry.id === teacherId) : null;
    const lectures = teacherId ? dailyLectures.filter((lecture) => lecture.teacher_id === teacherId) : dailyLectures;
    const total = lectures.reduce((sum, lecture) => sum + (lecture.price || 0), 0);

    openPrintWindow(
      isEnglish ? "Teacher statement" : "كشف حساب",
      teacher?.full_name || (isEnglish ? "All teachers" : "جميع الأساتذة"),
      `<table><thead><tr><th>#</th><th>${isEnglish ? "Date" : "التاريخ"}</th><th>${isEnglish ? "Class" : "الصف"}</th><th>${isEnglish ? "Section" : "الشعبة"}</th><th>${isEnglish ? "Lesson" : "الدرس"}</th><th>${isEnglish ? "Price" : "السعر"}</th></tr></thead>
        <tbody>${lectures.map((lecture, index) => `<tr><td>${index + 1}</td><td>${formatDate(lecture.lecture_date)}</td><td>${escapeHtml(lecture.grade || "—")}</td><td>${escapeHtml(lecture.section || "—")}</td><td>${isEnglish ? "Lesson" : "الدرس"} ${escapeHtml(String(lecture.period ?? "—"))}</td><td>${formatNumber(lecture.price || 0)}</td></tr>`).join("")}</tbody></table>
        <div class="print-panel" style="margin-top:16px;text-align:center"><span class="print-label">${isEnglish ? "Total" : "الإجمالي"}</span><div class="print-value">${currency} ${formatNumber(total)}</div></div>`
    );
  };

  const printAllTeachers = () => {
    openPrintWindow(
      isEnglish ? "Teachers summary" : "تقرير شامل",
      isEnglish ? `${teachers.length} teachers` : `${teachers.length} أستاذ`,
      `<table><thead><tr><th>#</th><th>${isEnglish ? "Name" : "الاسم"}</th><th>${isEnglish ? "Job title" : "المسمى"}</th><th>${isEnglish ? "Subject" : "المادة"}</th><th>${isEnglish ? "Salary" : "الراتب"}</th><th>${isEnglish ? "Lecture price" : "سعر المحاضرة"}</th></tr></thead>
        <tbody>${teachers.map((teacher, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(teacher.full_name || "—")}</td><td>${escapeHtml(teacher.job_title || "—")}</td><td>${escapeHtml(teacher.subject || "—")}</td><td>${formatNumber(teacher.base_salary || 0)}</td><td>${formatNumber(teacher.lecture_price || 0)}</td></tr>`).join("")}</tbody></table>`
    );
  };

  const addSubject = async () => {
    if (!schoolId || !newSubject.trim()) return;
    setError("");

    const { error: subjectError } = await supabase.from("subjects").insert({ school_id: schoolId, name: newSubject.trim() });
    if (subjectError) {
      setError(subjectError.message || "تعذر إضافة المادة.");
      return;
    }

    setNewSubject("");
    await fetchAll();
  };

  const deleteSubject = async (id: string) => {
    const { error: subjectError } = await supabase.from("subjects").delete().eq("id", id);
    if (subjectError) {
      setError(subjectError.message || "تعذر حذف المادة.");
      return;
    }

    await fetchAll();
  };

  const addJobTitle = async () => {
    if (!schoolId || !newJobTitle.trim()) return;
    setError("");

    const { error: jobTitleError } = await supabase.from("job_titles").insert({ school_id: schoolId, name: newJobTitle.trim() });
    if (jobTitleError) {
      setError(jobTitleError.message || "تعذر إضافة المسمى الوظيفي.");
      return;
    }

    setNewJobTitle("");
    await fetchAll();
  };

  const deleteJobTitle = async (id: string) => {
    const { error: jobTitleError } = await supabase.from("job_titles").delete().eq("id", id);
    if (jobTitleError) {
      setError(jobTitleError.message || "تعذر حذف المسمى الوظيفي.");
      return;
    }

    await fetchAll();
  };

  const addClass = async () => {
    if (!schoolId || !newGrade.trim()) return;
    setError("");

    const branchId = await getBranchId();
    const { error: classError } = await supabase
      .from("classes")
      .insert({ school_id: schoolId, branch_id: branchId, grade: newGrade.trim(), section: "أ" });

    if (classError) {
      setError(classError.message || "تعذر إضافة الصف.");
      return;
    }

    setNewGrade("");
    await fetchAll();
  };

  const addSection = async () => {
    if (!schoolId || !newSectionGrade || !newSection.trim()) return;
    setError("");

    const branchId = await getBranchId();
    const { error: sectionError } = await supabase
      .from("classes")
      .insert({ school_id: schoolId, branch_id: branchId, grade: newSectionGrade, section: newSection.trim() });

    if (sectionError) {
      setError(sectionError.message || "تعذر إضافة الشعبة.");
      return;
    }

    setNewSection("");
    await fetchAll();
  };

  const deleteClass = async (id: string) => {
    const { error: classError } = await supabase.from("classes").delete().eq("id", id);
    if (classError) {
      setError(classError.message || "تعذر حذف الصف أو الشعبة.");
      return;
    }

    await fetchAll();
  };

  const openMenu = (event: React.MouseEvent, teacher: Teacher) => {
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left - 100 });
    setActiveMenu((current) => (current === teacher.id ? null : teacher.id));
    setSelectedTeacher(teacher);
  };

  const onPaySalary = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setSalaryForm({
      gross_salary: teacher.base_salary.toString(),
      deductions: "0",
      notes: "",
      month: currentMonth,
    });
    setShowPaySalary(true);
  };

  const openPrintReport = async (teacherId: string) => {
    setPrintTeacher(teacherId);
    setReportTeacher(teacherId);
    await fetchDetailedReportAll(teacherId);
    printReport(teacherId);
  };

  const handleQuickAction = (id: string) => {
    if (id === "add_teacher") void openTeacherAdd();
    else if (id === "classes") setShowClassesMgr(true);
    else if (id === "subjects") setShowSubjectsMgr(true);
    else if (id === "titles") setShowJobTitlesMgr(true);
    else if (id === "prices") setShowPrices(true);
    else if (id === "schedule") setActiveSection("schedule_tab");
    else if (id === "schedule_lessons") setShowLessonTimes(true);
    else if (id === "daily_log") setShowDailyLog(true);
    else if (id === "detailed_report") { setActiveSection("reports"); setReportView("summary"); void fetchReportSummary(); }
    else if (id === "deductions") setActiveSection("deductions");
    else if (id === "export") setShowExport(true);
    else if (id === "print") setShowPrint(true);
  };

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/salaries" />
        
        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar title={t("salaries.title")} subtitle={t("salaries.subtitle")} scope={schoolScope} fixed />

          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-6">
                <AnimatePresence>
                  {success && (
                    <motion.div key="success" initial={{ opacity: 0, y: -10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.25 }}
                      className="rounded-2xl border border-[var(--success)]/20 bg-[var(--success)]/10 p-4 text-[var(--success)] font-bold text-sm flex items-center gap-2">
                      <CheckCircle2 size={16} /> {success}
                    </motion.div>
                  )}
                  {error && (
                    <motion.div key="error" initial={{ opacity: 0, y: -10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.25 }}
                      className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 p-4 text-[var(--danger)] font-bold text-sm flex items-center gap-2">
                      <AlertCircle size={16} /> {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <SchoolScopeBanner scope={schoolScope} showSelector={false} />

                {archiveMode.isArchiveMode && archiveMode.archiveData && (
                  <div className="rounded-2xl flex items-center gap-3 px-5 py-3.5 border border-indigo-500/30 mb-4"
                    style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #1e1b4b 100%)" }}>
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Archive size={15} className="text-indigo-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">وضع الأرشيف</p>
                      <p className="text-sm font-black text-white">أنت في وضع أرشيف سنة {archiveMode.archiveData.year} · بيانات الرواتب تعرض السنة الحالية</p>
                    </div>
                    <button onClick={archiveMode.exitArchiveMode}
                      className="text-[11px] font-black text-indigo-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition flex-shrink-0">
                      خروج
                    </button>
                  </div>
                )}

                {schoolScope.shouldBlockContent ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 backdrop-blur-xl">
                    <SchoolScopeEmptyState
                      scope={schoolScope}
                      title={t("salaries.emptyState.title")}
                      description={t("salaries.emptyState.description")}
                    />
                  </div>
                ) : (
                  <>
                    {/* ── Hero Banner ─────────────────────────────────────── */}
                    <div
                      className="relative rounded-2xl overflow-hidden p-6 md:p-8"
                      style={{ background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--success)) 100%)" }}
                    >
                      <div className="absolute top-0 end-0 w-72 h-72 rounded-full opacity-[0.08] pointer-events-none" style={{ background: "white", transform: "translate(35%, -40%)" }} />
                      <div className="absolute bottom-0 start-12 w-48 h-48 rounded-full opacity-[0.06] pointer-events-none" style={{ background: "white", transform: "translateY(60%)" }} />
                      <div className="relative flex items-center justify-between gap-4">
                        <div>
                          <p className="text-white/60 text-xs font-medium mb-2 tracking-widest uppercase">لوحة الإدارة · الرواتب</p>
                          <h1 className="text-2xl md:text-3xl font-black text-white mb-1.5 leading-tight">{t("salaries.title")}</h1>
                          <p className="text-white/70 text-sm">{t("salaries.subtitle")}</p>
                        </div>
                        <div className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                          <Wallet size={38} className="text-white" />
                        </div>
                      </div>
                    </div>

                    {/* ── Stats Cards ─────────────────────────────────────── */}
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                    >
                      {[
                        { label: t("salaries.summary.activeTeachers"),    value: activeTeachers,        icon: Users,        color: "var(--primary)",  prefix: "" },
                        { label: t("salaries.summary.totalBaseSalaries"), value: totalBaseSalaries,     icon: Wallet,       color: "#06b6d4",         prefix: t("common.currency") + " " },
                        { label: t("salaries.summary.paidThisMonth"),     value: totalPaidThisMonth,    icon: Banknote,     color: "var(--success)",  prefix: t("common.currency") + " " },
                        { label: t("salaries.summary.pendingPayout"),     value: unpaidTeachers.length, icon: CalendarCheck,color: "var(--warning)",  prefix: "" },
                      ].map((s, i) => {
                        const Icon = s.icon;
                        return (
                          <motion.div
                            key={s.label}
                            initial={{ opacity: 0, scale: 0.94 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.06, duration: 0.25 }}
                            className="group relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 overflow-hidden hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200 cursor-default"
                          >
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: `radial-gradient(ellipse at top right, color-mix(in srgb, ${s.color} 8%, transparent), transparent 70%)` }} />
                            <div className="relative z-10">
                              <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `color-mix(in srgb, ${s.color} 12%, transparent)` }}>
                                <Icon size={18} style={{ color: s.color }} />
                              </div>
                              <div className="text-2xl font-black mb-1 tabular-nums" style={{ color: s.color }}>
                                {s.prefix}<AnimatedNumber value={s.value} />
                              </div>
                              <p className="text-xs font-bold text-[var(--text-muted)]">{s.label}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>

                    {/* ── Nav Tab Bar ─────────────────────────────────────── */}
                    <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-1.5 flex gap-1 overflow-x-auto">
                      {[
                        { id: "main",         label: t("salaries.sidebar.items.main"),         icon: Users },
                        { id: "deductions",   label: t("salaries.sidebar.items.deductions"),   icon: Banknote },
                        { id: "reports",      label: t("salaries.sidebar.items.reports"),      icon: BarChart3 },
                        { id: "calendar",     label: t("salaries.sidebar.items.calendar"),     icon: CalendarRange },
                        { id: "archive",      label: t("salaries.sidebar.items.archive"),      icon: Archive },
                        { id: "settings",     label: t("salaries.sidebar.items.settings"),     icon: Settings },
                      ].map((tab) => {
                        const isActive = activeSection === tab.id || (tab.id === "main" && isMainSection);
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleResponsiveSectionChange(tab.id)}
                            className={cn(
                              "relative flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors duration-150 z-10 whitespace-nowrap",
                              isActive ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-soft)]",
                            )}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="salaries-nav-pill"
                                className="absolute inset-0 rounded-xl bg-[var(--primary)]"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                              />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                              <Icon size={15} />
                              <span className="hidden sm:inline">{tab.label}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {isMainSection && (
                      <div className="space-y-6">

                        {/* Quick Actions */}
                        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
                          <QuickAccessGrid showAll={showQuickAll} onToggleShowAll={() => setShowQuickAll(!showQuickAll)} onAction={handleQuickAction} />
                        </section>

                        {/* Main Content Area */}
                        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
                          <div className="space-y-8">
                            <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-1.5 flex gap-1">
                              {[
                                { id: "main",        label: t("salaries.tabs.teachers"),       icon: Users,        count: teachers.length },
                                { id: "salaries_tab",label: t("salaries.tabs.salaryLog"),       icon: Banknote,     count: salaries.length },
                                { id: "unpaid_tab",  label: t("salaries.tabs.pendingPayout"),   icon: AlertCircle,  count: unpaidTeachers.length },
                              ].map((tab) => {
                                const isActive = activeSection === tab.id || (activeSection === "main" && tab.id === "main");
                                const Icon = tab.icon;
                                return (
                                  <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveSection(tab.id)}
                                    className={cn(
                                      "relative flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-colors duration-150 z-10",
                                      isActive ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]",
                                    )}
                                  >
                                    {isActive && (
                                      <motion.div
                                        layoutId="salaries-tab-pill"
                                        className="absolute inset-0 rounded-xl bg-[var(--primary)]"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                      />
                                    )}
                                    <span className="relative z-10 flex items-center gap-1.5">
                                      <Icon size={13} />
                                      {tab.label}
                                      <span className={cn("px-1.5 py-0.5 rounded-md text-[10px] font-black", isActive ? "bg-white/20" : "bg-[var(--surface-strong)]")}>{tab.count}</span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            {unpaidTeachers.length > 0 && (
                              <div className="p-4 rounded-xl bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] text-[var(--warning)] text-xs font-bold flex items-center gap-2">
                                <AlertCircle size={14} /> {t("salaries.warning.unpaidTeachers", { count: unpaidTeachers.length, month: currentMonth })}
                              </div>
                            )}

                            {loading ? (
                              <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="h-12 w-12 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
                                <span className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">{t("salaries.loading.main")}</span>
                              </div>
                            ) : (
                              <TeachersTable teachers={teachers} salaries={salaries} loading={loading} currentMonth={currentMonth} onPaySalary={onPaySalary} onShowDetail={(t) => { setDetailTeacher(t); setShowDetail(true); }} onOpenMenu={openMenu} />
                            )}
                          </div>
                        </section>
                      </div>
                    )}

                    {activeSection === "schedule_tab" && <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6"><ScheduleSection teachers={teachers} classes={classes} scheduleGrade={scheduleGrade} scheduleSection={scheduleSection} scheduleGrid={scheduleGrid} saving={scheduleSaving} onGradeChange={setScheduleGrade} onSectionChange={setScheduleSection} onFetchSchedule={fetchSchedule} onGridChange={setScheduleGrid} onSave={saveSchedule} /></section>}
                    {activeSection === "deductions" && <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6"><DeductionsSection teachers={teachers} deductionsList={deductionsList} deductionTeacher={deductionTeacher} deductionAmount={deductionAmount} deductionNotes={deductionNotes} saving={savingDeduction} onUpdateTeacher={setDeductionTeacher} onUpdateAmount={setDeductionAmount} onUpdateNotes={setDeductionNotes} onSave={saveDeduction} /></section>}
                    {activeSection === "reports" && <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6"><ReportsSection reportView={reportView} reportTeacher={reportTeacher} reportLoading={reportLoading} reportSummary={reportSummary} reportTotals={reportTotals} dailyLectures={dailyLectures} teachers={teachers} onViewChange={setReportView} onTeacherChange={setReportTeacher} onPrintReport={() => void (async () => { await fetchDetailedReportAll(reportTeacher); printReport(reportTeacher); })()} /></section>}
                    {activeSection === "calendar" && <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6"><CalendarSection calYear={calYear} calMonth={calMonth} calLectureDates={calLectureDates} onYearChange={setCalYear} onMonthChange={setCalMonth} /></section>}
                    {activeSection === "archive" && <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6"><ArchiveSection archives={archives} currentMonth={currentMonth} onArchive={() => setShowArchiveConfirm(true)} /></section>}
                    {activeSection === "settings" && <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6"><SettingsSection classes={classes} onExport={() => setShowExport(true)} /></section>}
                  </>
                )}
            </div>
          </main>
        </div>

        {/* Modals & Overlays */}
        <TeacherDropdownMenu show={!!activeMenu && !!selectedTeacher} teacher={selectedTeacher} position={menuPos} onShowDetail={() => { setDetailTeacher(selectedTeacher); setShowDetail(true); }} onPaySalary={() => selectedTeacher && onPaySalary(selectedTeacher)} onEdit={() => selectedTeacher && void openTeacherEdit(selectedTeacher)} onClose={() => setActiveMenu(null)} />
        <TeacherModal show={showTeacherModal} editId={teacherEditId} form={teacherForm} saving={teacherModalSaving} error={teacherModalError} canManage={canManageTeacher} subjectsList={subjectsList} jobTitlesList={jobTitlesList} onClose={() => setShowTeacherModal(false)} onSubmit={saveTeacherModal} onUpdateForm={(f) => setTeacherForm((prev) => ({ ...prev, ...f }))} onAddClassRow={() => setTeacherForm((f) => ({ ...f, classes_taught: [...f.classes_taught, { grade: "", section: "" }] }))} onRemoveClassRow={(i) => setTeacherForm((f) => ({ ...f, classes_taught: f.classes_taught.filter((_, idx) => idx !== i) }))} onUpdateClassRow={(i, field, val) => setTeacherForm((f) => ({ ...f, classes_taught: f.classes_taught.map((c, idx) => (idx === i ? { ...c, [field]: val } : c)) }))} />
        <PaySalaryModal show={showPaySalary} teacher={selectedTeacher} form={salaryForm} saving={savingSalary} lectureSalaryCalc={lectureSalaryCalc} onSubmit={handlePaySalary} onClose={() => setShowPaySalary(false)} onUpdateForm={(f) => setSalaryForm((prev) => ({ ...prev, ...f }))} />
        {showDetail && detailTeacher && <TeacherDetailPanel teacher={detailTeacher} salaries={salaries} currentMonth={currentMonth} onClose={() => setShowDetail(false)} onPaySalary={onPaySalary} onPrintSalarySlip={printSalarySlip} />}
        <PricesModal show={showPrices} classes={classes} lecturePrices={lecturePrices} priceEdits={priceEdits} onClose={() => setShowPrices(false)} onPriceChange={(g, p) => setPriceEdits((prev) => ({ ...prev, [g]: p }))} onSave={savePrices} />
        <LessonTimesModal show={showLessonTimes} lessonTimes={lessonTimes} timeEdits={timeEdits} onClose={() => setShowLessonTimes(false)} onTimeChange={(k, v) => setTimeEdits((prev) => ({ ...prev, [k]: v }))} onSave={saveLessonTimes} />
        <DailyLogModal show={showDailyLog} teachers={teachers} classes={classes} lecturePrices={lecturePrices} dailyTeacher={dailyTeacher} dailyDate={dailyDate} dailyGrades={dailyGrades} dailyPeriods={dailyPeriods} saving={savingDaily} onClose={() => setShowDailyLog(false)} onTeacherChange={setDailyTeacher} onDateChange={setDailyDate} onGradesChange={setDailyGrades} onPeriodsChange={setDailyPeriods} onSave={saveDailyLog} />
        <ExportModal show={showExport} exportOptions={exportOptions} onClose={() => setShowExport(false)} onOptionsChange={setExportOptions} onExport={doExport} />
        <PrintModal show={showPrint} teachers={teachers} printTeacher={printTeacher} onClose={() => setShowPrint(false)} onTeacherChange={setPrintTeacher} onPrintReport={openPrintReport} onPrintAll={printAllTeachers} />
        <ManagerModals showSubjectsMgr={showSubjectsMgr} subjectsList={subjectsList} newSubject={newSubject} onCloseSubjects={() => setShowSubjectsMgr(false)} onNewSubjectChange={setNewSubject} onAddSubject={addSubject} onDeleteSubject={deleteSubject} showJobTitlesMgr={showJobTitlesMgr} jobTitlesList={jobTitlesList} newJobTitle={newJobTitle} onCloseJobTitles={() => setShowJobTitlesMgr(false)} onNewJobTitleChange={setNewJobTitle} onAddJobTitle={addJobTitle} onDeleteJobTitle={deleteJobTitle} showClassesMgr={showClassesMgr} classes={classes} newGrade={newGrade} newSection={newSection} newSectionGrade={newSectionGrade} onCloseClasses={() => setShowClassesMgr(false)} onNewGradeChange={setNewGrade} onNewSectionChange={setNewSection} onNewSectionGradeChange={setNewSectionGrade} onAddClass={addClass} onAddSection={addSection} onDeleteClass={deleteClass} />
        <ConfirmDialog
          open={showArchiveConfirm}
          title={t("salaries.dialogs.archiveMonthTitle")}
          description={t("salaries.dialogs.archiveMonthDescription", { month: currentMonth })}
          confirmLabel={t("salaries.dialogs.archiveMonthConfirm")}
          cancelLabel={t("common.cancel")}
          tone="danger"
          onClose={() => setShowArchiveConfirm(false)}
          onConfirm={() => void archiveMonth(currentMonth).then(() => setShowArchiveConfirm(false))}
        />
      </div>
    </ProtectedRoute>
  );
}
