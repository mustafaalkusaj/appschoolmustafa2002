"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatNumber, formatDate } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { AppSidebar } from "@/components/AppSidebar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useRuntimeBranding } from "@/hooks/brand";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { wrapPrintDocument, escapeHtml } from "@/lib/print/branding";
import { loadXLSX } from "@/lib/xlsx-loader";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { useSalariesData } from "./_hooks";
import {
  SalariesSidebar,
  StatsCards,
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
import { EMPTY_TEACHER_FORM, EMPTY_SALARY_FORM, EMPTY_EXPORT_OPTIONS, type Teacher, type TeacherFormData, type SalaryFormData, type ExportOptions } from "./_types";
import "./_components/salaries.css";

export default function SalariesPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isEnglish = locale === "en";
  const { profile, canAny } = useRole();
  const runtimeBranding = useRuntimeBranding();
  const canManageTeacher = canAny(["manage_salaries"]);
  const schoolScope = useSchoolScope(profile);

  // Main data hook
  const salariesData = useSalariesData(profile, schoolScope);
  const {
    schoolId,
    loading,
    referenceLoaded: _referenceLoaded,
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
    setDeductionsList: _setDeductionsList,
    setDailyLectures: _setDailyLectures,
    setClasses: _setClasses,
    setSubjectsList: _setSubjectsList,
    setJobTitlesList: _setJobTitlesList,
    setLessonTimes: _setLessonTimes,
    setLecturePrices: _setLecturePrices,
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
  const monthSalaries = salaries.filter((s) => s.month === currentMonth);
  const paidTeacherIds = monthSalaries.map((s) => s.teacher_id);
  const unpaidTeachers = teachers.filter((t) => !paidTeacherIds.includes(t.id) && t.status === "active");
  const totalBaseSalaries = teachers.filter((t) => t.status === "active").reduce((a, t) => a + t.base_salary, 0);
  const totalPaidThisMonth = monthSalaries.reduce((a, s) => a + ((s.gross_salary || 0) - (s.deductions || 0)), 0);
  const activeTeachers = teachers.filter((t) => t.status === "active").length;
  const gradeOptions = Array.from(new Set(classes.map((c) => c.grade))) as string[];

  // Close menu on click outside
  useEffect(() => {
    const close = () => setActiveMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  // Calendar effect
  useEffect(() => {
    if (activeSection === "calendar") void fetchCalendarLectures(calYear, calMonth);
  }, [activeSection, calYear, calMonth, fetchCalendarLectures]);

  // Reports effect
  useEffect(() => {
    if (activeSection === "reports" && reportView === "summary") void fetchReportSummary();
    if (activeSection === "reports" && reportView === "details") void fetchDetailedReportAll(reportTeacher);
  }, [activeSection, fetchDetailedReportAll, fetchReportSummary, reportTeacher, reportView]);

  // Deductions effect
  useEffect(() => {
    if (activeSection === "deductions") void fetchDeductionsList();
  }, [activeSection, fetchDeductionsList]);

  // Archive effect
  useEffect(() => {
    if (activeSection === "archive") void ensureArchivesData();
  }, [activeSection, ensureArchivesData]);

  // Reference data effect
  useEffect(() => {
    if (activeSection === "schedule_tab") void ensureReferenceData();
  }, [activeSection, ensureReferenceData]);

  useEffect(() => {
    if (showTeacherModal || showSubjectsMgr || showJobTitlesMgr || showClassesMgr || showPrices || showLessonTimes || showDailyLog || showExport) {
      void ensureReferenceData();
    }
  }, [ensureReferenceData, showClassesMgr, showDailyLog, showExport, showJobTitlesMgr, showLessonTimes, showPrices, showSubjectsMgr, showTeacherModal]);

  // Price edits effect
  useEffect(() => {
    if (!showPrices) return;
    const edits: Record<string, number> = {};
    gradeOptions.forEach((grade) => {
      edits[grade] = lecturePrices.find((p) => p.grade === grade)?.price_per_lecture || 0;
    });
    setPriceEdits(edits);
  }, [classes, lecturePrices, showPrices]);

  // Lecture salary calc effect
  useEffect(() => {
    if (!showPaySalary || !selectedTeacher || !schoolId) return;
    let canceled = false;
    (async () => {
      const stats = await loadTeacherMonthLectures(selectedTeacher, salaryForm.month);
      if (canceled) return;
      setLectureSalaryCalc(stats);
      let grossBase = parseInt(salaryForm.gross_salary) || 0;
      if (selectedTeacher.salary_type === "fixed") {
        grossBase = Number(selectedTeacher.base_salary) || 0;
      } else if (selectedTeacher.salary_type === "hourly") {
        grossBase = stats.total;
      } else if (selectedTeacher.salary_type === "mixed") {
        grossBase = (Number(selectedTeacher.base_salary) || 0) + stats.total;
      }
      setSalaryForm((prev) => ({ ...prev, gross_salary: grossBase.toString() }));
    })();
    return () => { canceled = true; };
  }, [showPaySalary, selectedTeacher, salaryForm.month, schoolId, loadTeacherMonthLectures]);

  // Helper functions
  const resetTeacherForm = () => setTeacherForm(EMPTY_TEACHER_FORM);

  const openTeacherAdd = async () => {
    await ensureReferenceData();
    setTeacherEditId(null);
    resetTeacherForm();
    setTeacherModalError("");
    setShowTeacherModal(true);
  };

  const openTeacherEdit = async (t: Teacher) => {
    await ensureReferenceData();
    setTeacherEditId(t.id);
    const ct = (t.classes_taught as { grade: string; section: string }[]) || [];
    setTeacherForm({
      full_name: String(t.full_name ?? ""),
      job_title: String(t.job_title ?? ""),
      salary_type: String(t.salary_type ?? "fixed") as any,
      subject: String(t.subject ?? ""),
      phone: String(t.phone ?? ""),
      address: String(t.address ?? ""),
      base_salary: String(t.base_salary ?? ""),
      lecture_price: String(t.lecture_price ?? ""),
      weekly_hours: String(t.weekly_hours ?? ""),
      classes_taught: ct.length ? ct : [{ grade: "", section: "" }],
      status: String(t.status ?? "active") as any,
    });
    setTeacherModalError("");
    setShowTeacherModal(true);
  };

  const saveTeacherModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageTeacher || !schoolId) return;
    setTeacherModalSaving(true);
    setTeacherModalError("");
    const validClasses = teacherForm.classes_taught.filter((c) => c.grade);
    const payload = {
      school_id: schoolId,
      full_name: teacherForm.full_name.trim(),
      subject: teacherForm.subject || null,
      job_title: teacherForm.job_title || null,
      salary_type: teacherForm.salary_type,
      phone: teacherForm.phone || null,
      address: teacherForm.address || null,
      base_salary: parseInt(teacherForm.base_salary, 10) || 0,
      lecture_price: parseInt(teacherForm.lecture_price, 10) || 0,
      weekly_hours: parseInt(teacherForm.weekly_hours, 10) || 0,
      classes_taught: validClasses.length ? validClasses : [],
      status: teacherForm.status,
    };
    if (!payload.full_name) {
      setTeacherModalError("يرجى إدخال الاسم");
      setTeacherModalSaving(false);
      return;
    }
    const endpoint = teacherEditId
      ? `/api/web/salaries/teachers/${encodeURIComponent(teacherEditId)}`
      : "/api/web/salaries/teachers";
    const method = teacherEditId ? "PATCH" : "POST";
    const { response, payload: responsePayload } = await fetchJsonWithAuthorizedSession<{
      teacher?: Teacher;
      error?: { message?: string };
    }>(endpoint, {
      method,
      headers: withJsonHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      setTeacherModalError(responsePayload?.error?.message || "تعذر حفظ بيانات الأستاذ.");
    } else {
      setShowTeacherModal(false);
      await fetchAll();
    }
    setTeacherModalSaving(false);
  };

  const handlePaySalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    setSavingSalary(true);
    setError("");
    let gross = 0;
    if (selectedTeacher.salary_type === "fixed") {
      gross = Number(selectedTeacher.base_salary) || 0;
    } else if (selectedTeacher.salary_type === "hourly") {
      gross = lectureSalaryCalc.total;
    } else if (selectedTeacher.salary_type === "mixed") {
      gross = (Number(selectedTeacher.base_salary) || 0) + lectureSalaryCalc.total;
    } else {
      gross = parseInt(salaryForm.gross_salary) || Number(selectedTeacher.base_salary) || 0;
    }
    const deductions = parseInt(salaryForm.deductions) || 0;
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        salary?: any;
        warning?: string;
        error?: { message?: string };
      }>("/api/web/salaries/pay", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          school_id: schoolId,
          teacher_id: selectedTeacher.id,
          gross_salary: gross,
          deductions,
          month: salaryForm.month,
          notes: salaryForm.notes || null,
        }),
      });
      if (!response.ok) {
        setError(payload?.error?.message || "تعذر صرف الراتب.");
        return;
      }
      setSuccess(
        payload?.warning
          ? `تم دفع راتب ${selectedTeacher.full_name} مع معالجة التكرارات المتزامنة ✓`
          : `تم دفع راتب ${selectedTeacher.full_name} ✓`
      );
      setShowPaySalary(false);
      setSalaryForm(EMPTY_SALARY_FORM);
      setSelectedTeacher(null);
      fetchAll();
      setTimeout(() => setSuccess(""), 3000);
    } catch (payError) {
      setError(payError instanceof Error ? payError.message : "تعذر صرف الراتب.");
    } finally {
      setSavingSalary(false);
    }
  };

  const fetchSchedule = async (grade: string, section: string) => {
    const { data } = await supabase
      .from("weekly_schedule")
      .select("*")
      .eq("school_id", schoolId)
      .eq("grade", grade)
      .eq("section", section);
    const grid: Record<string, string> = {};
    data?.forEach((s: any) => { grid[`${s.day}-${s.period}-${s.session_type}`] = s.teacher_id || ""; });
    setScheduleGrid(grid);
  };

  const saveSchedule = async () => {
    setScheduleSaving(true);
    await supabase.from("weekly_schedule").delete().eq("school_id", schoolId).eq("grade", scheduleGrade).eq("section", scheduleSection);
    const bid = await getBranchId();
    const rows: any[] = [];
    for (const [key, teacherId] of Object.entries(scheduleGrid)) {
      if (!teacherId) continue;
      const [day, period, type] = key.split("-");
      rows.push({ school_id: schoolId, branch_id: bid, grade: scheduleGrade, section: scheduleSection, day, period: parseInt(period), session_type: type, teacher_id: teacherId });
    }
    if (rows.length) await supabase.from("weekly_schedule").insert(rows);
    setSuccess("تم حفظ الجدول ✓");
    setScheduleSaving(false);
    setTimeout(() => setSuccess(""), 3000);
  };

  const savePrices = async () => {
    for (const grade of gradeOptions) {
      const price = priceEdits[grade] || 0;
      const existing = lecturePrices.find((p) => p.grade === grade);
      if (existing) await supabase.from("lecture_prices").update({ price_per_lecture: price }).eq("id", existing.id);
      else await supabase.from("lecture_prices").insert({ school_id: schoolId, grade, price_per_lecture: price });
    }
    setSuccess("تم حفظ الأسعار ✓");
    setTimeout(() => setSuccess(""), 3000);
    fetchAll();
  };

  const saveLessonTimes = async () => {
    for (const t of lessonTimes) {
      const start = timeEdits[`${t.period}-${t.session_type}-start`];
      const end = timeEdits[`${t.period}-${t.session_type}-end`];
      await supabase.from("lesson_times").update({ start_time: start, end_time: end }).eq("id", t.id);
    }
    setSuccess("تم حفظ توقيتات الدروس ✓");
    setTimeout(() => setSuccess(""), 3000);
  };

  const saveDailyLog = async () => {
    if (!dailyTeacher || !dailyDate) return;
    setSavingDaily(true);
    const bid = await getBranchId();
    const rows: any[] = [];
    const selectedTeacherRow = teachers.find((t) => t.id === dailyTeacher);
    const teacherLecturePrice = Number(selectedTeacherRow?.lecture_price) || 0;
    for (const gradeSection of dailyGrades) {
      const [grade, section] = gradeSection.split("||");
      const classPrice = lecturePrices.find((p) => p.grade === grade)?.price_per_lecture || 0;
      const price = teacherLecturePrice > 0 ? teacherLecturePrice : classPrice;
      for (const p of dailyPeriods) {
        const [period, type] = p.split("-");
        rows.push({ school_id: schoolId, branch_id: bid, teacher_id: dailyTeacher, grade, section, period: parseInt(period), session_type: type, lecture_date: dailyDate, price });
      }
    }
    if (rows.length) await supabase.from("daily_lectures").insert(rows);
    setSuccess(`تم تسجيل ${rows.length} محاضرة ✓`);
    setDailyGrades([]);
    setDailyPeriods([]);
    setSavingDaily(false);
    setTimeout(() => setSuccess(""), 3000);
    fetchDetailedReportAll();
    fetchCalendarLectures(calYear, calMonth);
  };

  const saveDeduction = async () => {
    if (!deductionTeacher || !deductionAmount) return;
    setSavingDeduction(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>("/api/web/salaries/deductions", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          school_id: schoolId,
          teacher_id: deductionTeacher,
          amount: parseInt(deductionAmount) || 0,
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
      setTimeout(() => setSuccess(""), 3000);
      fetchDeductionsList();
    } finally {
      setSavingDeduction(false);
    }
  };

  const doExport = async () => {
    await ensureReferenceData();
    if (exportOptions.lectures && dailyLectures.length === 0) {
      await fetchDetailedReportAll(reportTeacher);
    }
    const XLSX = await loadXLSX();
    const wb = XLSX.utils.book_new();
    if (exportOptions.teachers) {
      const rows = teachers.map((t) => ({ الاسم: t.full_name, المسمى: t.job_title || "", المادة: t.subject || "", الراتب: t.base_salary, "سعر المحاضرة": t.lecture_price || 0 }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "الأساتذة");
    }
    if (exportOptions.subjects) {
      const rows = subjectsList.map((s) => ({ المادة: s.name }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "المواد");
    }
    if (exportOptions.classes) {
      const rows = classes.map((c) => ({ الصف: c.grade, الشعبة: c.section }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "الصفوف");
    }
    if (exportOptions.fixed_salaries) {
      const rows = salaries.map((s) => ({ الأستاذ: s.teachers?.full_name || "", الشهر: s.month, الإجمالي: s.gross_salary, الخصومات: s.deductions || 0, الصافي: (s.gross_salary || 0) - (s.deductions || 0) }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "الرواتب");
    }
    if (exportOptions.lectures) {
      const rows = dailyLectures.map((l: any) => ({ الأستاذ: l.teachers?.full_name || "", التاريخ: l.lecture_date, الصف: l.grade, الشعبة: l.section, الدرس: l.period, النوع: l.session_type, السعر: l.price }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "المحاضرات");
    }
    if (wb.SheetNames.length === 0) { setError("اختر بيانات للتصدير"); return; }
    await XLSX.writeFile(wb, `تصدير_${formatDate(new Date())}.xlsx`);
    setShowExport(false);
  };

  const openPrintWindow = (title: string, subtitle: string, bodyHtml: string) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(wrapPrintDocument({ title, subtitle, bodyHtml, branding: { schoolName: runtimeBranding.schoolName, logoUrl: runtimeBranding.logoUrl, primaryColor: runtimeBranding.primaryColor, secondaryColor: runtimeBranding.secondaryColor, locale: isEnglish ? "en" : "ar" } }));
    w.document.close();
  };

  const printSalarySlip = (salary: any) => {
    const net = (salary.gross_salary || 0) - (salary.deductions || 0);
    openPrintWindow(
      isEnglish ? "Salary slip" : "قسيمة راتب",
      escapeHtml(salary.teachers?.full_name || (isEnglish ? "Teacher account" : "سجل الأستاذ")),
      `<div class="print-grid">
        <div class="print-panel"><span class="print-label">${isEnglish ? "Teacher" : "الاسم"}</span><div class="print-value">${escapeHtml(salary.teachers?.full_name || "—")}</div></div>
        <div class="print-panel"><span class="print-label">${isEnglish ? "Month" : "الشهر"}</span><div class="print-value">${escapeHtml(salary.month || "—")}</div></div>
        <div class="print-panel"><span class="print-label">${isEnglish ? "Gross salary" : "الإجمالي"}</span><div class="print-value">د.ع ${formatNumber(salary.gross_salary || 0)}</div></div>
        <div class="print-panel"><span class="print-label">${isEnglish ? "Deductions" : "الخصومات"}</span><div class="print-value" style="color:#dc2626">د.ع ${formatNumber(salary.deductions || 0)}</div></div>
      </div>
      <div class="print-panel" style="margin-top:16px;text-align:center;background:linear-gradient(135deg,var(--print-surface),#ffffff)">
        <span class="print-label">${isEnglish ? "Net amount" : "الصافي"}</span>
        <div class="print-value" style="font-size:30px">د.ع ${formatNumber(net)}</div>
      </div>`
    );
  };

  const printReport = () => {
    const teacher = reportTeacher ? teachers.find((t) => t.id === reportTeacher) : null;
    const lectures = reportTeacher ? dailyLectures.filter((l: any) => l.teacher_id === reportTeacher) : dailyLectures;
    const total = lectures.reduce((a: number, l: any) => a + l.price, 0);
    openPrintWindow(
      isEnglish ? "Teacher statement" : "كشف حساب",
      teacher?.full_name || (isEnglish ? "All teachers" : "جميع الأساتذة"),
      `<table><thead><tr><th>#</th><th>${isEnglish ? "Date" : "التاريخ"}</th><th>${isEnglish ? "Class" : "الصف"}</th><th>${isEnglish ? "Section" : "الشعبة"}</th><th>${isEnglish ? "Lesson" : "الدرس"}</th><th>${isEnglish ? "Price" : "السعر"}</th></tr></thead>
        <tbody>${lectures.map((l: any, i: number) => `<tr><td>${i + 1}</td><td>${formatDate(l.lecture_date)}</td><td>${escapeHtml(l.grade || "—")}</td><td>${escapeHtml(l.section || "—")}</td><td>${isEnglish ? "Lesson" : "الدرس"} ${escapeHtml(String(l.period ?? "—"))}</td><td>${formatNumber(l.price || 0)}</td></tr>`).join("")}</tbody></table>
        <div class="print-panel" style="margin-top:16px;text-align:center"><span class="print-label">${isEnglish ? "Total" : "الإجمالي"}</span><div class="print-value">د.ع ${formatNumber(total)}</div></div>`
    );
  };

  const printAllTeachers = () => {
    openPrintWindow(
      isEnglish ? "Teachers summary" : "تقرير شامل",
      isEnglish ? `${teachers.length} teachers` : `${teachers.length} أستاذ`,
      `<table><thead><tr><th>#</th><th>${isEnglish ? "Name" : "الاسم"}</th><th>${isEnglish ? "Job title" : "المسمى"}</th><th>${isEnglish ? "Subject" : "المادة"}</th><th>${isEnglish ? "Salary" : "الراتب"}</th><th>${isEnglish ? "Lecture price" : "سعر المحاضرة"}</th></tr></thead>
        <tbody>${teachers.map((t, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(t.full_name || "—")}</td><td>${escapeHtml(t.job_title || "—")}</td><td>${escapeHtml(t.subject || "—")}</td><td>${formatNumber(t.base_salary || 0)}</td><td>${formatNumber(t.lecture_price || 0)}</td></tr>`).join("")}</tbody></table>`
    );
  };

  const addSubject = async () => { if (!newSubject.trim()) return; await supabase.from("subjects").insert({ school_id: schoolId, name: newSubject.trim() }); setNewSubject(""); fetchAll(); };
  const deleteSubject = async (id: string) => { await supabase.from("subjects").delete().eq("id", id); fetchAll(); };
  const addJobTitle = async () => { if (!newJobTitle.trim()) return; await supabase.from("job_titles").insert({ school_id: schoolId, name: newJobTitle.trim() }); setNewJobTitle(""); fetchAll(); };
  const deleteJobTitle = async (id: string) => { await supabase.from("job_titles").delete().eq("id", id); fetchAll(); };
  const addClass = async () => { if (!newGrade.trim()) return; const bid = await getBranchId(); await supabase.from("classes").insert({ school_id: schoolId, branch_id: bid, grade: newGrade.trim(), section: "أ" }); setNewGrade(""); fetchAll(); };
  const addSection = async () => { if (!newSectionGrade || !newSection.trim()) return; const bid = await getBranchId(); await supabase.from("classes").insert({ school_id: schoolId, branch_id: bid, grade: newSectionGrade, section: newSection.trim() }); setNewSection(""); fetchAll(); };
  const deleteClass = async (id: string) => { await supabase.from("classes").delete().eq("id", id); fetchAll(); };

  const openMenu = (e: React.MouseEvent, teacher: Teacher) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left - 100 });
    setActiveMenu(activeMenu === teacher.id ? null : teacher.id);
    setSelectedTeacher(teacher);
  };

  const handleQuickAction = (id: string) => {
    if (id === "add_teacher") { void openTeacherAdd(); }
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

  const onPaySalary = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setSalaryForm({ gross_salary: teacher.base_salary.toString(), deductions: "0", notes: "", month: currentMonth });
    setShowPaySalary(true);
  };

  const openPrintReport = async (teacherId: string) => {
    setReportTeacher(teacherId);
    await fetchDetailedReportAll(teacherId);
    printReport();
  };

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="layout">
        <AppSidebar currentPath="/salaries" containerClassName="main-sidebar" showFloatingToggle />
        <SalariesSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onDeductionsLoad={() => void fetchDeductionsList()}
          onCalendarLoad={() => void fetchCalendarLectures(calYear, calMonth)}
        />
        <div className="main">
          <div className="content app-shell-content">
            {success && <div className="ok">{success}</div>}
            {error && <div className="err">{error}</div>}
            <SchoolScopeBanner scope={schoolScope} showSelector={false} />
            {schoolScope.shouldBlockContent ? (
              <SchoolScopeEmptyState scope={schoolScope} title="بيانات الرواتب" description="لن يتم تحميل المدرسين أو الرواتب أو الجداول قبل اختيار مدرسة صريحة لهذا القسم." />
            ) : (
              <>
                {activeSection === "main" && (
                  <>
                    <StatsCards activeTeachers={activeTeachers} totalBaseSalaries={totalBaseSalaries} totalPaidThisMonth={totalPaidThisMonth} unpaidCount={unpaidTeachers.length} />
                    <QuickAccessGrid showAll={showQuickAll} onToggleShowAll={() => setShowQuickAll(!showQuickAll)} onAction={handleQuickAction} />
                    <div className="tabs">
                      {[{ id: "teachers_tab", label: "المدرسون", icon: "👨‍🏫", count: teachers.length }, { id: "salaries_tab", label: "سجل الرواتب", icon: "💰", count: salaries.length }, { id: "unpaid_tab", label: "غير مدفوع", icon: "⚠️", count: unpaidTeachers.length }].map((t) => (
                        <button key={t.id} className={`tab${activeSection === t.id ? " active" : ""}`} onClick={() => setActiveSection(t.id)}>
                          <AppIcon token={t.icon} size={15} /><span>{t.label}</span><span className="tab-count">{t.count}</span>
                        </button>
                      ))}
                    </div>
                    {unpaidTeachers.length > 0 && <div className="alert-box"><AppIcon token="⚠️" size={14} /> {unpaidTeachers.length} مدرس لم يستلم راتب شهر {currentMonth}</div>}
                    <TeachersTable teachers={teachers} salaries={salaries} loading={loading} currentMonth={currentMonth} onPaySalary={onPaySalary} onShowDetail={(t) => { setDetailTeacher(t); setShowDetail(true); }} onOpenMenu={openMenu} />
                  </>
                )}
                {activeSection === "teachers" && (
                  <>
                    <div className="toolbar">
                      <div className="srch"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg><input placeholder="بحث..." /></div>
                      <button type="button" className="btn-add" onClick={() => void openTeacherAdd()}>+ إضافة أستاذ</button>
                    </div>
                    <div className="tbl-wrap">
                      {loading ? <div className="spin" /> : (
                        <table>
                          <thead><tr><th>#</th><th>الاسم</th><th>المادة</th><th>سعر المحاضرة</th><th>الصف والشعبة</th><th>الملف</th></tr></thead>
                          <tbody>
                            {teachers.map((t, i) => (
                              <tr key={t.id}>
                                <td style={{ color: "var(--gray)", fontSize: ".7rem" }}>{i + 1}</td>
                                <td><div style={{ fontWeight: 700 }}>{t.full_name}</div><div style={{ fontSize: ".7rem", color: "var(--p3)" }}>{t.job_title || ""}</div></td>
                                <td style={{ color: "var(--gray)" }}>{t.subject || "—"}</td>
                                <td style={{ fontWeight: 700, color: "#2563EB" }}>د.ع {formatNumber(t.lecture_price || 0)}</td>
                                <td>{(t.classes_taught || []).slice(0, 3).map((c: any, i: number) => <span key={i} className="grade-badge">{c.grade} ({c.section})</span>)}{(t.classes_taught || []).length > 3 && <span className="grade-badge">+{(t.classes_taught || []).length - 3}</span>}</td>
                                <td><button type="button" className="btn-edit-s" onClick={() => void openTeacherEdit(t)}><AppIcon token="✏️" size={13} /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                )}
                {activeSection === "schedule_tab" && <ScheduleSection teachers={teachers} classes={classes} scheduleGrade={scheduleGrade} scheduleSection={scheduleSection} scheduleGrid={scheduleGrid} saving={scheduleSaving} onGradeChange={setScheduleGrade} onSectionChange={setScheduleSection} onFetchSchedule={fetchSchedule} onGridChange={setScheduleGrid} onSave={saveSchedule} />}
                {activeSection === "deductions" && <DeductionsSection teachers={teachers} deductionsList={deductionsList} deductionTeacher={deductionTeacher} deductionAmount={deductionAmount} deductionNotes={deductionNotes} saving={savingDeduction} onUpdateTeacher={setDeductionTeacher} onUpdateAmount={setDeductionAmount} onUpdateNotes={setDeductionNotes} onSave={saveDeduction} />}
                {activeSection === "reports" && <ReportsSection reportView={reportView} reportTeacher={reportTeacher} reportLoading={reportLoading} reportSummary={reportSummary} reportTotals={reportTotals} dailyLectures={dailyLectures} teachers={teachers} onViewChange={setReportView} onTeacherChange={setReportTeacher} onPrintReport={() => void fetchDetailedReportAll(reportTeacher).then(printReport)} />}
                {activeSection === "calendar" && <CalendarSection calYear={calYear} calMonth={calMonth} calLectureDates={calLectureDates} onYearChange={setCalYear} onMonthChange={setCalMonth} />}
                {activeSection === "archive" && <ArchiveSection archives={archives} currentMonth={currentMonth} onArchive={() => setShowArchiveConfirm(true)} />}
                {activeSection === "settings" && <SettingsSection classes={classes} onExport={() => setShowExport(true)} />}
              </>
            )}
          </div>
        </div>
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
        <ConfirmDialog open={showArchiveConfirm} title="أرشفة شهر الرواتب" description={`سيتم حفظ أرشيف شهر ${currentMonth} وتصفير عدادات المحاضرات الخاصة به. استخدم هذا الإجراء فقط عند إغلاق الشهر.`} confirmLabel="نعم، أرشف الشهر" cancelLabel="إلغاء" tone="danger" onClose={() => setShowArchiveConfirm(false)} onConfirm={() => void archiveMonth(currentMonth).then(() => setShowArchiveConfirm(false))} />
      </div>
    </ProtectedRoute>
  );
}
