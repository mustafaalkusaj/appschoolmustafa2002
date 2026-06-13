"use client";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/brand/brand-utils";
import { Save, Copy, Settings, BarChart3, CalendarDays, ClipboardList, LayoutGrid, ChevronDown, ChevronUp, Users, CheckCircle2, XCircle, Clock, GraduationCap, Printer, FileSpreadsheet } from "@/lib/icons";
import { printHtmlDocument, wrapPrintDocument, escapeHtml } from "@/lib/print/branding";
import { downloadExcelExport } from "@/lib/excel-client";
import { useRuntimeBranding } from "@/hooks/brand/useRuntimeBranding";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { DailyLogModal } from "@/app/[locale]/salaries/_components/DailyLogModal";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = "present" | "absent" | "late" | "excused" | "holiday";

type Teacher = {
  id: string;
  full_name: string;
  subject: string | null;
  status: string;
  classes_taught?: { grade: string; section: string }[] | null;
};

type AttendanceRecord = {
  id?: string;
  teacher_id: string;
  status: AttendanceStatus;
  check_in_time: string | null;
  check_out_time: string | null;
  notes: string | null;
};

type TeacherSummary = {
  teacher_id: string;
  name: string;
  subject: string | null;
  present: number;
  absent: number;
  late: number;
  excused: number;
  holiday: number;
  total_days: number;
};

type AttendanceSettings = {
  work_start_time: string;
  work_end_time: string;
  late_threshold_minutes: number;
  work_days: string[];
  absent_deduction_type: "none" | "fixed" | "daily_rate";
  absent_deduction_amount: number | null;
  late_deduction_type: "none" | "fixed" | "per_minute";
  late_deduction_amount: number | null;
  max_late_days_before_absent: number;
};

type AttendanceLogRecord = {
  id: string;
  attendance_date: string;
  teacher_id: string;
  teacher_name: string;
  subject: string | null;
  status: AttendanceStatus;
  check_in_time: string | null;
  check_out_time: string | null;
  notes: string | null;
};

type TodayLecture = {
  id: string;
  teacher_id: string;
  teacher_name: string;
  grade: string;
  section: string;
  period: number;
  session_type: string | null;
  lecture_date: string;
  price: number;
};

type DailyRecordsResponse = {
  ok?: boolean;
  records?: Array<AttendanceRecord & { teachers?: { id: string; full_name: string; subject: string | null } | null }>;
  error?: { message?: string };
};

type SummaryResponse = {
  ok?: boolean;
  teachers?: TeacherSummary[];
  details?: { date: string; status: string }[];
  error?: { message?: string };
};

type SettingsResponse = {
  ok?: boolean;
  settings?: AttendanceSettings;
  error?: { message?: string };
};

type TeachersResponse = {
  ok?: boolean;
  teachers?: Teacher[];
  error?: { message?: string };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

function yesterdayIso() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function buildUrl(path: string, params: Record<string, string | number | null | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== "") sp.set(k, String(v));
  });
  return `${path}?${sp.toString()}`;
}

function getApiError(payload: { error?: { message?: string } } | null | undefined, fallback: string) {
  return typeof payload?.error?.message === "string" && payload.error.message.trim()
    ? payload.error.message
    : fallback;
}

// STATUS_LABELS is now built dynamically inside the component using t()

const STATUS_VARS: Record<AttendanceStatus, { bg: string; text: string }> = {
  present:  { bg: "bg-[color-mix(in_srgb,var(--success)_12%,transparent)]",  text: "text-[var(--success)]" },
  absent:   { bg: "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]",   text: "text-[var(--danger)]" },
  late:     { bg: "bg-amber-50",  text: "text-amber-700" },
  excused:  { bg: "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]",  text: "text-[var(--primary)]" },
  holiday:  { bg: "bg-[color-mix(in_srgb,var(--text-muted)_10%,transparent)]", text: "text-[var(--text-muted)]" },
};

const STATUS_EMOJIS: Record<AttendanceStatus, string> = {
  present: "✅",
  absent:  "❌",
  late:    "🕐",
  excused: "📝",
  holiday: "🏖️",
};

const ALL_STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused", "holiday"];

// WORK_DAY_LABELS is now built dynamically inside the component using t()

const DEFAULT_SETTINGS: AttendanceSettings = {
  work_start_time: "08:00",
  work_end_time:   "15:00",
  late_threshold_minutes: 15,
  work_days: ["sunday", "monday", "tuesday", "wednesday", "thursday"],
  absent_deduction_type:  "none",
  absent_deduction_amount: null,
  late_deduction_type:    "none",
  late_deduction_amount:  null,
  max_late_days_before_absent: 3,
};

// ─── Design tokens ────────────────────────────────────────────────────────────

const INPUT_CLS =
  "h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10";

const SELECT_CLS =
  "h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10";

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status, label }: { status: AttendanceStatus; label: string }) {
  const v = STATUS_VARS[status];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold", v.bg, v.text)}>
      <span>{STATUS_EMOJIS[status]}</span>
      <span>{label}</span>
    </span>
  );
}

function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-[var(--surface-soft)] animate-pulse" />
      ))}
    </div>
  );
}

function AlertBox({ variant, children }: { variant: "error" | "success"; children: React.ReactNode }) {
  const isErr = variant === "error";
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm font-medium",
        isErr
          ? "border-[var(--danger)]/30 bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] text-[var(--danger)]"
          : "border-[var(--success)]/30 bg-[color-mix(in_srgb,var(--success)_8%,transparent)] text-[var(--success)]",
      )}
    >
      {children}
    </div>
  );
}

function PctBadge({ present, total }: { present: number; total: number }) {
  if (total === 0) return <span className="text-[var(--text-muted)] text-xs">—</span>;
  const pct = Math.round((present / total) * 100);
  const cls =
    pct >= 90 ? "text-[var(--success)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)]"
    : pct >= 70 ? "text-amber-700 bg-amber-50"
    : "text-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]";
  return <span className={cn("inline-block px-2.5 py-0.5 rounded-full text-xs font-bold", cls)}>{pct}%</span>;
}

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimatedNumber({ value }: { value: number }) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const unsub = rounded.on("change", setDisplay);
    return unsub;
  }, [rounded]);

  useEffect(() => {
    const controls = animate(motionVal, value, { duration: 0.7, ease: "easeOut" });
    return controls.stop;
  }, [value, motionVal]);

  return <span>{display}</span>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeacherAttendancePage() {
  const pathname = usePathname();
  const _locale = getLocaleFromPath(pathname) as "ar" | "en";
  const t = useTranslations("teacherAttendance");
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);

  const STATUS_LABELS: Record<AttendanceStatus, string> = {
    present: t("status.present"),
    absent:  t("status.absent"),
    late:    t("status.late"),
    excused: t("status.excused"),
    holiday: t("status.holiday"),
  };

  const WORK_DAY_LABELS: Record<string, string> = {
    sunday:    t("workDays.sunday"),
    monday:    t("workDays.monday"),
    tuesday:   t("workDays.tuesday"),
    wednesday: t("workDays.wednesday"),
    thursday:  t("workDays.thursday"),
    friday:    t("workDays.friday"),
    saturday:  t("workDays.saturday"),
  };

  const runtimeBranding = useRuntimeBranding();

  const [activeTab, setActiveTab] = useState<"daily" | "log" | "monthly" | "reports" | "settings">("daily");

  // Daily
  const [date, setDate]         = useState<string>(todayIso());
  const [viewMode, setViewMode] = useState<"detailed" | "quick">("detailed");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [records, setRecords]   = useState<Record<string, AttendanceRecord>>({});
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [dailyError, setDailyError]     = useState("");
  const [dailySuccess, setDailySuccess] = useState("");

  // Monthly
  const now = new Date();
  const [monthlyYear, setMonthlyYear]   = useState(now.getFullYear());
  const [monthlyMonth, setMonthlyMonth] = useState(now.getMonth() + 1);
  const [summaryData, setSummaryData]   = useState<TeacherSummary[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError]     = useState("");
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);

  // Reports
  const [reportFromYear, setReportFromYear]   = useState(now.getFullYear());
  const [reportFromMonth, setReportFromMonth] = useState(now.getMonth() + 1);
  const [reportToYear, setReportToYear]       = useState(now.getFullYear());
  const [reportToMonth, setReportToMonth]     = useState(now.getMonth() + 1);
  const [reportData, setReportData]       = useState<TeacherSummary[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError]     = useState("");
  const [reportTeacherFilter, setReportTeacherFilter] = useState<string>("all");
  const [reportDetails, setReportDetails] = useState<{ date: string; status: string }[]>([]);

  // Settings
  const [settings, setSettings]               = useState<AttendanceSettings>(DEFAULT_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving]   = useState(false);
  const [settingsError, setSettingsError]     = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState("");

  // Daily Log (linked to salaries)
  const [showDailyLog,     setShowDailyLog]     = useState(false);
  const [logClasses,       setLogClasses]       = useState<{ id: string; school_id: string; branch_id?: string | null; grade: string; section: string }[]>([]);
  const [logLecturePrices, setLogLecturePrices] = useState<{ grade: string; price_per_lecture: number }[]>([]);
  const [dailyLogTeacher,  setDailyLogTeacher]  = useState("");
  const [dailyLogDate,     setDailyLogDate]     = useState<string>(todayIso());
  const [dailyLogGrades,   setDailyLogGrades]   = useState<string[]>([]);
  const [dailyLogPeriods,  setDailyLogPeriods]  = useState<string[]>([]);
  const [savingDailyLog,   setSavingDailyLog]   = useState(false);
  const [logBootstrapped,  setLogBootstrapped]  = useState(false);
  const [todayLectures,    setTodayLectures]    = useState<TodayLecture[]>([]);
  const [lecturesLoading,  setLecturesLoading]  = useState(false);
  const [lecturesDate,     setLecturesDate]     = useState(todayIso());
  const [deletingLectureId, setDeletingLectureId] = useState<string | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getSchoolAndBranch = useCallback(async () => {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    const branchId = profile?.branch_id ?? null;
    return { schoolId, branchId };
  }, [profile, schoolScope.selectedSchoolId]);

  // ── Log bootstrap ──────────────────────────────────────────────────────────
  const fetchLogBootstrap = useCallback(async () => {
    if (logBootstrapped) return;
    const { schoolId, branchId } = await getSchoolAndBranch();
    if (!schoolId) return;
    try {
      const { payload } = await fetchJsonWithAuthorizedSession<{ classes?: { id: string; school_id: string; branch_id?: string | null; grade: string; section: string }[]; lecturePrices?: { grade: string; price_per_lecture: number }[] }>(
        buildUrl("/api/web/salaries/bootstrap", { schoolId, branchId, scope: "reference" }),
      );
      setLogClasses(payload?.classes ?? []);
      setLogLecturePrices(payload?.lecturePrices ?? []);
      setLogBootstrapped(true);
    } catch {}
  }, [getSchoolAndBranch, logBootstrapped]);

  const fetchTodayLectures = useCallback(async (forDate: string) => {
    const { schoolId, branchId } = await getSchoolAndBranch();
    if (!schoolId) return;
    setLecturesLoading(true);
    try {
      const { payload } = await fetchJsonWithAuthorizedSession<{ ok?: boolean; records?: TodayLecture[] }>(
        buildUrl("/api/web/salaries/lectures", { schoolId, branchId, view: "list", date: forDate }),
      );
      setTodayLectures(payload?.records ?? []);
    } catch { setTodayLectures([]); } finally { setLecturesLoading(false); }
  }, [getSchoolAndBranch]);

  useEffect(() => {
    if (activeTab === "log") {
      void fetchLogBootstrap();
      void fetchTodayLectures(lecturesDate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, schoolScope.shouldBlockContent]);

  // ── Save daily lectures ────────────────────────────────────────────────────
  const saveDailyLectures = async () => {
    if (!dailyLogTeacher || !dailyLogDate || dailyLogGrades.length === 0 || dailyLogPeriods.length === 0) return;
    const { schoolId, branchId } = await getSchoolAndBranch();
    if (!schoolId) return;
    setSavingDailyLog(true);
    try {
      const rows = dailyLogGrades.flatMap((gradeSection) => {
        const [grade, section] = gradeSection.split("||");
        const classPrice = logLecturePrices.find((p) => p.grade === grade)?.price_per_lecture ?? 0;
        return dailyLogPeriods.map((periodKey) => {
          const [period, sessionType] = periodKey.split("-");
          return { branch_id: branchId, teacher_id: dailyLogTeacher, grade, section, period: parseInt(period, 10), session_type: sessionType, lecture_date: dailyLogDate, price: classPrice };
        });
      });
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok?: boolean; error?: { message?: string } }>(
        "/api/web/salaries/lectures",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolId, branchId, rows }) },
      );
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر تسجيل المحاضرات.");
      setShowDailyLog(false);
      setDailyLogGrades([]);
      setDailyLogPeriods([]);
      void fetchTodayLectures(dailyLogDate);
    } catch (e) {
      alert(e instanceof Error && e.message ? e.message : "تعذر تسجيل المحاضرات.");
    } finally {
      setSavingDailyLog(false);
    }
  };

  const deleteLecture = async (lectureId: string) => {
    const { schoolId } = await getSchoolAndBranch();
    if (!schoolId) return;
    setDeletingLectureId(lectureId);
    try {
      const { response } = await fetchJsonWithAuthorizedSession(
        buildUrl(`/api/web/salaries/lectures/${lectureId}`, { schoolId }),
        { method: "DELETE" },
      );
      if (response.ok) setTodayLectures((prev) => prev.filter((l) => l.id !== lectureId));
    } catch { /* silent */ } finally { setDeletingLectureId(null); }
  };

  // ── Fetch teachers ─────────────────────────────────────────────────────────
  const fetchTeachers = useCallback(async () => {
    const { schoolId, branchId } = await getSchoolAndBranch();
    if (!schoolId) return;
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<TeachersResponse>(
        buildUrl("/api/web/teachers", { schoolId, branchId, status: "active" }),
      );
      if (!response.ok) throw new Error(getApiError(payload, t("daily.errorLoadTeachers")));
      setTeachers(payload?.teachers ?? []);
    } catch { setTeachers([]); }
  }, [getSchoolAndBranch]);

  // ── Fetch daily ────────────────────────────────────────────────────────────
  const fetchDailyRecords = useCallback(async (forDate: string, teacherList: Teacher[]) => {
    const { schoolId, branchId } = await getSchoolAndBranch();
    if (!schoolId) return;
    setLoading(true); setDailyError("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<DailyRecordsResponse>(
        buildUrl("/api/web/teacher-attendance", { schoolId, branchId, date: forDate }),
      );
      if (!response.ok) throw new Error(getApiError(payload, t("daily.errorLoad")));
      const existingMap: Record<string, AttendanceRecord> = {};
      for (const rec of payload?.records ?? []) {
        existingMap[rec.teacher_id] = { id: rec.id, teacher_id: rec.teacher_id, status: rec.status, check_in_time: rec.check_in_time, check_out_time: rec.check_out_time, notes: rec.notes };
      }
      const initial: Record<string, AttendanceRecord> = {};
      for (const t of teacherList) {
        initial[t.id] = existingMap[t.id] ?? { teacher_id: t.id, status: "present", check_in_time: null, check_out_time: null, notes: null };
      }
      setRecords(initial);
    } catch (e) { setDailyError(e instanceof Error ? e.message : t("daily.errorLoad"));
    } finally { setLoading(false); }
  }, [getSchoolAndBranch]);

  // ── Copy yesterday ─────────────────────────────────────────────────────────
  const copyYesterday = useCallback(async () => {
    const { schoolId, branchId } = await getSchoolAndBranch();
    if (!schoolId) return;
    setLoading(true); setDailyError("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<DailyRecordsResponse>(
        buildUrl("/api/web/teacher-attendance", { schoolId, branchId, date: yesterdayIso() }),
      );
      if (!response.ok) throw new Error(getApiError(payload, t("daily.errorYesterday")));
      const yMap: Record<string, AttendanceRecord> = {};
      for (const rec of payload?.records ?? []) {
        yMap[rec.teacher_id] = { teacher_id: rec.teacher_id, status: rec.status, check_in_time: rec.check_in_time, check_out_time: rec.check_out_time, notes: rec.notes };
      }
      setRecords((prev) => {
        const next = { ...prev };
        for (const tid of Object.keys(next)) {
          if (yMap[tid]) next[tid] = { ...yMap[tid], id: prev[tid]?.id };
        }
        return next;
      });
    } catch (e) { setDailyError(e instanceof Error ? e.message : t("daily.errorYesterday"));
    } finally { setLoading(false); }
  }, [getSchoolAndBranch]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const saveAllRecords = useCallback(async () => {
    const { schoolId, branchId } = await getSchoolAndBranch();
    if (!schoolId) return;
    const recordsArr = Object.values(records);
    if (recordsArr.length === 0) return;
    setSaving(true); setDailyError(""); setDailySuccess("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok?: boolean; error?: { message?: string } }>(
        "/api/web/teacher-attendance",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolId, branchId, date,
            records: recordsArr.map((r) => ({ teacher_id: r.teacher_id, status: r.status, check_in_time: r.check_in_time, check_out_time: r.check_out_time, notes: r.notes })),
          }),
        },
      );
      if (!response.ok) throw new Error(getApiError(payload, t("daily.errorSave")));
      setDailySuccess(t("daily.savedSuccess"));
      setTimeout(() => setDailySuccess(""), 3000);
    } catch (e) { setDailyError(e instanceof Error ? e.message : t("daily.errorSave"));
    } finally { setSaving(false); }
  }, [getSchoolAndBranch, records, date]);

  // ── Monthly summary ────────────────────────────────────────────────────────
  const fetchMonthlySummary = useCallback(async (year: number, month: number) => {
    const { schoolId, branchId } = await getSchoolAndBranch();
    if (!schoolId) return;
    setSummaryLoading(true); setSummaryError("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<SummaryResponse>(
        buildUrl("/api/web/teacher-attendance/summary", { schoolId, branchId, year, month }),
      );
      if (!response.ok) throw new Error(getApiError(payload, t("monthly.errorLoad")));
      setSummaryData(payload?.teachers ?? []);
    } catch (e) { setSummaryError(e instanceof Error ? e.message : t("monthly.errorLoad")); setSummaryData([]);
    } finally { setSummaryLoading(false); }
  }, [getSchoolAndBranch]);

  // ── Report ─────────────────────────────────────────────────────────────────
  const fetchReport = useCallback(async () => {
    const { schoolId, branchId } = await getSchoolAndBranch();
    if (!schoolId) return;
    setReportLoading(true); setReportError(""); setReportDetails([]);
    try {
      const aggregated: Record<string, TeacherSummary> = {};
      const allDetails: { date: string; status: string }[] = [];
      const teacherIdParam = reportTeacherFilter !== "all" ? reportTeacherFilter : undefined;
      let y = reportFromYear, m = reportFromMonth;
      while (y < reportToYear || (y === reportToYear && m <= reportToMonth)) {
        const params: Record<string, string | number | null> = { schoolId, branchId, year: y, month: m };
        if (teacherIdParam) params.teacherId = teacherIdParam;
        const { response, payload } = await fetchJsonWithAuthorizedSession<SummaryResponse>(
          buildUrl("/api/web/teacher-attendance/summary", params),
        );
        if (response.ok && payload?.teachers) {
          for (const t of payload.teachers) {
            if (!aggregated[t.teacher_id]) { aggregated[t.teacher_id] = { ...t }; }
            else {
              const a = aggregated[t.teacher_id];
              a.present += t.present; a.absent += t.absent; a.late += t.late;
              a.excused += t.excused; a.holiday += t.holiday; a.total_days += t.total_days;
            }
          }
          if (payload.details) allDetails.push(...payload.details);
        }
        if (m === 12) { m = 1; y++; } else { m++; }
        if (y > reportToYear || (y === reportToYear && m > reportToMonth)) break;
      }
      setReportData(Object.values(aggregated).sort((a, b) => {
        const pa = a.total_days > 0 ? a.present / a.total_days : 0;
        const pb = b.total_days > 0 ? b.present / b.total_days : 0;
        return pb - pa;
      }));
      setReportDetails(allDetails.sort((a, b) => a.date.localeCompare(b.date)));
    } catch (e) { setReportError(e instanceof Error ? e.message : t("reports.errorLoad")); setReportData([]); setReportDetails([]);
    } finally { setReportLoading(false); }
  }, [getSchoolAndBranch, reportFromYear, reportFromMonth, reportToYear, reportToMonth, reportTeacherFilter]);

  // ── Settings ───────────────────────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    const { schoolId, branchId } = await getSchoolAndBranch();
    if (!schoolId) return;
    setSettingsLoading(true); setSettingsError("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<SettingsResponse>(
        buildUrl("/api/web/teacher-attendance/settings", { schoolId, branchId }),
      );
      if (!response.ok) throw new Error(getApiError(payload, t("settings.errorLoad")));
      if (payload?.settings) setSettings(payload.settings);
    } catch (e) { setSettingsError(e instanceof Error ? e.message : t("settings.errorLoad"));
    } finally { setSettingsLoading(false); }
  }, [getSchoolAndBranch]);

  const saveSettings = useCallback(async () => {
    const { schoolId, branchId } = await getSchoolAndBranch();
    if (!schoolId) return;
    setSettingsSaving(true); setSettingsError(""); setSettingsSuccess("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok?: boolean; error?: { message?: string } }>(
        "/api/web/teacher-attendance/settings",
        { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...settings, school_id: schoolId, branch_id: branchId ?? null }) },
      );
      if (!response.ok) throw new Error(getApiError(payload, t("settings.errorSave")));
      setSettingsSuccess(t("settings.savedSuccess"));
      setTimeout(() => setSettingsSuccess(""), 3000);
    } catch (e) { setSettingsError(e instanceof Error ? e.message : t("settings.errorSave"));
    } finally { setSettingsSaving(false); }
  }, [getSchoolAndBranch, settings]);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (schoolScope.shouldBlockContent) return;
    fetchTeachers();
  }, [schoolScope.shouldBlockContent, schoolScope.selectedSchoolId, fetchTeachers]);

  useEffect(() => {
    if (schoolScope.shouldBlockContent || teachers.length === 0) return;
    if (activeTab === "daily") fetchDailyRecords(date, teachers);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, date, teachers, schoolScope.shouldBlockContent]);

  useEffect(() => {
    if (schoolScope.shouldBlockContent) return;
    if (activeTab === "monthly") fetchMonthlySummary(monthlyYear, monthlyMonth);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, monthlyYear, monthlyMonth, schoolScope.shouldBlockContent]);

  useEffect(() => {
    if (schoolScope.shouldBlockContent) return;
    if (activeTab === "settings") fetchSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, schoolScope.shouldBlockContent]);

  function updateRecord(teacherId: string, patch: Partial<AttendanceRecord>) {
    setRecords((prev) => ({ ...prev, [teacherId]: { ...prev[teacherId], ...patch } }));
  }

  // ── Print helpers ─────────────────────────────────────────────────────────
  const brandingOpts = {
    schoolName: runtimeBranding.schoolName,
    logoUrl: runtimeBranding.logoUrl,
    primaryColor: runtimeBranding.primaryColor,
    secondaryColor: runtimeBranding.secondaryColor,
    locale: _locale,
  } as const;

  function printDailyAttendance() {
    const rows = teachers.map((teacher, idx) => {
      const rec = records[teacher.id];
      if (!rec) return "";
      return `<tr>
        <td style="text-align:center">${idx + 1}</td>
        <td style="font-weight:700">${escapeHtml(teacher.full_name)}</td>
        <td>${escapeHtml(teacher.subject ?? "—")}</td>
        <td style="text-align:center">${escapeHtml(STATUS_LABELS[rec.status])}</td>
        <td style="text-align:center">${escapeHtml(rec.check_in_time ?? "—")}</td>
        <td style="text-align:center">${escapeHtml(rec.check_out_time ?? "—")}</td>
        <td>${escapeHtml(rec.notes ?? "")}</td>
      </tr>`;
    }).join("");
    const html = wrapPrintDocument({
      title: "سجل حضور المعلمين",
      subtitle: date,
      branding: brandingOpts,
      bodyHtml: `<table>
        <thead><tr>
          <th>#</th><th>المعلم</th><th>المادة</th><th>الحالة</th><th>وقت الحضور</th><th>وقت الانصراف</th><th>ملاحظات</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`,
      autoPrint: false,
    });
    printHtmlDocument(html);
  }

  function printMonthlySummary() {
    const monthLabel = MONTHS.find((m) => m.value === monthlyMonth)?.label ?? String(monthlyMonth);
    const rows = summaryData.map((row) => {
      const pct = row.total_days > 0 ? Math.round((row.present / row.total_days) * 100) : 0;
      return `<tr>
        <td style="font-weight:700">${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.subject ?? "—")}</td>
        <td style="text-align:center">${row.present}</td>
        <td style="text-align:center">${row.absent}</td>
        <td style="text-align:center">${row.late}</td>
        <td style="text-align:center">${row.excused}</td>
        <td style="text-align:center">${row.total_days}</td>
        <td style="text-align:center;font-weight:700">${pct}%</td>
      </tr>`;
    }).join("");
    const html = wrapPrintDocument({
      title: "ملخص الحضور الشهري",
      subtitle: `${monthLabel} ${monthlyYear}`,
      branding: brandingOpts,
      bodyHtml: `<table>
        <thead><tr>
          <th>المعلم</th><th>المادة</th><th>حاضر</th><th>غائب</th><th>متأخر</th><th>معذور</th><th>المجموع</th><th>نسبة الحضور</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`,
      autoPrint: false,
    });
    printHtmlDocument(html);
  }

  function printReportData() {
    const fromLabel = `${MONTHS.find((m) => m.value === reportFromMonth)?.label ?? reportFromMonth} ${reportFromYear}`;
    const toLabel = `${MONTHS.find((m) => m.value === reportToMonth)?.label ?? reportToMonth} ${reportToYear}`;
    const rows = reportData.map((row, idx) => {
      const pct = row.total_days > 0 ? Math.round((row.present / row.total_days) * 100) : 0;
      return `<tr>
        <td style="text-align:center">${idx + 1}</td>
        <td style="font-weight:700">${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.subject ?? "—")}</td>
        <td style="text-align:center">${row.present}</td>
        <td style="text-align:center">${row.absent}</td>
        <td style="text-align:center">${row.late}</td>
        <td style="text-align:center;font-weight:700">${pct}%</td>
      </tr>`;
    }).join("");
    const html = wrapPrintDocument({
      title: "تقرير الحضور",
      subtitle: `${fromLabel} — ${toLabel}`,
      branding: brandingOpts,
      bodyHtml: `<table>
        <thead><tr>
          <th>#</th><th>المعلم</th><th>المادة</th><th>حاضر</th><th>غائب</th><th>متأخر</th><th>نسبة الحضور</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`,
      autoPrint: false,
    });
    printHtmlDocument(html);
  }

  function exportDailyExcel() {
    void downloadExcelExport({
      filename: `حضور-المعلمين-${date}`,
      sheets: [{
        name: "الحضور اليومي",
        title: `حضور المعلمين - ${date}`,
        columns: [
          { key: "num", header: "#", width: 5 },
          { key: "name", header: "المعلم", width: 25 },
          { key: "subject", header: "المادة", width: 20 },
          { key: "status", header: "الحالة", width: 15 },
          { key: "checkIn", header: "وقت الحضور", width: 15 },
          { key: "checkOut", header: "وقت الانصراف", width: 15 },
          { key: "notes", header: "ملاحظات", width: 30 },
        ],
        rows: teachers.map((teacher, idx) => {
          const rec = records[teacher.id];
          return {
            num: idx + 1,
            name: teacher.full_name,
            subject: teacher.subject ?? "",
            status: rec ? STATUS_LABELS[rec.status] : "",
            checkIn: rec?.check_in_time ?? "",
            checkOut: rec?.check_out_time ?? "",
            notes: rec?.notes ?? "",
          };
        }),
      }],
    });
  }

  function exportMonthlyExcel() {
    const monthLabel = MONTHS.find((m) => m.value === monthlyMonth)?.label ?? String(monthlyMonth);
    void downloadExcelExport({
      filename: `ملخص-الحضور-${monthLabel}-${monthlyYear}`,
      sheets: [{
        name: "الملخص الشهري",
        title: `ملخص الحضور - ${monthLabel} ${monthlyYear}`,
        columns: [
          { key: "name", header: "المعلم", width: 25 },
          { key: "subject", header: "المادة", width: 20 },
          { key: "present", header: "حاضر", width: 10 },
          { key: "absent", header: "غائب", width: 10 },
          { key: "late", header: "متأخر", width: 10 },
          { key: "excused", header: "معذور", width: 10 },
          { key: "total", header: "المجموع", width: 12 },
          { key: "rate", header: "نسبة الحضور", width: 15 },
        ],
        rows: summaryData.map((row) => ({
          name: row.name,
          subject: row.subject ?? "",
          present: row.present,
          absent: row.absent,
          late: row.late,
          excused: row.excused,
          total: row.total_days,
          rate: row.total_days > 0 ? `${Math.round((row.present / row.total_days) * 100)}%` : "—",
        })),
      }],
    });
  }

  function exportReportExcel() {
    const fromLabel = `${MONTHS.find((m) => m.value === reportFromMonth)?.label ?? reportFromMonth}-${reportFromYear}`;
    const toLabel = `${MONTHS.find((m) => m.value === reportToMonth)?.label ?? reportToMonth}-${reportToYear}`;
    void downloadExcelExport({
      filename: `تقرير-الحضور-${fromLabel}-إلى-${toLabel}`,
      sheets: [{
        name: "تقرير الحضور",
        title: `تقرير الحضور - ${fromLabel} إلى ${toLabel}`,
        columns: [
          { key: "rank", header: "#", width: 5 },
          { key: "name", header: "المعلم", width: 25 },
          { key: "subject", header: "المادة", width: 20 },
          { key: "present", header: "حاضر", width: 10 },
          { key: "absent", header: "غائب", width: 10 },
          { key: "late", header: "متأخر", width: 10 },
          { key: "rate", header: "نسبة الحضور", width: 15 },
        ],
        rows: reportData.map((row, idx) => ({
          rank: idx + 1,
          name: row.name,
          subject: row.subject ?? "",
          present: row.present,
          absent: row.absent,
          late: row.late,
          rate: row.total_days > 0 ? `${Math.round((row.present / row.total_days) * 100)}%` : "—",
        })),
      }],
    });
  }

  // ── Stats derived from today's records ───────────────────────────────────
  const recordValues = Object.values(records);
  const statsCards = [
    { label: t("stats.totalTeachers"), value: teachers.length,                                            icon: Users,        color: "var(--primary)" },
    { label: t("stats.presentToday"),  value: recordValues.filter((r) => r.status === "present").length,  icon: CheckCircle2, color: "var(--success)" },
    { label: t("stats.absentToday"),   value: recordValues.filter((r) => r.status === "absent").length,   icon: XCircle,      color: "var(--danger)" },
    { label: t("stats.lateToday"),     value: recordValues.filter((r) => r.status === "late").length,     icon: Clock,        color: "#f59e0b" },
  ];

  const TABS = [
    { id: "daily",    label: t("tabs.daily"),    icon: <CalendarDays size={15} /> },
    { id: "log",      label: t("tabs.log"),      icon: <ClipboardList size={15} /> },
    { id: "monthly",  label: t("tabs.monthly"),  icon: <BarChart3 size={15} /> },
    { id: "reports",  label: t("tabs.reports"),  icon: <BarChart3 size={15} /> },
    { id: "settings", label: t("tabs.settings"), icon: <Settings size={15} /> },
  ] as const;

  const MONTHS = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleDateString("ar-IQ-u-nu-latn", { month: "long" }),
  }));

  const filteredReportData = reportTeacherFilter === "all" ? reportData : reportData.filter((r) => r.teacher_id === reportTeacherFilter);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ProtectedRoute permission="view_teacher_attendance">
      <div className="flex min-h-screen bg-[var(--surface-soft)]" dir="rtl">
        <AppSidebar currentPath={pathname} />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title={t("title")}
            subtitle={t("subtitle")}
            scope={schoolScope}
            fixed
          />

          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-5">
              <SchoolScopeBanner scope={schoolScope} />

              {schoolScope.shouldBlockContent ? (
                <SchoolScopeEmptyState scope={schoolScope} />
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
                        <p className="text-white/60 text-xs font-medium mb-2 tracking-widest uppercase">{t("heroBadge")}</p>
                        <h1 className="text-2xl md:text-3xl font-black text-white mb-1.5 leading-tight">{t("title")}</h1>
                        <p className="text-white/70 text-sm">{t("subtitle")}</p>
                      </div>
                      <div className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                        <GraduationCap size={38} className="text-white" />
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
                    {statsCards.map((s, i) => {
                      const Icon = s.icon;
                      return (
                        <motion.div
                          key={s.label}
                          initial={{ opacity: 0, scale: 0.94 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.06, duration: 0.25 }}
                          className="group relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 overflow-hidden hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200 cursor-default"
                        >
                          <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                            style={{ background: `radial-gradient(ellipse at top right, color-mix(in srgb, ${s.color} 8%, transparent), transparent 70%)` }}
                          />
                          <div className="relative z-10">
                            <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `color-mix(in srgb, ${s.color} 12%, transparent)` }}>
                              <Icon size={18} style={{ color: s.color }} />
                            </div>
                            <div className="text-3xl font-black mb-1 tabular-nums" style={{ color: s.color }}>
                              <AnimatedNumber value={s.value} />
                            </div>
                            <p className="text-xs font-bold text-[var(--text-muted)]">{s.label}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>

                  {/* ── Tab Bar ─────────────────────────────────────────── */}
                  <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-1.5 flex gap-1">
                    {TABS.map((tab) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            "relative flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors duration-150 z-10",
                            isActive
                              ? "text-white"
                              : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-soft)]",
                          )}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="attendance-tab-pill"
                              className="absolute inset-0 rounded-xl bg-[var(--primary)]"
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-2">
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* ── Global feedback ─────────────────────────────────── */}
                  <AnimatePresence>
                    {dailySuccess && (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, y: -10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.25 }}
                        className="rounded-2xl border border-[var(--success)]/20 bg-[var(--success)]/10 p-4 text-[var(--success)] font-bold text-sm flex items-center gap-2"
                      >
                        <CheckCircle2 size={16} /> {dailySuccess}
                      </motion.div>
                    )}
                    {dailyError && (
                      <motion.div
                        key="error"
                        initial={{ opacity: 0, y: -10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.25 }}
                        className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 p-4 text-[var(--danger)] font-bold text-sm"
                      >
                        {dailyError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ══════════════════════════════════════════════════════ */}
                  {/* DAILY TAB                                              */}
                  {/* ══════════════════════════════════════════════════════ */}
                  {activeTab === "daily" && (
                    <div className="space-y-4">
                      {/* Controls bar */}
                      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] p-4 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-[var(--text-muted)] whitespace-nowrap">{t("daily.date")}</label>
                          <DatePicker value={date || undefined} onChange={(v) => setDate(v ?? "")} />
                        </div>

                        <div className="flex items-center gap-0.5 bg-[var(--surface-soft)] rounded-xl p-0.5 border border-[var(--border)]">
                          <button
                            onClick={() => setViewMode("detailed")}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all",
                              viewMode === "detailed"
                                ? "bg-[var(--card-bg)] text-[var(--primary)] shadow-sm font-medium"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                            )}
                          >
                            <ClipboardList size={13} /> {t("daily.viewDetailed")}
                          </button>
                          <button
                            onClick={() => setViewMode("quick")}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all",
                              viewMode === "quick"
                                ? "bg-[var(--card-bg)] text-[var(--primary)] shadow-sm font-medium"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                            )}
                          >
                            <LayoutGrid size={13} /> {t("daily.viewQuick")}
                          </button>
                        </div>

                        <button
                          onClick={copyYesterday}
                          disabled={loading}
                          className="flex items-center gap-1.5 h-10 px-3 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)] bg-[var(--surface-soft)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
                        >
                          <Copy size={13} /> {t("daily.copyYesterday")}
                        </button>

                        <div className="flex-1" />

                        <button
                          onClick={printDailyAttendance}
                          disabled={teachers.length === 0}
                          className="flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:opacity-90 transition-opacity shadow-sm disabled:opacity-40"
                        >
                          <Printer size={13} /> طباعة
                        </button>

                        <button
                          onClick={exportDailyExcel}
                          disabled={teachers.length === 0}
                          className="flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-semibold text-white bg-[var(--success)] hover:opacity-90 transition-opacity shadow-sm disabled:opacity-40"
                        >
                          <FileSpreadsheet size={13} /> Excel
                        </button>

                        <button
                          onClick={saveAllRecords}
                          disabled={saving || loading || teachers.length === 0}
                          className="flex items-center gap-2 h-10 px-5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
                        >
                          <Save size={14} />
                          {saving ? t("daily.saving") : t("daily.saveAll")}
                        </button>
                      </div>

                      {/* Table / Quick view */}
                      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] overflow-hidden">
                        {loading ? (
                          <Skeleton rows={teachers.length || 5} />
                        ) : teachers.length === 0 ? (
                          <div className="py-16 text-center text-[var(--text-muted)] text-sm">
                            {t("daily.noTeachers")}
                          </div>
                        ) : viewMode === "detailed" ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] w-10">#</th>
                                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)]">{t("daily.colTeacher")}</th>
                                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)]">{t("daily.colSubject")}</th>
                                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)]">{t("daily.colStatus")}</th>
                                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)]">{t("daily.colCheckIn")}</th>
                                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)]">{t("daily.colCheckOut")}</th>
                                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)]">{t("daily.colNotes")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {teachers.map((teacher, idx) => {
                                  const rec = records[teacher.id];
                                  if (!rec) return null;
                                  const sv = STATUS_VARS[rec.status];
                                  return (
                                    <tr
                                      key={teacher.id}
                                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-soft)] transition-colors"
                                    >
                                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{idx + 1}</td>
                                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{teacher.full_name}</td>
                                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{teacher.subject ?? "—"}</td>
                                      <td className="px-4 py-3">
                                        <select
                                          value={rec.status}
                                          onChange={(e) => updateRecord(teacher.id, { status: e.target.value as AttendanceStatus })}
                                          className={cn("h-8 rounded-lg border px-2 text-xs font-semibold outline-none transition cursor-pointer", sv.bg, sv.text, "border-current/20 focus:ring-2 focus:ring-current/20")}
                                        >
                                          {ALL_STATUSES.map((s) => (
                                            <option key={s} value={s}>{STATUS_EMOJIS[s]} {t(`status.${s}`)}</option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="px-4 py-3">
                                        <TimePicker
                                          value={rec.check_in_time ?? ""}
                                          onChange={(v) => updateRecord(teacher.id, { check_in_time: v || null })}
                                          className="w-32"
                                        />
                                      </td>
                                      <td className="px-4 py-3">
                                        <TimePicker
                                          value={rec.check_out_time ?? ""}
                                          onChange={(v) => updateRecord(teacher.id, { check_out_time: v || null })}
                                          className="w-32"
                                        />
                                      </td>
                                      <td className="px-4 py-3">
                                        <input
                                          type="text"
                                          value={rec.notes ?? ""}
                                          onChange={(e) => updateRecord(teacher.id, { notes: e.target.value || null })}
                                          placeholder={t("daily.notesPlaceholder")}
                                          className={cn(INPUT_CLS, "w-36 h-8 text-xs")}
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {teachers.map((teacher) => {
                              const rec = records[teacher.id];
                              if (!rec) return null;
                              return (
                                <div
                                  key={teacher.id}
                                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 space-y-2.5 hover:shadow-sm transition-shadow"
                                >
                                  <div>
                                    <div className="font-semibold text-[var(--text-primary)] text-sm">{teacher.full_name}</div>
                                    {teacher.subject && <div className="text-xs text-[var(--text-muted)] mt-0.5">{teacher.subject}</div>}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {ALL_STATUSES.map((s) => {
                                      const sv = STATUS_VARS[s];
                                      const isActive = rec.status === s;
                                      return (
                                        <button
                                          key={s}
                                          onClick={() => updateRecord(teacher.id, { status: s })}
                                          className={cn(
                                            "px-2 py-0.5 rounded-full text-xs font-medium border transition-all",
                                            isActive
                                              ? cn(sv.bg, sv.text, "border-current/30 ring-1 ring-current/20")
                                              : "bg-transparent text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--primary)]/40",
                                          )}
                                        >
                                          {STATUS_EMOJIS[s]} {t(`status.${s}`)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ══════════════════════════════════════════════════════ */}
                  {/* MONTHLY TAB                                            */}
                  {/* ══════════════════════════════════════════════════════ */}
                  {activeTab === "monthly" && (
                    <div className="space-y-4">
                      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] p-4 flex flex-wrap items-center gap-3">
                        <label className="text-sm font-medium text-[var(--text-muted)]">{t("monthly.month")}</label>
                        <select value={monthlyMonth} onChange={(e) => setMonthlyMonth(Number(e.target.value))} className={cn(SELECT_CLS, "w-36")}>
                          {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <input type="number" value={monthlyYear} onChange={(e) => setMonthlyYear(Number(e.target.value))} min={2020} max={2099} className={cn(INPUT_CLS, "w-24")} />
                        <button
                          onClick={() => fetchMonthlySummary(monthlyYear, monthlyMonth)}
                          disabled={summaryLoading}
                          className="h-10 px-5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                          {summaryLoading ? t("monthly.loading") : t("monthly.show")}
                        </button>

                        <div className="flex-1" />

                        <button
                          onClick={printMonthlySummary}
                          disabled={summaryData.length === 0}
                          className="flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:opacity-90 transition-opacity shadow-sm disabled:opacity-40"
                        >
                          <Printer size={13} /> طباعة
                        </button>

                        <button
                          onClick={exportMonthlyExcel}
                          disabled={summaryData.length === 0}
                          className="flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-semibold text-white bg-[var(--success)] hover:opacity-90 transition-opacity shadow-sm disabled:opacity-40"
                        >
                          <FileSpreadsheet size={13} /> Excel
                        </button>
                      </div>

                      {summaryError && <AlertBox variant="error">{summaryError}</AlertBox>}

                      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] overflow-hidden">
                        {summaryLoading ? (
                          <Skeleton />
                        ) : summaryData.length === 0 ? (
                          <div className="py-16 text-center text-[var(--text-muted)] text-sm">{t("monthly.noData")}</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)]">{t("monthly.colTeacher")}</th>
                                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)]">{t("monthly.colSubject")}</th>
                                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--success)]">{t("monthly.colPresent")}</th>
                                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--danger)]">{t("monthly.colAbsent")}</th>
                                  <th className="px-4 py-3 text-center text-xs font-semibold text-amber-600">{t("monthly.colLate")}</th>
                                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--primary)]">{t("monthly.colExcused")}</th>
                                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)]">{t("monthly.colTotal")}</th>
                                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)]">{t("monthly.colAttendanceRate")}</th>
                                  <th className="px-4 py-3 w-8" />
                                </tr>
                              </thead>
                              <tbody>
                                {summaryData.map((row) => (
                                  <>
                                    <tr
                                      key={row.teacher_id}
                                      onClick={() => setExpandedTeacher(expandedTeacher === row.teacher_id ? null : row.teacher_id)}
                                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-soft)] cursor-pointer transition-colors"
                                    >
                                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{row.name}</td>
                                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{row.subject ?? "—"}</td>
                                      <td className="px-4 py-3 text-center font-bold text-[var(--success)]">{row.present}</td>
                                      <td className="px-4 py-3 text-center font-bold text-[var(--danger)]">{row.absent}</td>
                                      <td className="px-4 py-3 text-center font-bold text-amber-600">{row.late}</td>
                                      <td className="px-4 py-3 text-center font-bold text-[var(--primary)]">{row.excused}</td>
                                      <td className="px-4 py-3 text-center text-[var(--text-muted)]">{row.total_days}</td>
                                      <td className="px-4 py-3 text-center">
                                        <PctBadge present={row.present} total={row.total_days} />
                                      </td>
                                      <td className="px-4 py-3 text-[var(--text-muted)]">
                                        {expandedTeacher === row.teacher_id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                      </td>
                                    </tr>
                                    {expandedTeacher === row.teacher_id && (
                                      <tr key={`${row.teacher_id}-exp`}>
                                        <td colSpan={9} className="px-4 py-3 bg-[var(--surface-soft)]">
                                          <div className="flex flex-wrap gap-2">
                                            {(["present","absent","late","excused","holiday"] as AttendanceStatus[]).map((s) => (
                                              <div key={s} className="flex items-center gap-1.5">
                                                <StatusBadge status={s} label={STATUS_LABELS[s]} />
                                                <span className="text-xs text-[var(--text-muted)]">
                                                  {row[s as keyof TeacherSummary] as number} {t("monthly.dayUnit")}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ══════════════════════════════════════════════════════ */}
                  {/* REPORTS TAB                                            */}
                  {/* ══════════════════════════════════════════════════════ */}
                  {activeTab === "reports" && (
                    <div className="space-y-4">
                      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] p-4 flex flex-wrap items-center gap-3">
                        <label className="text-sm font-medium text-[var(--text-muted)]">{t("reports.from")}</label>
                        <select value={reportFromMonth} onChange={(e) => setReportFromMonth(Number(e.target.value))} className={cn(SELECT_CLS, "w-32")}>
                          {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <input type="number" value={reportFromYear} onChange={(e) => setReportFromYear(Number(e.target.value))} min={2020} max={2099} className={cn(INPUT_CLS, "w-24")} />
                        <label className="text-sm font-medium text-[var(--text-muted)]">{t("reports.to")}</label>
                        <select value={reportToMonth} onChange={(e) => setReportToMonth(Number(e.target.value))} className={cn(SELECT_CLS, "w-32")}>
                          {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <input type="number" value={reportToYear} onChange={(e) => setReportToYear(Number(e.target.value))} min={2020} max={2099} className={cn(INPUT_CLS, "w-24")} />
                        <select value={reportTeacherFilter} onChange={(e) => setReportTeacherFilter(e.target.value)} className={cn(SELECT_CLS, "w-44")}>
                          <option value="all">جميع الأساتذة</option>
                          {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                        </select>
                        <button
                          onClick={fetchReport}
                          disabled={reportLoading}
                          className="h-10 px-5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                          {reportLoading ? t("reports.loading") : t("reports.generate")}
                        </button>

                        <div className="flex-1" />

                        <button
                          onClick={printReportData}
                          disabled={reportData.length === 0}
                          className="flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:opacity-90 transition-opacity shadow-sm disabled:opacity-40"
                        >
                          <Printer size={13} /> طباعة
                        </button>

                        <button
                          onClick={exportReportExcel}
                          disabled={reportData.length === 0}
                          className="flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-semibold text-white bg-[var(--success)] hover:opacity-90 transition-opacity shadow-sm disabled:opacity-40"
                        >
                          <FileSpreadsheet size={13} /> Excel
                        </button>
                      </div>

                      {reportError && <AlertBox variant="error">{reportError}</AlertBox>}

                      {filteredReportData.length > 0 && (
                        <>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                              { label: t("reports.cardTotalDays"), value: String(filteredReportData.reduce((s, row) => s + row.total_days, 0)), color: "text-[var(--text-primary)]" },
                              {
                                label: t("reports.cardAvgRate"),
                                value: filteredReportData.length > 0
                                  ? `${Math.round((filteredReportData.reduce((s, row) => s + (row.total_days > 0 ? row.present / row.total_days : 0), 0) / filteredReportData.length) * 100)}%`
                                  : "—",
                                color: "text-[var(--success)]",
                              },
                              { label: t("reports.cardMostAbsent"), value: [...filteredReportData].sort((a, b) => b.absent - a.absent)[0]?.name ?? "—", color: "text-[var(--danger)]" },
                              { label: t("reports.cardMostLate"), value: [...filteredReportData].sort((a, b) => b.late - a.late)[0]?.name ?? "—", color: "text-amber-600" },
                            ].map((card) => (
                              <div key={card.label} className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] p-4">
                                <div className="text-xs text-[var(--text-muted)] mb-1">{card.label}</div>
                                <div className={cn("text-xl font-bold truncate", card.color)}>{card.value}</div>
                              </div>
                            ))}
                          </div>

                          <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] overflow-hidden">
                            <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-soft)]">
                              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t("reports.tableTitle")}</h3>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-[var(--border)]">
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] w-10">{t("reports.colRank")}</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)]">{t("reports.colTeacher")}</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)]">{t("reports.colSubject")}</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--success)]">{t("reports.colPresent")}</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--danger)]">{t("reports.colAbsent")}</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-amber-600">{t("reports.colLate")}</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)]">{t("reports.colRate")}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredReportData.map((t, idx) => (
                                    <tr key={t.teacher_id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-soft)] transition-colors">
                                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{idx + 1}</td>
                                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{t.name}</td>
                                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{t.subject ?? "—"}</td>
                                      <td className="px-4 py-3 text-center font-bold text-[var(--success)]">{t.present}</td>
                                      <td className="px-4 py-3 text-center font-bold text-[var(--danger)]">{t.absent}</td>
                                      <td className="px-4 py-3 text-center font-bold text-amber-600">{t.late}</td>
                                      <td className="px-4 py-3 text-center">
                                        <PctBadge present={t.present} total={t.total_days} />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Daily Details Table */}
                      {reportTeacherFilter !== "all" && reportDetails.length > 0 && (
                        <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] overflow-hidden">
                          <div className="px-6 py-4 border-b border-[var(--border)]">
                            <h3 className="text-sm font-bold text-[var(--text-primary)]">سجل الحضور اليومي</h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-[var(--border)]">
                                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] w-10">#</th>
                                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)]">التاريخ</th>
                                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)]">اليوم</th>
                                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)]">الحالة</th>
                                </tr>
                              </thead>
                              <tbody>
                                {reportDetails.map((d, idx) => {
                                  const dateObj = new Date(d.date + "T00:00:00");
                                  const dayName = dateObj.toLocaleDateString("ar-IQ", { weekday: "long" });
                                  const statusMap: Record<string, { label: string; color: string }> = {
                                    present: { label: "حاضر", color: "text-[var(--success)] bg-[color-mix(in_srgb,var(--success)_12%,transparent)]" },
                                    absent: { label: "غائب", color: "text-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]" },
                                    late: { label: "متأخر", color: "text-amber-600 bg-amber-50" },
                                    excused: { label: "إجازة", color: "text-blue-600 bg-blue-50" },
                                    holiday: { label: "عطلة", color: "text-[var(--text-muted)] bg-[var(--surface-soft)]" },
                                  };
                                  const st = statusMap[d.status] ?? { label: d.status, color: "text-[var(--text-muted)]" };
                                  return (
                                    <tr key={d.date} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-soft)] transition-colors">
                                      <td className="px-4 py-2.5 text-[var(--text-muted)] text-xs">{idx + 1}</td>
                                      <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">{d.date}</td>
                                      <td className="px-4 py-2.5 text-[var(--text-secondary)] text-xs">{dayName}</td>
                                      <td className="px-4 py-2.5 text-center">
                                        <span className={cn("px-3 py-1 rounded-full text-xs font-bold", st.color)}>{st.label}</span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {!reportLoading && filteredReportData.length === 0 && !reportError && (
                        <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] py-16 text-center text-[var(--text-muted)] text-sm">
                          {t("reports.prompt")}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ══════════════════════════════════════════════════════ */}
                  {/* SETTINGS TAB                                           */}
                  {/* ══════════════════════════════════════════════════════ */}
                  {activeTab === "settings" && (
                    <div className="max-w-2xl space-y-4">
                      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] p-6 space-y-6">
                        <h2 className="text-base font-bold text-[var(--text-primary)]">{t("settings.title")}</h2>

                        {settingsError   && <AlertBox variant="error">{settingsError}</AlertBox>}
                        {settingsSuccess && <AlertBox variant="success">{settingsSuccess}</AlertBox>}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-[var(--text-muted)]">{t("settings.workStartTime")}</label>
                            <TimePicker value={settings.work_start_time} onChange={(v) => setSettings((s) => ({ ...s, work_start_time: v }))} className="w-full" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-[var(--text-muted)]">{t("settings.workEndTime")}</label>
                            <TimePicker value={settings.work_end_time} onChange={(v) => setSettings((s) => ({ ...s, work_end_time: v }))} className="w-full" />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-[var(--text-muted)]">{t("settings.lateThreshold")}</label>
                          <input type="number" value={settings.late_threshold_minutes} onChange={(e) => setSettings((s) => ({ ...s, late_threshold_minutes: Number(e.target.value) }))} min={1} max={120} className={cn(INPUT_CLS, "w-28")} />
                          <p className="text-xs text-[var(--text-muted)]">{t("settings.lateThresholdHint")}</p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-[var(--text-muted)]">{t("settings.workDays")}</label>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(WORK_DAY_LABELS).map(([day, label]) => {
                              const checked = settings.work_days.includes(day);
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => setSettings((s) => ({ ...s, work_days: checked ? s.work_days.filter((d) => d !== day) : [...s.work_days, day] }))}
                                  className={cn(
                                    "px-3 py-1.5 rounded-xl border text-sm font-medium transition-all",
                                    checked
                                      ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
                                      : "bg-[var(--surface-soft)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--primary)]/50 hover:text-[var(--primary)]",
                                  )}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-4 pt-2 border-t border-[var(--border)]">
                          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t("settings.deductionRules")}</h3>

                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-[var(--text-muted)]">{t("settings.absentDeduction")}</label>
                            <div className="flex items-center gap-3">
                              <select value={settings.absent_deduction_type} onChange={(e) => setSettings((s) => ({ ...s, absent_deduction_type: e.target.value as AttendanceSettings["absent_deduction_type"] }))} className={cn(SELECT_CLS, "w-44")}>
                                <option value="none">{t("settings.deductionNone")}</option>
                                <option value="fixed">{t("settings.deductionFixed")}</option>
                                <option value="daily_rate">{t("settings.deductionDailyRate")}</option>
                              </select>
                              {settings.absent_deduction_type !== "none" && (
                                <input type="number" value={settings.absent_deduction_amount ?? ""} onChange={(e) => setSettings((s) => ({ ...s, absent_deduction_amount: e.target.value ? Number(e.target.value) : null }))} placeholder={t("settings.amountPlaceholder")} min={0} className={cn(INPUT_CLS, "w-32")} />
                              )}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-[var(--text-muted)]">{t("settings.lateDeduction")}</label>
                            <div className="flex items-center gap-3">
                              <select value={settings.late_deduction_type} onChange={(e) => setSettings((s) => ({ ...s, late_deduction_type: e.target.value as AttendanceSettings["late_deduction_type"] }))} className={cn(SELECT_CLS, "w-44")}>
                                <option value="none">{t("settings.deductionNone")}</option>
                                <option value="fixed">{t("settings.deductionFixed")}</option>
                                <option value="per_minute">{t("settings.deductionPerMinute")}</option>
                              </select>
                              {settings.late_deduction_type !== "none" && (
                                <input type="number" value={settings.late_deduction_amount ?? ""} onChange={(e) => setSettings((s) => ({ ...s, late_deduction_amount: e.target.value ? Number(e.target.value) : null }))} placeholder={t("settings.amountPlaceholder")} min={0} className={cn(INPUT_CLS, "w-32")} />
                              )}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-[var(--text-muted)]">{t("settings.maxLateDays")}</label>
                            <input type="number" value={settings.max_late_days_before_absent} onChange={(e) => setSettings((s) => ({ ...s, max_late_days_before_absent: Number(e.target.value) }))} min={1} max={30} className={cn(INPUT_CLS, "w-24")} />
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            onClick={saveSettings}
                            disabled={settingsSaving || settingsLoading}
                            className="flex items-center gap-2 h-10 px-6 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
                          >
                            <Save size={14} />
                            {settingsSaving ? t("settings.saving") : t("settings.saveSettings")}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ══════════════════════════════════════════════════════ */}
                  {/* LOG TAB — Daily Lectures (linked to salaries)          */}
                  {/* ══════════════════════════════════════════════════════ */}
                  {activeTab === "log" && (
                    <div className="space-y-4">
                      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">{t("log.title")}</h3>
                          <p className="text-sm text-[var(--text-muted)]">{t("log.subtitle")}</p>
                        </div>
                        <button
                          onClick={() => setShowDailyLog(true)}
                          className="flex items-center gap-2 h-10 px-5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap"
                        >
                          <ClipboardList size={14} /> {t("log.registerButton")}
                        </button>
                      </div>

                      <DailyLogModal
                        show={showDailyLog}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        teachers={teachers as any}
                        classes={(() => {
                          const sel = teachers.find((t) => t.id === dailyLogTeacher);
                          if (!sel?.classes_taught?.length) return logClasses;
                          return logClasses.filter((c) =>
                            sel.classes_taught!.some((ct) => ct.grade === c.grade && ct.section === c.section),
                          );
                        })()}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        lecturePrices={logLecturePrices as any}
                        dailyTeacher={dailyLogTeacher}
                        dailyDate={dailyLogDate}
                        dailyGrades={dailyLogGrades}
                        dailyPeriods={dailyLogPeriods}
                        saving={savingDailyLog}
                        onClose={() => setShowDailyLog(false)}
                        onTeacherChange={setDailyLogTeacher}
                        onDateChange={setDailyLogDate}
                        onGradesChange={setDailyLogGrades}
                        onPeriodsChange={setDailyLogPeriods}
                        onSave={() => { void saveDailyLectures(); }}
                      />

                      {/* ── Today's lectures table ─────────────────────── */}
                      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] overflow-hidden">
                        <div className="px-5 py-4 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-[var(--text-primary)] text-sm">{t("log.todayLectures")}</span>
                            {todayLectures.length > 0 && (
                              <span className="px-2.5 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold">
                                {todayLectures.length} {t("log.lectureUnit")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <DatePicker value={lecturesDate || undefined} onChange={(v) => { setLecturesDate(v ?? ""); void fetchTodayLectures(v ?? ""); }} />
                            <button
                              onClick={() => void fetchTodayLectures(lecturesDate)}
                              disabled={lecturesLoading}
                              className="h-10 px-3 rounded-xl border border-[var(--border)] text-xs text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
                            >
                              {lecturesLoading ? "..." : t("log.refresh")}
                            </button>
                          </div>
                        </div>

                        {lecturesLoading ? (
                          <Skeleton rows={4} />
                        ) : todayLectures.length === 0 ? (
                          <div className="py-16 flex flex-col items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-[var(--surface-soft)] flex items-center justify-center">
                              <ClipboardList size={24} className="text-[var(--text-muted)]" />
                            </div>
                            <p className="text-[var(--text-muted)] text-sm font-medium">{t("log.noLectures")}</p>
                          </div>
                        ) : (
                          <div className="p-4 space-y-3">
                            {Object.values(
                              todayLectures.reduce<Record<string, { teacher_id: string; teacher_name: string; lectures: TodayLecture[] }>>(
                                (acc, l) => {
                                  if (!acc[l.teacher_id]) acc[l.teacher_id] = { teacher_id: l.teacher_id, teacher_name: l.teacher_name, lectures: [] };
                                  acc[l.teacher_id].lectures.push(l);
                                  return acc;
                                },
                                {},
                              ),
                            ).map((group, gIdx) => {
                              const COLORS = ["var(--primary)", "var(--success)", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];
                              const color = COLORS[gIdx % COLORS.length];
                              const classCounts = group.lectures.reduce<Record<string, number>>((acc, l) => {
                                const key = `${l.grade} / ${l.section}`;
                                acc[key] = (acc[key] ?? 0) + 1;
                                return acc;
                              }, {});

                              return (
                                <div key={group.teacher_id} className="rounded-2xl border border-[var(--border)] overflow-hidden" style={{ borderInlineStartWidth: "3px", borderInlineStartColor: color }}>
                                  {/* Teacher header */}
                                  <div className="px-4 py-3 bg-[var(--surface-soft)] flex flex-wrap items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0" style={{ background: color }}>
                                      {group.teacher_name.charAt(0)}
                                    </div>
                                    <span className="font-bold text-[var(--text-primary)] text-sm">{group.teacher_name}</span>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
                                      {group.lectures.length} {t("log.lectureUnit")}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 ms-auto">
                                      {Object.entries(classCounts).map(([cls, cnt]) => (
                                        <span key={cls} className="px-2.5 py-0.5 rounded-full bg-[var(--card-bg)] border border-[var(--border)] text-xs text-[var(--text-secondary)] font-medium">
                                          {cls} · {cnt}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  {/* Lecture rows */}
                                  <div className="divide-y divide-[var(--border)]">
                                    {group.lectures.map((lec, idx) => (
                                      <div key={lec.id} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[var(--surface-soft)] transition-colors">
                                        <span className="w-5 h-5 rounded-md bg-[var(--surface-soft)] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)] flex-shrink-0 border border-[var(--border)]">
                                          {idx + 1}
                                        </span>
                                        <span className="text-sm font-semibold text-[var(--text-primary)] min-w-[4.5rem]">{lec.grade}</span>
                                        <span className="text-xs text-[var(--text-muted)]">{t("log.sectionLabel")} <span className="font-semibold text-[var(--text-primary)]">{lec.section}</span></span>
                                        <span className="px-2 py-0.5 rounded-lg bg-[var(--surface-soft)] border border-[var(--border)] text-xs text-[var(--text-muted)] font-medium">
                                          {t("log.periodLabel", { period: lec.period })}
                                        </span>
                                        {lec.session_type && (
                                          <span className="px-2 py-0.5 rounded-lg text-xs font-semibold" style={{
                                            background: lec.session_type === "morning" ? "color-mix(in srgb, #f59e0b 15%, transparent)" : "color-mix(in srgb, #8b5cf6 15%, transparent)",
                                            color: lec.session_type === "morning" ? "#b45309" : "#7c3aed",
                                          }}>
                                            {lec.session_type === "morning" ? t("log.sessionMorning") : lec.session_type === "evening" ? t("log.sessionEvening") : lec.session_type}
                                          </span>
                                        )}
                                        <div className="flex-1" />
                                        <button
                                          onClick={() => void deleteLecture(lec.id)}
                                          disabled={deletingLectureId === lec.id}
                                          className="h-7 px-3 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50"
                                          style={{
                                            background: "color-mix(in srgb, var(--danger) 8%, transparent)",
                                            borderColor: "color-mix(in srgb, var(--danger) 25%, transparent)",
                                            color: "var(--danger)",
                                          }}
                                        >
                                          {deletingLectureId === lec.id ? "..." : t("log.delete")}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
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
