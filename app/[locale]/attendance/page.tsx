"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { formatNumber } from "@/lib/formatting";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { useRuntimeBranding } from "@/hooks/brand";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import { cn } from "@/lib/brand/brand-utils";
import { CalendarDays, Search, Filter, Save, RotateCcw, Download, AlertTriangle, Lock, LockOpen, TrendingUp, BarChart3 } from "@/lib/icons";
import { StudentAttendanceInsight } from "@/app/[locale]/attendance/_components/StudentAttendanceInsight";

type AttendanceStatus = "present" | "absent" | "late" | "excused";
type AttendanceStatusFilter = AttendanceStatus | "all" | "unrecorded";
type AttendanceStatusValue = AttendanceStatus | "";

type Student = {
  id: string;
  full_name: string;
  class_name: string;
  section: string | null;
  status: string;
  school_id?: string | null;
  branch_id?: string | null;
};

type AttendanceDraft = {
  id?: string;
  status: AttendanceStatusValue;
  note: string;
  touched: boolean;
  updated_at?: string | null;
};

type AttendanceRow = {
  id: string;
  student_id: string;
  status: string;
  note: string | null;
  updated_at: string | null;
};

type _AttendanceHistoryRow = {
  attendance_date: string;
  status: string;
};

type _AttendanceStatusCounts = {
  present: number;
  absent: number;
  late: number;
  excused: number;
};

type HistorySummary = {
  date: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  rate: number;
};

type RepeatedAbsenceStudent = {
  id: string;
  full_name: string;
  class_name: string;
  section: string | null;
  absent_count: number;
  absent_dates: string[];
};

type AttendanceSnapshotResponse = {
  ok?: boolean;
  students?: Student[];
  records?: AttendanceRow[];
  history?: HistorySummary[];
  error?: { message?: string };
};

type AttendanceSaveResponse = {
  ok?: boolean;
  savedCount?: number;
  error?: { message?: string };
};

type AttendanceCopy = {
  topbarTitle: string;
  topbarSubtitle: string;
  heroTitle: string;
  heroDescription: string;
  activeDate: string;
  saveChanges: (count: number) => string;
  saving: string;
  dbTableMissing: string;
  loadStudentsFailed: string;
  loadAttendanceFailedPrefix: string;
  reloadSuccess: string;
  noChanges: string;
  saveFailedPrefix: string;
  saveSuccess: (count: number) => string;
  emptyStateTitle: string;
  emptyStateDescription: string;
  filtersTitle: string;
  refreshData: string;
  day: string;
  className: string;
  section: string;
  status: string;
  search: string;
  allClasses: string;
  allSections: string;
  allStatuses: string;
  unrecorded: string;
  searchPlaceholder: string;
  bulkAssign: string;
  assignAll: string;
  stats: {
    total: string;
    present: string;
    absent: string;
    late: string;
    excused: string;
    rate: string;
  };
  studentsList: string;
  studentCount: (count: number) => string;
  syncing: string;
  noResults: string;
  studentName: string;
  classSection: string;
  chooseStatus: string;
  note: string;
  updatedAt: string;
  addNote: string;
  historyTitle: string;
  historyDescription: string;
  date: string;
  statusLabels: Record<AttendanceStatus, string>;
};

const ATTENDANCE_COPY: Record<"ar" | "en", AttendanceCopy> = {
  ar: {
    topbarTitle: "إدارة الحضور",
    topbarSubtitle: "سجل الحضور اليومي للطلاب ومتابعة الالتزام",
    heroTitle: "سجل الحضور اليومي",
    heroDescription: "وثّق حضور الطلاب، راجع الإحصائيات الفورية، وتابع تاريخ الالتزام بدقة عالية.",
    activeDate: "التاريخ النشط",
    saveChanges: (count) => `حفظ التغييرات (${count})`,
    saving: "جارٍ الحفظ...",
    dbTableMissing: "جدول سجلات الحضور غير متاح في قاعدة البيانات حالياً.",
    loadStudentsFailed: "تعذر تحميل قائمة الطلاب.",
    loadAttendanceFailedPrefix: "تعذر تحميل سجلات الحضور:",
    reloadSuccess: "تمت إعادة تحميل بيانات اليوم الحالي.",
    noChanges: "لا توجد تغييرات جديدة للحفظ.",
    saveFailedPrefix: "تعذر حفظ الحضور:",
    saveSuccess: (count) => `تم حفظ ${count} سجل حضور بنجاح ✓`,
    emptyStateTitle: "بيانات الحضور",
    emptyStateDescription: "لن يتم تحميل سجلات الحضور أو حفظها قبل اختيار مدرسة صريحة لهذه الصفحة.",
    filtersTitle: "الفلاتر والتصفية",
    refreshData: "إعادة تحميل البيانات",
    day: "اليوم",
    className: "الصف الدراسي",
    section: "الشعبة",
    status: "الحالة",
    search: "بحث سريع",
    allClasses: "كل الصفوف",
    allSections: "كل الشعب",
    allStatuses: "كل الحالات",
    unrecorded: "غير مسجل",
    searchPlaceholder: "اسم الطالب...",
    bulkAssign: "تعيين جماعي:",
    assignAll: "تعيين الكل",
    stats: {
      total: "المعروض",
      present: "حاضر",
      absent: "غائب",
      late: "متأخر",
      excused: "بعذر",
      rate: "النسبة",
    },
    studentsList: "قائمة الطلاب",
    studentCount: (count) => `${formatNumber(count)} طالب`,
    syncing: "جارٍ مزامنة السجلات...",
    noResults: "لا توجد نتائج مطابقة للفلاتر.",
    studentName: "اسم الطالب",
    classSection: "الصف/الشعبة",
    chooseStatus: "تحديد الحالة",
    note: "ملاحظة",
    updatedAt: "التحديث",
    addNote: "إضافة ملاحظة...",
    historyTitle: "ملخص آخر 14 يوماً",
    historyDescription: "راقب تطور نسبة الحضور اليومي للمدرسة",
    date: "التاريخ",
    statusLabels: {
      present: "حاضر",
      absent: "غائب",
      late: "متأخر",
      excused: "بعذر",
    },
  },
  en: {
    topbarTitle: "Attendance Management",
    topbarSubtitle: "Daily attendance records and student punctuality tracking",
    heroTitle: "Daily Attendance",
    heroDescription: "Record attendance, review live metrics, and track recent compliance trends in one place.",
    activeDate: "Active date",
    saveChanges: (count) => `Save changes (${count})`,
    saving: "Saving...",
    dbTableMissing: "The attendance records table is not available in the database right now.",
    loadStudentsFailed: "Failed to load the students list.",
    loadAttendanceFailedPrefix: "Failed to load attendance records:",
    reloadSuccess: "Today's attendance data was reloaded.",
    noChanges: "There are no new changes to save.",
    saveFailedPrefix: "Failed to save attendance:",
    saveSuccess: (count) => `${count} attendance records were saved successfully ✓`,
    emptyStateTitle: "Attendance data",
    emptyStateDescription: "Attendance records will not load or save until a school is explicitly selected for this page.",
    filtersTitle: "Filters and segmentation",
    refreshData: "Reload data",
    day: "Day",
    className: "Class",
    section: "Section",
    status: "Status",
    search: "Quick search",
    allClasses: "All classes",
    allSections: "All sections",
    allStatuses: "All statuses",
    unrecorded: "Unrecorded",
    searchPlaceholder: "Student name...",
    bulkAssign: "Bulk set:",
    assignAll: "Set all",
    stats: {
      total: "Visible",
      present: "Present",
      absent: "Absent",
      late: "Late",
      excused: "Excused",
      rate: "Rate",
    },
    studentsList: "Students list",
    studentCount: (count) => `${formatNumber(count)} students`,
    syncing: "Syncing attendance records...",
    noResults: "No students match the current filters.",
    studentName: "Student",
    classSection: "Class / section",
    chooseStatus: "Attendance status",
    note: "Note",
    updatedAt: "Updated",
    addNote: "Add a note...",
    historyTitle: "Last 14 days summary",
    historyDescription: "Track the school's daily attendance trend over the last two weeks.",
    date: "Date",
    statusLabels: {
      present: "Present",
      absent: "Absent",
      late: "Late",
      excused: "Excused",
    },
  },
};

function buildStatusMeta(copy: AttendanceCopy) {
  return {
    present: { label: copy.statusLabels.present, bg: "bg-emerald-50 dark:bg-emerald-900/20", color: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-800/50" },
    absent: { label: copy.statusLabels.absent, bg: "bg-rose-50 dark:bg-rose-900/20", color: "text-rose-700 dark:text-rose-400", border: "border-rose-100 dark:border-rose-800/50" },
    late: { label: copy.statusLabels.late, bg: "bg-amber-50 dark:bg-amber-900/20", color: "text-amber-700 dark:text-amber-400", border: "border-amber-100 dark:border-amber-800/50" },
    excused: { label: copy.statusLabels.excused, bg: "bg-blue-50 dark:bg-blue-900/20", color: "text-blue-700 dark:text-blue-400", border: "border-blue-100 dark:border-blue-800/50" },
  } satisfies Record<AttendanceStatus, { label: string; bg: string; color: string; border: string }>;
}

function getLocalIsoDate(date: Date) {
  const shift = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - shift).toISOString().slice(0, 10);
}

function isAttendanceStatus(value: string): value is AttendanceStatus {
  return value === "present" || value === "absent" || value === "late" || value === "excused";
}

function mapAttendanceDbError(message: string, copy: AttendanceCopy, locale: "ar" | "en" = "ar") {
  if (message.includes('relation "attendance_records" does not exist')) {
    return copy.dbTableMissing;
  }
  // Map common database errors to localized messages
  if (message.includes("unique_violation") || message.includes("duplicate key")) {
    return locale === "ar"
      ? "تم تسجيل هذا الطالب مسبقاً لهذا التاريخ."
      : "This student has already been recorded for this date.";
  }
  if (message.includes("foreign_key_violation")) {
    return locale === "ar"
      ? "لا يمكن العثور على الطالب المطلوب."
      : "The requested student could not be found.";
  }
  if (message.includes("check_violation")) {
    return locale === "ar"
      ? "البيانات المدخلة غير صحيحة."
      : "The provided data is invalid.";
  }
  // Fallback: return raw message as-is (likely from API error response)
  return message;
}

export default function AttendancePage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) === "en" ? "en" : "ar";
  const copy = ATTENDANCE_COPY[locale];
  const statusMeta = useMemo(() => buildStatusMeta(copy), [copy]);
  const { profile } = useRole();
  const runtimeBranding = useRuntimeBranding();
  const schoolScope = useSchoolScope(profile);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceDrafts, setAttendanceDrafts] = useState<Record<string, AttendanceDraft>>({});
  const [historyRows, setHistoryRows] = useState<HistorySummary[]>([]);

  const [selectedDate, setSelectedDate] = useState(getLocalIsoDate(new Date()));
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterStatus, setFilterStatus] = useState<AttendanceStatusFilter>("all");

  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Repeated absences
  const [repeatedAbsences, setRepeatedAbsences] = useState<RepeatedAbsenceStudent[]>([]);
  const [loadingRepeated, setLoadingRepeated] = useState(false);
  const [absenceThreshold, setAbsenceThreshold] = useState(3);

  // Lock past days
  const [lockOverride, setLockOverride] = useState(false);
  const isAdmin = profile?.role === "super_admin" || profile?.role === "admin";
  const todayIso = getLocalIsoDate(new Date());
  const isLocked = selectedDate < todayIso && !lockOverride;

  const resolvedSchoolIdForInsights = useMemo(() => {
    return schoolScope.selectedSchoolId ?? profile?.school_id ?? null;
  }, [profile?.school_id, schoolScope.selectedSchoolId]);

  const fetchAttendanceSnapshot = useCallback(async (dateValue: string) => {
    setLoadingStudents(true);
    setLoadingAttendance(true);
    setError("");
    const scopedSchoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!scopedSchoolId) {
      setStudents([]);
      setAttendanceDrafts({});
      setHistoryRows([]);
      setLoadingStudents(false);
      setLoadingAttendance(false);
      return;
    }

    const params = new URLSearchParams({
      schoolId: scopedSchoolId,
      date: dateValue,
    });
    if (runtimeBranding.branchId) {
      params.set("branchId", runtimeBranding.branchId);
    }

    const { response, payload } = await fetchJsonWithAuthorizedSession<AttendanceSnapshotResponse>(
      `/api/web/attendance?${params.toString()}`,
    );

    if (!response.ok || !payload?.ok) {
      const message = payload?.error?.message || copy.loadStudentsFailed;
      setError(`${copy.loadAttendanceFailedPrefix} ${mapAttendanceDbError(message, copy, locale)}`);
      setStudents([]);
      setAttendanceDrafts({});
      setHistoryRows([]);
      setLoadingStudents(false);
      setLoadingAttendance(false);
      return;
    }

    const nextStudents = payload.students ?? [];
    const nextRows = payload.records ?? [];
    const byStudent: Record<string, AttendanceRow> = {};
    nextRows.forEach((row) => {
      byStudent[row.student_id] = row;
    });

    const nextDrafts: Record<string, AttendanceDraft> = {};
    nextStudents.forEach((student) => {
      const row = byStudent[student.id];
      if (row && isAttendanceStatus(row.status)) {
        nextDrafts[student.id] = {
          id: row.id,
          status: row.status,
          note: row.note || "",
          touched: false,
          updated_at: row.updated_at || null,
        };
      } else {
        nextDrafts[student.id] = { status: "", note: "", touched: false };
      }
    });

    setStudents(nextStudents);
    setAttendanceDrafts(nextDrafts);
    setHistoryRows(payload.history ?? []);
    setLoadingStudents(false);
    setLoadingAttendance(false);
  }, [profile, schoolScope.selectedSchoolId, copy, runtimeBranding.branchId, locale]);

  useEffect(() => {
    if (schoolScope.scopeLoading) return;
    if (schoolScope.shouldBlockContent) {
      setStudents([]);
      setAttendanceDrafts({});
      setHistoryRows([]);
      return;
    }
    void fetchAttendanceSnapshot(selectedDate);
  }, [fetchAttendanceSnapshot, schoolScope.scopeLoading, schoolScope.shouldBlockContent, selectedDate]);

  useEffect(() => {
    if (schoolScope.scopeLoading || schoolScope.shouldBlockContent) {
      setAttendanceDrafts({});
      setHistoryRows([]);
      setStudents([]);
      return;
    }
  }, [schoolScope.scopeLoading, schoolScope.shouldBlockContent]);

  function setRowStatus(studentId: string, status: AttendanceStatus) {
    setAttendanceDrafts((prev) => {
      const current = prev[studentId] || { status: "", note: "", touched: false };
      return { ...prev, [studentId]: { ...current, status, touched: true } };
    });
  }

  function setRowNote(studentId: string, note: string) {
    setAttendanceDrafts((prev) => {
      const current = prev[studentId] || { status: "", note: "", touched: false };
      return { ...prev, [studentId]: { ...current, note, touched: true } };
    });
  }

  function applyStatusToFiltered(status: AttendanceStatus) {
    setAttendanceDrafts((prev) => {
      const next = { ...prev };
      filteredStudents.forEach((student) => {
        const current = next[student.id] || { status: "", note: "", touched: false };
        next[student.id] = { ...current, status, touched: true };
      });
      return next;
    });
  }

  function resetUnsavedChanges() {
    void fetchAttendanceSnapshot(selectedDate);
    setSuccess(copy.reloadSuccess);
    setTimeout(() => setSuccess(""), 2500);
  }

  const fetchRepeatedAbsences = useCallback(async (threshold: number) => {
    const scopedSchoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!scopedSchoolId) return;
    setLoadingRepeated(true);
    const params = new URLSearchParams({ schoolId: scopedSchoolId, threshold: String(threshold) });
    if (runtimeBranding.branchId) params.set("branchId", runtimeBranding.branchId);
    const { payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; students: RepeatedAbsenceStudent[] }>(
      `/api/web/attendance/repeated-absences?${params.toString()}`,
    );
    setRepeatedAbsences(payload?.students ?? []);
    setLoadingRepeated(false);
  }, [profile, schoolScope.selectedSchoolId, runtimeBranding.branchId]);

  useEffect(() => {
    if (schoolScope.scopeLoading || schoolScope.shouldBlockContent) return;
    void fetchRepeatedAbsences(absenceThreshold);
  }, [fetchRepeatedAbsences, absenceThreshold, schoolScope.scopeLoading, schoolScope.shouldBlockContent]);

  async function saveAttendance() {
    setSaving(true);
    setError("");

    const changedEntries = Object.entries(attendanceDrafts).filter(([, draft]) => draft.touched && draft.status);

    if (!changedEntries.length) {
      setError(copy.noChanges);
      setSaving(false);
      return;
    }

    const payload = changedEntries.map(([studentId, draft]) => {
      return {
        student_id: studentId,
        status: draft.status,
        note: draft.note.trim() || null,
      };
    });

    const scopedSchoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!scopedSchoolId) {
      setError(copy.loadStudentsFailed);
      setSaving(false);
      return;
    }

    const saveBody: Record<string, any> = {
      school_id: scopedSchoolId,
      attendance_date: selectedDate,
      entries: payload,
    };
    if (runtimeBranding.branchId) {
      saveBody.branch_id = runtimeBranding.branchId;
    }

    const { response, payload: result } = await fetchJsonWithAuthorizedSession<AttendanceSaveResponse>(
      "/api/web/attendance",
      {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify(saveBody),
      },
    );

    if (!response.ok || !result?.ok) {
      const message = result?.error?.message || copy.saveFailedPrefix;
      setError(`${copy.saveFailedPrefix} ${mapAttendanceDbError(message, copy, locale)}`);
      setSaving(false);
      return;
    }

    setSuccess(copy.saveSuccess(payload.length));
    setTimeout(() => setSuccess(""), 3000);
    await fetchAttendanceSnapshot(selectedDate);
    setSaving(false);
  }

  const classes = useMemo(() => Array.from(new Set(students.map((s) => s.class_name).filter(Boolean))) as string[], [students]);
  const sections = useMemo(() => {
    const source = filterClass ? students.filter((s) => s.class_name === filterClass) : students;
    return Array.from(new Set(source.map((s) => s.section).filter(Boolean))) as string[];
  }, [students, filterClass]);

  const { filteredStudents, stats } = useMemo(() => {
    const filtered = students.filter((student) => {
      const draft = attendanceDrafts[student.id];
      const status = draft?.status || "";
      const matchSearch = student.full_name?.includes(search) || student.class_name?.includes(search) || (student.section || "").includes(search);
      const matchClass = filterClass ? student.class_name === filterClass : true;
      const matchSection = filterSection ? (student.section || "") === filterSection : true;
      const matchStatus = filterStatus === "all" ? true : filterStatus === "unrecorded" ? !status : status === filterStatus;
      return matchSearch && matchClass && matchSection && matchStatus;
    });

    const count = { present: 0, absent: 0, late: 0, excused: 0, unrecorded: 0 };
    filtered.forEach((student) => {
      const status = attendanceDrafts[student.id]?.status || "";
      if (!status) {
        count.unrecorded += 1;
        return;
      }
      if (status in count) count[status as AttendanceStatus] += 1;
    });
    const total = filtered.length;
    const attendanceRate = total ? Math.round(((count.present + count.late) / total) * 100) : 0;

    return { filteredStudents: filtered, stats: { ...count, total, attendanceRate } };
  }, [students, attendanceDrafts, search, filterClass, filterSection, filterStatus]);

  const changedCount = useMemo(() => Object.values(attendanceDrafts).filter((draft) => draft.touched && draft.status).length, [attendanceDrafts]);

  // Class breakdown stats
  const classStats = useMemo(() => {
    const map = new Map<string, { present: number; absent: number; late: number; excused: number; total: number }>();
    for (const student of students) {
      const cls = student.class_name || "—";
      const draft = attendanceDrafts[student.id];
      const status = draft?.status || "";
      if (!map.has(cls)) map.set(cls, { present: 0, absent: 0, late: 0, excused: 0, total: 0 });
      const entry = map.get(cls)!;
      entry.total++;
      if (status === "present") entry.present++;
      else if (status === "absent") entry.absent++;
      else if (status === "late") entry.late++;
      else if (status === "excused") entry.excused++;
    }
    return Array.from(map.entries())
      .map(([cls, c]) => ({ class_name: cls, ...c, rate: c.total ? Math.round(((c.present + c.late) / c.total) * 100) : 0 }))
      .sort((a, b) => a.rate - b.rate);
  }, [students, attendanceDrafts]);

  // Weekly comparison from 30-day history
  const weeklyComparison = useMemo(() => {
    const now = new Date();
    const dow = now.getDay(); // 0=Sun
    const weekStartDate = new Date(now.getTime() - dow * 86400000);
    const weekStartStr = getLocalIsoDate(weekStartDate);
    const lastWeekStartStr = getLocalIsoDate(new Date(weekStartDate.getTime() - 7 * 86400000));

    const thisWeek = { present: 0, late: 0, total: 0 };
    const lastWeek = { present: 0, late: 0, total: 0 };

    for (const row of historyRows) {
      if (row.date >= weekStartStr) {
        thisWeek.present += row.present; thisWeek.late += row.late; thisWeek.total += row.total;
      } else if (row.date >= lastWeekStartStr) {
        lastWeek.present += row.present; lastWeek.late += row.late; lastWeek.total += row.total;
      }
    }
    const thisRate = thisWeek.total ? Math.round(((thisWeek.present + thisWeek.late) / thisWeek.total) * 100) : 0;
    const lastRate = lastWeek.total ? Math.round(((lastWeek.present + lastWeek.late) / lastWeek.total) * 100) : 0;
    return { thisRate, lastRate, diff: thisRate - lastRate };
  }, [historyRows]);

  // Export current day CSV
  function exportDailyCsv() {
    const statusLabelMap: Record<string, string> = { present: "حاضر", absent: "غائب", late: "متأخر", excused: "بعذر" };
    const header = "الاسم,الصف,الشعبة,الحالة,الملاحظة";
    const rows = filteredStudents.map((s) => {
      const d = attendanceDrafts[s.id];
      const vals = [s.full_name, s.class_name, s.section ?? "", statusLabelMap[d?.status || ""] ?? "—", d?.note || ""];
      return vals.map((v) => (v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v)).join(",");
    });
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `حضور_${selectedDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const heroDateLabel = useMemo(
    () =>
      new Date(`${selectedDate}T00:00:00`).toLocaleDateString(locale === "en" ? "en-US" : "ar-IQ", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [locale, selectedDate],
  );

  const controlClasses = "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 w-full";

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
      <div className="flex min-h-screen bg-[var(--surface-muted)]">
        <AppSidebar currentPath="/attendance" />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar 
            title={copy.topbarTitle}
            subtitle={copy.topbarSubtitle}
            scope={schoolScope} 
            fixed 
          />

          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
              {/* Header Card */}
              <section className="rounded-[40px] border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                  <div className="space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Attendance Center</div>
                    <h1 className="text-3xl font-black text-[var(--text-primary)]">{copy.heroTitle}</h1>
                    <p className="text-sm text-[var(--text-muted)] max-w-2xl leading-relaxed">
                      {copy.heroDescription}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:w-auto">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-5 py-4 flex flex-col justify-center">
                      <div className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">{copy.activeDate}</div>
                      <div className="text-sm font-black text-[var(--text-primary)] mt-1">{heroDateLabel}</div>
                    </div>
                    <div className="flex gap-2">
                      {isLocked && isAdmin && (
                        <button
                          className="h-full px-4 py-4 rounded-2xl font-black border border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--warning)] text-xs flex flex-col items-center justify-center gap-1 transition hover:bg-[var(--warning)]/20"
                          onClick={() => setLockOverride(true)}
                          title="فتح التعديل"
                        >
                          <LockOpen size={18} />
                          <span>فتح</span>
                        </button>
                      )}
                      {lockOverride && (
                        <button
                          className="h-full px-4 py-4 rounded-2xl font-black border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)] text-xs flex flex-col items-center justify-center gap-1 transition hover:bg-[var(--border)]"
                          onClick={() => setLockOverride(false)}
                          title="إعادة القفل"
                        >
                          <Lock size={18} />
                          <span>قفل</span>
                        </button>
                      )}
                      <button
                        className={cn(
                          "h-full px-6 py-4 rounded-2xl font-black transition-all shadow-lg flex flex-col items-center justify-center gap-1 md:min-w-[180px] border",
                          isLocked
                            ? "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)] cursor-not-allowed opacity-50"
                            : changedCount > 0
                              ? "bg-[var(--primary)] text-white border-transparent shadow-[0_16px_30px_color-mix(in_srgb,var(--primary)_24%,transparent)] hover:-translate-y-0.5 active:translate-y-0"
                              : "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)] cursor-not-allowed opacity-60"
                        )}
                        onClick={saveAttendance}
                        disabled={saving || changedCount === 0 || isLocked}
                      >
                        <Save size={20} />
                        <span className="text-sm">{saving ? copy.saving : copy.saveChanges(changedCount)}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {success && (
                <div className="rounded-2xl border border-[var(--success)]/20 bg-[var(--success)]/10 p-4 text-[var(--success)] font-bold">
                  {success}
                </div>
              )}
              {error && (
                <div className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 p-4 text-[var(--danger)] font-bold">
                  {error}
                </div>
              )}

              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {schoolScope.shouldBlockContent ? (
                <div className="rounded-[40px] border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]">
                  <SchoolScopeEmptyState
                    scope={schoolScope}
                    title={copy.emptyStateTitle}
                    description={copy.emptyStateDescription}
                  />
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Filters & Bulk Actions */}
                  <section className="rounded-[40px] border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]">
                    <div className="flex flex-col gap-8">
                      <div className="flex items-center justify-between border-b border-[var(--border)] pb-6">
                        <div className="flex items-center gap-2">
                          <Filter size={18} className="text-[var(--primary)]" />
                          <h2 className="text-lg font-black text-[var(--text-primary)]">{copy.filtersTitle}</h2>
                        </div>
                        <button className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-black text-[var(--danger)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--surface-muted)]" onClick={resetUnsavedChanges}>
                          <RotateCcw size={14} />
                          {copy.refreshData}
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                        <div className="space-y-1.5 lg:col-span-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{copy.day}</label>
                          <div className="relative">
                            <CalendarDays size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                            <input type="date" className={cn(controlClasses, "ps-10")} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{copy.className}</label>
                          <select className={controlClasses} value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setFilterSection(""); }}>
                            <option value="">{copy.allClasses}</option>
                            {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{copy.section}</label>
                          <select className={controlClasses} value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
                            <option value="">{copy.allSections}</option>
                            {sections.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{copy.status}</label>
                          <select className={controlClasses} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as AttendanceStatusFilter)}>
                            <option value="all">{copy.allStatuses}</option>
                            <option value="present">{copy.statusLabels.present}</option>
                            <option value="absent">{copy.statusLabels.absent}</option>
                            <option value="late">{copy.statusLabels.late}</option>
                            <option value="excused">{copy.statusLabels.excused}</option>
                            <option value="unrecorded">{copy.unrecorded}</option>
                          </select>
                        </div>
                        <div className="space-y-1.5 lg:col-span-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{copy.search}</label>
                          <div className="relative">
                            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input placeholder={copy.searchPlaceholder} className={cn(controlClasses, "ps-10")} value={search} onChange={(e) => setSearch(e.target.value)} />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
                        <span className="text-[10px] font-black uppercase text-[var(--text-muted)] self-center me-2">{copy.bulkAssign}</span>
                        {(["present", "absent", "late", "excused"] as AttendanceStatus[]).map((status) => (
                          <button
                            key={status}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[11px] font-black border shadow-sm transition-all hover:-translate-y-0.5",
                              statusMeta[status].bg, statusMeta[status].color, statusMeta[status].border
                            )}
                            onClick={() => applyStatusToFiltered(status)}
                          >
                            {copy.assignAll} {statusMeta[status].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* Stats Row */}
                  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-6">
                    {[
                      { label: copy.stats.total, value: formatNumber(stats.total), color: "text-[var(--text-primary)]" },
                      { label: copy.stats.present, value: formatNumber(stats.present), color: "text-[var(--success)]" },
                      { label: copy.stats.absent, value: formatNumber(stats.absent), color: "text-[var(--danger)]" },
                      { label: copy.stats.late, value: formatNumber(stats.late), color: "text-[var(--warning)]" },
                      { label: copy.stats.excused, value: formatNumber(stats.excused), color: "text-[var(--info)]" },
                      { label: copy.stats.rate, value: `${stats.attendanceRate}%`, color: "text-[var(--primary)]" },
                    ].map((card, i) => (
                      <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-[var(--card-shadow)]">
                        <div className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">{card.label}</div>
                        <div className={cn("text-xl font-black mt-1", card.color)}>{card.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Class Breakdown Stats */}
                  {classStats.length > 1 && (
                    <section className="rounded-[40px] border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]">
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-5">
                          <BarChart3 size={18} className="text-[var(--primary)]" />
                          <h2 className="text-lg font-black text-[var(--text-primary)]">نسبة الحضور حسب الصف</h2>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {classStats.map((cls) => (
                            <div key={cls.class_name} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-black text-[var(--text-primary)] truncate">{cls.class_name}</span>
                                <span className={cn("text-sm font-black", cls.rate >= 80 ? "text-[var(--success)]" : cls.rate >= 60 ? "text-[var(--warning)]" : "text-[var(--danger)]")}>{cls.rate}%</span>
                              </div>
                              <div className="w-full bg-[var(--border)] rounded-full h-2 overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full transition-all", cls.rate >= 80 ? "bg-[var(--success)]" : cls.rate >= 60 ? "bg-[var(--warning)]" : "bg-[var(--danger)]")}
                                  style={{ width: `${cls.rate}%` }}
                                />
                              </div>
                              <div className="flex gap-3 text-[10px] font-bold text-[var(--text-muted)]">
                                <span className="text-[var(--success)]">↑{cls.present}</span>
                                <span className="text-[var(--danger)]">↓{cls.absent}</span>
                                <span className="text-[var(--warning)]">~{cls.late}</span>
                                <span className="ms-auto opacity-60">{cls.total} طالب</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Main Attendance Grid */}
                  <section className="rounded-[40px] border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]">
                    <div className="space-y-8">
                      {/* Lock Banner */}
                      {isLocked && (
                        <div className="flex items-center gap-3 rounded-2xl border border-[var(--warning)]/30 bg-[var(--warning)]/8 px-5 py-4">
                          <Lock size={16} className="text-[var(--warning)] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-[var(--warning)]">يوم مقفل — للمراجعة فقط</p>
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">سجلات {selectedDate} لا يمكن تعديلها بعد انتهاء اليوم.</p>
                          </div>
                          {isAdmin && (
                            <button onClick={() => setLockOverride(true)} className="shrink-0 px-3 py-1.5 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--warning)] text-xs font-black transition hover:bg-[var(--warning)]/20">
                              فتح التعديل
                            </button>
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between border-b border-[var(--border)] pb-6">
                        <h2 className="text-xl font-black text-[var(--text-primary)]">{copy.studentsList}</h2>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={exportDailyCsv}
                            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-black text-[var(--text-secondary)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--surface-muted)]"
                          >
                            <Download size={13} /> تصدير CSV
                          </button>
                          <div className="px-3 py-1 rounded-full bg-[var(--surface-muted)] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                            {copy.studentCount(filteredStudents.length)}
                          </div>
                        </div>
                      </div>

                      {loadingStudents || loadingAttendance ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                          <div className="h-12 w-12 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
                          <span className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">{copy.syncing}</span>
                        </div>
                      ) : filteredStudents.length === 0 ? (
                        <div className="py-20 text-center text-[var(--text-muted)] font-bold border-2 border-dashed border-[var(--border)] rounded-3xl">
                          {copy.noResults}
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                          <table className="w-full text-start border-collapse">
                            <thead>
                              <tr className="bg-[var(--surface-muted)] text-start">
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{copy.studentName}</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{copy.classSection}</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{copy.chooseStatus}</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{copy.note}</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{copy.updatedAt}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                              {filteredStudents.map((student) => {
                                const draft = attendanceDrafts[student.id] || { status: "", note: "", touched: false };
                                return (
                                  <tr key={student.id} className="hover:bg-[var(--surface-muted)]/50 transition-colors">
                                    <td className="p-4">
                                      <div className="font-black text-[var(--text-primary)]">{student.full_name}</div>
                                    </td>
                                    <td className="p-4">
                                      <div className="flex gap-1.5">
                                        <span className="text-xs font-bold text-[var(--text-secondary)]">{student.class_name}</span>
                                        {student.section && <span className="text-xs font-bold text-[var(--text-muted)]">· {student.section}</span>}
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <div className="flex flex-wrap gap-2 sm:min-w-[260px]">
                                        {(["present", "absent", "late", "excused"] as AttendanceStatus[]).map((status) => {
                                          const isActive = draft.status === status;
                                          return (
                                            <button
                                              key={status}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-[11px] font-black border shadow-sm transition-all",
                                                isLocked
                                                  ? isActive
                                                    ? `${statusMeta[status].bg} ${statusMeta[status].color} ${statusMeta[status].border} opacity-60`
                                                    : "bg-[var(--surface-strong)] border-[var(--border)] text-[var(--text-muted)] opacity-30 cursor-not-allowed"
                                                  : isActive
                                                    ? `${statusMeta[status].bg} ${statusMeta[status].color} ${statusMeta[status].border} shadow-[0_10px_22px_color-mix(in_srgb,var(--primary)_15%,transparent)] scale-[1.03]`
                                                    : "bg-[var(--surface-strong)] border-[var(--border)] text-[var(--text-muted)] grayscale opacity-70 hover:grayscale-0 hover:opacity-100 hover:-translate-y-0.5"
                                              )}
                                              onClick={() => !isLocked && setRowStatus(student.id, status)}
                                              disabled={isLocked}
                                            >
                                              {statusMeta[status].label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <input
                                        className={cn(controlClasses, "h-9 text-xs py-1", isLocked && "opacity-50 cursor-not-allowed")}
                                        placeholder={copy.addNote}
                                        value={draft.note}
                                        onChange={(e) => !isLocked && setRowNote(student.id, e.target.value)}
                                        readOnly={isLocked}
                                      />
                                    </td>
                                    <td className="p-4 text-[10px] font-bold text-[var(--text-muted)] whitespace-nowrap">
                                      {draft.updated_at ? new Date(draft.updated_at).toLocaleTimeString(locale === "en" ? "en-US" : "ar-IQ", { hour: "2-digit", minute: "2-digit" }) : "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Repeated Absences Report */}
                  <section className="rounded-[40px] border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]">
                    <div className="space-y-6">
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] pb-6">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={18} className="text-[var(--danger)]" />
                          <div>
                            <h2 className="text-lg font-black text-[var(--text-primary)]">تقرير الغياب المتكرر</h2>
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">آخر 30 يوماً — طلاب تجاوزوا حد الغياب</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black text-[var(--text-muted)]">الحد الأدنى:</span>
                          {[2, 3, 5, 7, 10].map((n) => (
                            <button
                              key={n}
                              onClick={() => setAbsenceThreshold(n)}
                              className={cn(
                                "h-8 w-8 rounded-lg text-xs font-black border transition",
                                absenceThreshold === n
                                  ? "bg-[var(--danger)] text-white border-transparent"
                                  : "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--border)]"
                              )}
                            >
                              {n}
                            </button>
                          ))}
                          <button
                            onClick={() => void fetchRepeatedAbsences(absenceThreshold)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-black text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
                          >
                            <RotateCcw size={12} /> تحديث
                          </button>
                        </div>
                      </div>

                      {loadingRepeated ? (
                        <div className="flex justify-center py-10">
                          <div className="h-8 w-8 border-4 border-[var(--danger)]/20 border-t-[var(--danger)] rounded-full animate-spin" />
                        </div>
                      ) : repeatedAbsences.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-12 text-center">
                          <TrendingUp size={32} className="text-[var(--success)] opacity-40" />
                          <p className="text-sm font-black text-[var(--text-muted)]">لا يوجد طلاب تجاوزوا {absenceThreshold} أيام غياب في آخر 30 يوم</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                          <table className="w-full text-start border-collapse">
                            <thead>
                              <tr className="bg-[var(--surface-muted)]">
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">الطالب</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">الصف / الشعبة</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">عدد الغيابات</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">آخر 3 أيام</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                              {repeatedAbsences.map((s) => (
                                <tr key={s.id} className="hover:bg-[var(--surface-muted)]/50 transition-colors">
                                  <td className="p-4 font-black text-[var(--text-primary)] text-sm">{s.full_name}</td>
                                  <td className="p-4 text-xs font-bold text-[var(--text-secondary)]">
                                    {s.class_name}{s.section ? ` · ${s.section}` : ""}
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className={cn(
                                      "inline-flex h-7 min-w-7 items-center justify-center rounded-full text-xs font-black px-2",
                                      s.absent_count >= 7 ? "bg-[var(--danger)] text-white" : s.absent_count >= 5 ? "bg-[var(--warning)]/20 text-[var(--warning)]" : "bg-[var(--danger)]/10 text-[var(--danger)]"
                                    )}>
                                      {s.absent_count}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex flex-wrap gap-1">
                                      {s.absent_dates.slice(-3).map((d) => (
                                        <span key={d} className="text-[10px] font-bold bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg px-2 py-0.5 text-[var(--text-muted)]">{d}</span>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </section>

                  <StudentAttendanceInsight
                    schoolId={resolvedSchoolIdForInsights}
                    className={filterClass}
                    section={filterSection}
                  />

                  {/* History Section */}
                  {historyRows.length > 0 && (
                    <section className="rounded-[40px] border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]">
                      <div className="space-y-8">
                        <div className="flex flex-col gap-1 border-b border-[var(--border)] pb-6">
                          <h2 className="text-xl font-black text-[var(--text-primary)]">آخر 30 يوماً</h2>
                          <p className="text-sm text-[var(--text-muted)]">{copy.historyDescription}</p>
                        </div>

                        {/* Weekly Comparison */}
                        <div className="grid gap-4 sm:grid-cols-3">
                          {[
                            { label: "هذا الأسبوع", rate: weeklyComparison.thisRate, color: weeklyComparison.diff >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]" },
                            { label: "الأسبوع الماضي", rate: weeklyComparison.lastRate, color: "text-[var(--text-primary)]" },
                            {
                              label: "الفرق",
                              rate: Math.abs(weeklyComparison.diff),
                              suffix: weeklyComparison.diff > 0 ? "↑" : weeklyComparison.diff < 0 ? "↓" : "—",
                              color: weeklyComparison.diff > 0 ? "text-[var(--success)]" : weeklyComparison.diff < 0 ? "text-[var(--danger)]" : "text-[var(--text-muted)]",
                            },
                          ].map((card) => (
                            <div key={card.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-5 flex flex-col gap-1">
                              <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">{card.label}</div>
                              <div className={cn("text-2xl font-black", card.color)}>
                                {"suffix" in card ? card.suffix !== "—" ? `${card.suffix} ${card.rate}%` : "—" : `${card.rate}%`}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                          <table className="w-full text-start border-collapse">
                            <thead>
                              <tr className="bg-[var(--surface-muted)] text-start">
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{copy.date}</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">{copy.stats.present}</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">{copy.stats.absent}</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">{copy.stats.late}</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">{copy.stats.excused}</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">{copy.stats.rate}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)] text-center">
                              {historyRows.map((row) => (
                                <tr key={row.date} className="hover:bg-[var(--surface-muted)]/50 transition-colors">
                                  <td className="p-4 text-start text-xs font-black text-[var(--text-primary)]">{row.date}</td>
                                  <td className="p-4 text-[var(--success)] font-bold text-xs">{formatNumber(row.present)}</td>
                                  <td className="p-4 text-[var(--danger)] font-bold text-xs">{formatNumber(row.absent)}</td>
                                  <td className="p-4 text-[var(--warning)] font-bold text-xs">{formatNumber(row.late)}</td>
                                  <td className="p-4 text-[var(--info)] font-bold text-xs">{formatNumber(row.excused)}</td>
                                  <td className="p-4">
                                    <div className="flex flex-col items-center gap-1.5">
                                      <div className="w-24 bg-[var(--surface-muted)] rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-[var(--primary)] h-full rounded-full transition-all" style={{ width: `${row.rate}%` }} />
                                      </div>
                                      <span className="text-[10px] font-black text-[var(--text-primary)]">{row.rate}%</span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
