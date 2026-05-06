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
import { loadXLSX } from "@/lib/xlsx-loader";
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
import { AlertCircle, Wallet, Users, Banknote, CalendarCheck } from "@/lib/icons";

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
  const totalPaidThisMonth = useMemo(() => monthSalaries.reduce((a, s) => a + ((s.gross_salary || 0) - (s.deductions || 0)), 0), [monthSalaries]);
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
      let grossBase = parseInt(salaryForm.gross_salary) || 0;
      if (selectedTeacher.salary_type === "fixed") grossBase = Number(selectedTeacher.base_salary) || 0;
      else if (selectedTeacher.salary_type === "hourly") grossBase = stats.total;
      else if (selectedTeacher.salary_type === "mixed") grossBase = (Number(selectedTeacher.base_salary) || 0) + stats.total;
      setSalaryForm((prev) => ({ ...prev, gross_salary: grossBase.toString() }));
    })();
    return () => { canceled = true; };
  }, [showPaySalary, selectedTeacher, salaryForm.month, salaryForm.gross_salary, schoolId, loadTeacherMonthLectures]);

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
    const { response, payload: res } = await fetchJsonWithAuthorizedSession<{ teacher?: Teacher; error?: { message?: string } }>(teacherEditId ? `/api/web/salaries/teachers/${teacherEditId}` : "/api/web/salaries/teachers", { method: teacherEditId ? "PATCH" : "POST", headers: withJsonHeaders(), body: JSON.stringify(payload) });
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
    else gross = parseInt(salaryForm.gross_salary) || Number(selectedTeacher.base_salary) || 0;
    const { response, payload } = await fetchJsonWithAuthorizedSession<SalaryPaymentResponse>("/api/web/salaries/pay", { method: "POST", headers: withJsonHeaders(), body: JSON.stringify({ school_id: schoolId, teacher_id: selectedTeacher.id, gross_salary: gross, deductions: parseInt(salaryForm.deductions) || 0, month: salaryForm.month, notes: salaryForm.notes || null }) });
    if (!response.ok) setError(payload?.error?.message || "تعذر صرف الراتب.");
    else { setSuccess(`تم دفع الراتب بنجاح ✓`); setShowPaySalary(false); fetchAll(); setTimeout(() => setSuccess(""), 3000); }
    setSavingSalary(false);
  };

  const fetchSchedule = async (grade: string, section: string) => {
    if (!schoolId) return;
    const { data, error: scheduleError } = await supabase
      .from("weekly_schedule")
      .select("*")
      .eq("school_id", schoolId)
      .eq("grade", grade)
      .eq("section", section);

    if (scheduleError) {
      setError(scheduleError.message || "تعذر تحميل الجدول.");
      return;
    }

    const grid: Record<string, string> = {};
    data?.forEach((entry: { day: string; period: number; session_type: string; teacher_id: string | null }) => {
      grid[`${entry.day}-${entry.period}-${entry.session_type}`] = entry.teacher_id || "";
    });
    setScheduleGrid(grid);
  };

  const saveSchedule = async () => {
    if (!schoolId || !scheduleGrade || !scheduleSection) return;
    setScheduleSaving(true);
    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("weekly_schedule")
        .delete()
        .eq("school_id", schoolId)
        .eq("grade", scheduleGrade)
        .eq("section", scheduleSection);

      if (deleteError) {
        throw deleteError;
      }

      const branchId = await getBranchId();
      const rows = Object.entries(scheduleGrid)
        .filter(([, teacherId]) => Boolean(teacherId))
        .map(([key, teacherId]) => {
          const [day, period, sessionType] = key.split("-");
          return {
            school_id: schoolId,
            branch_id: branchId,
            grade: scheduleGrade,
            section: scheduleSection,
            day,
            period: parseInt(period, 10),
            session_type: sessionType,
            teacher_id: teacherId,
          };
        });

      if (rows.length > 0) {
        const { error: insertError } = await supabase.from("weekly_schedule").insert(rows);
        if (insertError) {
          throw insertError;
        }
      }

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
      for (const grade of gradeOptions) {
        const price = priceEdits[grade] || 0;
        const existing = lecturePrices.find((entry) => entry.grade === grade);
        if (existing) {
          const { error: updateError } = await supabase
            .from("lecture_prices")
            .update({ price_per_lecture: price })
            .eq("id", existing.id);
          if (updateError) {
            throw updateError;
          }
        } else {
          const { error: insertError } = await supabase
            .from("lecture_prices")
            .insert({ school_id: schoolId, grade, price_per_lecture: price });
          if (insertError) {
            throw insertError;
          }
        }
      }

      setSuccess("تم حفظ الأسعار ✓");
      setShowPrices(false);
      await fetchAll();
      setTimeout(() => setSuccess(""), 3000);
    } catch (priceError) {
      setError(priceError instanceof Error ? priceError.message : "تعذر حفظ الأسعار.");
    }
  };

  const saveLessonTimes = async () => {
    setError("");

    try {
      for (const lessonTime of lessonTimes) {
        const start = timeEdits[`${lessonTime.period}-${lessonTime.session_type}-start`];
        const end = timeEdits[`${lessonTime.period}-${lessonTime.session_type}-end`];
        const { error: updateError } = await supabase
          .from("lesson_times")
          .update({ start_time: start, end_time: end })
          .eq("id", lessonTime.id);
        if (updateError) {
          throw updateError;
        }
      }

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
          amount: parseInt(deductionAmount, 10) || 0,
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

    const XLSX = await loadXLSX();
    const workbook = XLSX.utils.book_new();

    if (exportOptions.teachers) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          teachers.map((teacher) => ({
            الاسم: teacher.full_name,
            المسمى: teacher.job_title || "",
            المادة: teacher.subject || "",
            الراتب: teacher.base_salary,
            "سعر المحاضرة": teacher.lecture_price || 0,
          }))
        ),
        "الأساتذة"
      );
    }

    if (exportOptions.subjects) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(subjectsList.map((subject) => ({ المادة: subject.name }))),
        "المواد"
      );
    }

    if (exportOptions.classes) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(classes.map((classroom) => ({ الصف: classroom.grade, الشعبة: classroom.section }))),
        "الصفوف"
      );
    }

    if (exportOptions.prices) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          lecturePrices.map((entry) => ({
            الصف: entry.grade,
            السعر: entry.price_per_lecture,
          }))
        ),
        "الأسعار"
      );
    }

    if (exportOptions.fixed_salaries) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          salaries.map((salary) => ({
            الأستاذ: salary.teachers?.full_name || "",
            الشهر: salary.month,
            الإجمالي: salary.gross_salary,
            الخصومات: salary.deductions || 0,
            الصافي: (salary.gross_salary || 0) - (salary.deductions || 0),
          }))
        ),
        "الرواتب"
      );
    }

    if (exportOptions.lectures) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          exportLectures.map((lecture) => ({
            الأستاذ: lecture.teachers?.full_name || "",
            التاريخ: lecture.lecture_date,
            الصف: lecture.grade,
            الشعبة: lecture.section,
            الدرس: lecture.period,
            النوع: lecture.session_type,
            السعر: lecture.price,
          }))
        ),
        "المحاضرات"
      );
    }

    if (exportOptions.lesson_times) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          lessonTimes.map((lessonTime) => ({
            الفترة: lessonTime.session_type === "morning" ? "صباحي" : "ظهري",
            الدرس: lessonTime.period,
            البداية: lessonTime.start_time,
            النهاية: lessonTime.end_time,
          }))
        ),
        "التوقيتات"
      );
    }

    if (workbook.SheetNames.length === 0) {
      setError("اختر بيانات للتصدير");
      return;
    }

    await XLSX.writeFile(workbook, `تصدير_${formatDate(new Date())}.xlsx`);
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

  const printReport = (teacherId = reportTeacher) => {
    const teacher = teacherId ? teachers.find((entry) => entry.id === teacherId) : null;
    const lectures = teacherId ? dailyLectures.filter((lecture) => lecture.teacher_id === teacherId) : dailyLectures;
    const total = lectures.reduce((sum, lecture) => sum + (lecture.price || 0), 0);

    openPrintWindow(
      isEnglish ? "Teacher statement" : "كشف حساب",
      teacher?.full_name || (isEnglish ? "All teachers" : "جميع الأساتذة"),
      `<table><thead><tr><th>#</th><th>${isEnglish ? "Date" : "التاريخ"}</th><th>${isEnglish ? "Class" : "الصف"}</th><th>${isEnglish ? "Section" : "الشعبة"}</th><th>${isEnglish ? "Lesson" : "الدرس"}</th><th>${isEnglish ? "Price" : "السعر"}</th></tr></thead>
        <tbody>${lectures.map((lecture, index) => `<tr><td>${index + 1}</td><td>${formatDate(lecture.lecture_date)}</td><td>${escapeHtml(lecture.grade || "—")}</td><td>${escapeHtml(lecture.section || "—")}</td><td>${isEnglish ? "Lesson" : "الدرس"} ${escapeHtml(String(lecture.period ?? "—"))}</td><td>${formatNumber(lecture.price || 0)}</td></tr>`).join("")}</tbody></table>
        <div class="print-panel" style="margin-top:16px;text-align:center"><span class="print-label">${isEnglish ? "Total" : "الإجمالي"}</span><div class="print-value">د.ع ${formatNumber(total)}</div></div>`
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
      <div className="flex min-h-screen bg-[var(--surface)]">
        <AppSidebar currentPath="/salaries" />
        
        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar title={t("salaries.title")} subtitle={t("salaries.subtitle")} scope={schoolScope} fixed />

          <main className="app-shell-frame--with-fixed-topbar flex-1 min-h-0 flex flex-col overflow-hidden xl:flex-row">
            <div className="w-72 shrink-0 border-e border-[var(--border)] bg-[var(--surface-soft)] backdrop-blur-xl hidden xl:block">
              <SalariesSidebar activeSection={activeSection} onSectionChange={setActiveSection} onDeductionsLoad={() => void fetchDeductionsList()} onCalendarLoad={() => void fetchCalendarLectures(calYear, calMonth)} />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
                <section className="xl:hidden rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-[var(--card-shadow)]">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {SIDEBAR_ITEMS.filter((item) => item.id !== "teachers").map((item) => {
                      const isActive = item.id === "main" ? isMainSection : activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={cn(
                            "flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-all",
                            isActive
                              ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-[var(--shadow-primary)]"
                              : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          )}
                          onClick={() => handleResponsiveSectionChange(item.id)}
                        >
                          <AppIcon token={item.icon} size={16} />
                          <span>{t(`salaries.sidebar.items.${item.id}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
                {success && <div className="p-4 rounded-2xl bg-[color-mix(in_srgb,var(--success)_10%,transparent)] border border-[color-mix(in_srgb,var(--success)_30%,transparent)] text-[var(--success)] font-bold flex items-center gap-3"><Users size={18} /> {success}</div>}
                {error && <div className="p-4 rounded-2xl bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger)] font-bold flex items-center gap-3"><AlertCircle size={18} /> {error}</div>}

                <SchoolScopeBanner scope={schoolScope} showSelector={false} />

                {schoolScope.shouldBlockContent ? (
                  <div className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)] backdrop-blur-xl">
                    <SchoolScopeEmptyState
                      scope={schoolScope}
                      title={t("salaries.emptyState.title")}
                      description={t("salaries.emptyState.description")}
                    />
                  </div>
                ) : (
                  <>
                    {isMainSection && (
                      <div className="space-y-8">
                        {/* Summary Stats */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          {[
                            {
                              label: t("salaries.summary.activeTeachers"),
                              value: activeTeachers,
                              icon: Users,
                              variant: "primary" as const,
                            },
                            {
                              label: t("salaries.summary.totalBaseSalaries"),
                              value: `${t("common.currency")} ${formatNumber(totalBaseSalaries)}`,
                              icon: Wallet,
                              variant: "info" as const,
                            },
                            {
                              label: t("salaries.summary.paidThisMonth"),
                              value: `${t("common.currency")} ${formatNumber(totalPaidThisMonth)}`,
                              icon: Banknote,
                              variant: "success" as const,
                            },
                            {
                              label: t("salaries.summary.pendingPayout"),
                              value: unpaidTeachers.length,
                              icon: CalendarCheck,
                              variant: "warning" as const,
                            },
                          ].map((card, i) => (
                            <div key={i} className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)] flex items-center gap-4">
                              <div className={cn(
                                "h-12 w-12 rounded-2xl flex items-center justify-center",
                                card.variant === "primary" && "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]",
                                card.variant === "info" && "bg-[color-mix(in_srgb,var(--info)_10%,transparent)] text-[var(--info)]",
                                card.variant === "success" && "bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]",
                                card.variant === "warning" && "bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[var(--warning)]",
                              )}><card.icon size={22} /></div>
                              <div>
                                <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">{card.label}</div>
                                <div className="text-base font-black text-[var(--text-primary)] mt-0.5">{card.value}</div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Quick Actions */}
                        <section className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]">
                          <QuickAccessGrid showAll={showQuickAll} onToggleShowAll={() => setShowQuickAll(!showQuickAll)} onAction={handleQuickAction} />
                        </section>

                        {/* Main Content Area */}
                        <section className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]">
                          <div className="space-y-8">
                            <div className="flex p-1 w-fit rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)]">
                              {[
                                { id: "main", label: t("salaries.tabs.teachers"), icon: Users, count: teachers.length },
                                { id: "salaries_tab", label: t("salaries.tabs.salaryLog"), icon: Banknote, count: salaries.length },
                                { id: "unpaid_tab", label: t("salaries.tabs.pendingPayout"), icon: AlertCircle, count: unpaidTeachers.length }
                              ].map((t) => (
                                <button key={t.id} className={cn("flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all", (activeSection === t.id || (activeSection === "main" && t.id === "main")) ? "bg-[var(--surface-soft)] shadow-sm text-[var(--primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")} onClick={() => setActiveSection(t.id)}>
                                  <t.icon size={14} /> {t.label} <span className="ms-1 px-1.5 py-0.5 rounded-md bg-[var(--surface-muted)] text-[10px]">{t.count}</span>
                                </button>
                              ))}
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

                    {activeSection === "schedule_tab" && <section className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]"><ScheduleSection teachers={teachers} classes={classes} scheduleGrade={scheduleGrade} scheduleSection={scheduleSection} scheduleGrid={scheduleGrid} saving={scheduleSaving} onGradeChange={setScheduleGrade} onSectionChange={setScheduleSection} onFetchSchedule={fetchSchedule} onGridChange={setScheduleGrid} onSave={saveSchedule} /></section>}
                    {activeSection === "deductions" && <section className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]"><DeductionsSection teachers={teachers} deductionsList={deductionsList} deductionTeacher={deductionTeacher} deductionAmount={deductionAmount} deductionNotes={deductionNotes} saving={savingDeduction} onUpdateTeacher={setDeductionTeacher} onUpdateAmount={setDeductionAmount} onUpdateNotes={setDeductionNotes} onSave={saveDeduction} /></section>}
                    {activeSection === "reports" && <section className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]"><ReportsSection reportView={reportView} reportTeacher={reportTeacher} reportLoading={reportLoading} reportSummary={reportSummary} reportTotals={reportTotals} dailyLectures={dailyLectures} teachers={teachers} onViewChange={setReportView} onTeacherChange={setReportTeacher} onPrintReport={() => void (async () => { await fetchDetailedReportAll(reportTeacher); printReport(reportTeacher); })()} /></section>}
                    {activeSection === "calendar" && <section className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]"><CalendarSection calYear={calYear} calMonth={calMonth} calLectureDates={calLectureDates} onYearChange={setCalYear} onMonthChange={setCalMonth} /></section>}
                    {activeSection === "archive" && <section className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]"><ArchiveSection archives={archives} currentMonth={currentMonth} onArchive={() => setShowArchiveConfirm(true)} /></section>}
                    {activeSection === "settings" && <section className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]"><SettingsSection classes={classes} onExport={() => setShowExport(true)} /></section>}
                  </>
                )}
              </div>
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
