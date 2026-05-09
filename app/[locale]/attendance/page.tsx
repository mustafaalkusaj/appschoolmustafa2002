"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { CalendarDays, Search, Filter, Save, RotateCcw, Download, AlertTriangle, Lock, LockOpen, TrendingUp, BarChart3, ChevronLeft, ChevronRight } from "@/lib/icons";
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
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

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

  function clearSuccessAfter(ms: number) {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setSuccess(""), ms);
  }

  function resetUnsavedChanges() {
    void fetchAttendanceSnapshot(selectedDate);
    setSuccess(copy.reloadSuccess);
    clearSuccessAfter(2500);
  }

  const fetchRepeatedAbsences = useCallback(async (threshold: number) => {
    const scopedSchoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!scopedSchoolId) return;
    setLoadingRepeated(true);
    try {
      const params = new URLSearchParams({ schoolId: scopedSchoolId, threshold: String(threshold) });
      if (runtimeBranding.branchId) params.set("branchId", runtimeBranding.branchId);
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; students: RepeatedAbsenceStudent[] }>(
        `/api/web/attendance/repeated-absences?${params.toString()}`,
      );
      if (!response.ok) {
        setRepeatedAbsences([]);
        return;
      }
      setRepeatedAbsences(payload?.students ?? []);
    } catch {
      setRepeatedAbsences([]);
    } finally {
      setLoadingRepeated(false);
    }
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
    clearSuccessAfter(3000);
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

  function goPrevDay() {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() - 1);
    setSelectedDate(getLocalIsoDate(d));
    setLockOverride(false);
  }
  function goNextDay() {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() + 1);
    const next = getLocalIsoDate(d);
    if (next <= todayIso) { setSelectedDate(next); setLockOverride(false); }
  }
  const isToday = selectedDate === todayIso;
  const statusRowMeta: Record<AttendanceStatus, { border: string; rowBg: string }> = {
    present: { border: "border-s-[3px] border-s-emerald-500", rowBg: "bg-emerald-50/40 dark:bg-emerald-900/10" },
    absent:  { border: "border-s-[3px] border-s-rose-500",    rowBg: "bg-rose-50/40 dark:bg-rose-900/10" },
    late:    { border: "border-s-[3px] border-s-amber-500",   rowBg: "bg-amber-50/40 dark:bg-amber-900/10" },
    excused: { border: "border-s-[3px] border-s-blue-400",    rowBg: "bg-blue-50/40 dark:bg-blue-900/10" },
  };

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
            <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

              {/* ── Command Bar ─────────────────────────────────────────────── */}
              <section className="rounded-[28px] border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] overflow-hidden">
                {/* Top row: date nav + title + save */}
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  {/* Date navigation */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={goPrevDay}
                      className="h-10 w-10 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-secondary)] transition hover:bg-[var(--border)] hover:text-[var(--text-primary)] shrink-0"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <div className="relative">
                      <CalendarDays size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                      <input
                        type="date"
                        className="h-10 ps-9 pe-3 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] text-sm font-black text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
                        value={selectedDate}
                        onChange={(e) => { setSelectedDate(e.target.value); setLockOverride(false); }}
                      />
                    </div>
                    <button
                      onClick={goNextDay}
                      disabled={isToday}
                      className="h-10 w-10 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-secondary)] transition hover:bg-[var(--border)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {isToday ? (
                      <span className="hidden sm:flex h-7 items-center rounded-full bg-[var(--primary)]/10 px-3 text-[11px] font-black text-[var(--primary)]">اليوم</span>
                    ) : (
                      <button
                        onClick={() => { setSelectedDate(todayIso); setLockOverride(false); }}
                        className="hidden sm:flex h-7 items-center rounded-full border border-[var(--border)] px-3 text-[11px] font-black text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)]"
                      >
                        اليوم
                      </button>
                    )}
                  </div>

                  {/* Date label */}
                  <div className="hidden lg:block text-center">
                    <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">{copy.activeDate}</p>
                    <p className="text-base font-black text-[var(--text-primary)]">{heroDateLabel}</p>
                  </div>

                  {/* Save area */}
                  <div className="flex items-center gap-2">
                    {isLocked && isAdmin && (
                      <button
                        onClick={() => setLockOverride(true)}
                        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-[var(--warning)]/40 bg-[var(--warning)]/8 text-[var(--warning)] text-xs font-black transition hover:bg-[var(--warning)]/15"
                      >
                        <LockOpen size={14} /> فتح التعديل
                      </button>
                    )}
                    {lockOverride && (
                      <button
                        onClick={() => setLockOverride(false)}
                        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)] text-xs font-black transition hover:bg-[var(--border)]"
                      >
                        <Lock size={14} /> قفل
                      </button>
                    )}
                    <button
                      onClick={resetUnsavedChanges}
                      className="h-10 w-10 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-muted)] transition hover:text-[var(--danger)] hover:bg-[var(--danger)]/8 shrink-0"
                      title={copy.refreshData}
                    >
                      <RotateCcw size={15} />
                    </button>
                    <button
                      onClick={saveAttendance}
                      disabled={saving || changedCount === 0 || isLocked}
                      className={cn(
                        "inline-flex items-center gap-2 h-10 px-5 rounded-xl font-black text-sm transition-all",
                        isLocked
                          ? "bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)] opacity-50 cursor-not-allowed"
                          : changedCount > 0
                            ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/25 hover:scale-[1.02] active:scale-95"
                            : "bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)] cursor-not-allowed opacity-60"
                      )}
                    >
                      <Save size={16} />
                      {saving ? copy.saving : copy.saveChanges(changedCount)}
                    </button>
                  </div>
                </div>

                {/* Stats strip */}
                {!schoolScope.shouldBlockContent && (
                  <div className="border-t border-[var(--border)] grid grid-cols-3 sm:grid-cols-6 divide-x divide-x-reverse divide-[var(--border)]">
                    {[
                      { label: copy.stats.total,   value: stats.total,   color: "text-[var(--text-primary)]", bg: "" },
                      { label: copy.stats.present, value: stats.present, color: "text-emerald-600 dark:text-emerald-400", bg: "" },
                      { label: copy.stats.absent,  value: stats.absent,  color: "text-rose-600 dark:text-rose-400", bg: "" },
                      { label: copy.stats.late,    value: stats.late,    color: "text-amber-600 dark:text-amber-400", bg: "" },
                      { label: copy.stats.excused, value: stats.excused, color: "text-blue-600 dark:text-blue-400", bg: "" },
                      { label: copy.stats.rate,    value: `${stats.attendanceRate}%`, color: "text-[var(--primary)]", bg: "" },
                    ].map((s, i) => (
                      <div key={i} className="flex flex-col items-center justify-center py-3 px-2">
                        <div className={cn("text-xl font-black tabular-nums", s.color)}>{typeof s.value === "number" ? formatNumber(s.value) : s.value}</div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {success && (
                <div className="rounded-2xl border border-[var(--success)]/20 bg-[var(--success)]/10 p-4 text-[var(--success)] font-bold text-sm">
                  {success}
                </div>
              )}
              {error && (
                <div className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 p-4 text-[var(--danger)] font-bold text-sm">
                  {error}
                </div>
              )}

              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {schoolScope.shouldBlockContent ? (
                <div className="rounded-[28px] border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]">
                  <SchoolScopeEmptyState scope={schoolScope} title={copy.emptyStateTitle} description={copy.emptyStateDescription} />
                </div>
              ) : (
                <div className="space-y-6">

                  {/* ── Filters ─────────────────────────────────────────────── */}
                  <section className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]">
                    <div className="flex flex-wrap items-end gap-3">
                      {/* Class */}
                      <div className="space-y-1 min-w-[130px] flex-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">{copy.className}</label>
                        <select className={controlClasses} value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setFilterSection(""); }}>
                          <option value="">{copy.allClasses}</option>
                          {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      {/* Section */}
                      <div className="space-y-1 min-w-[110px] flex-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">{copy.section}</label>
                        <select className={controlClasses} value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
                          <option value="">{copy.allSections}</option>
                          {sections.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      {/* Search */}
                      <div className="space-y-1 min-w-[160px] flex-[2]">
                        <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">{copy.search}</label>
                        <div className="relative">
                          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                          <input placeholder={copy.searchPlaceholder} className={cn(controlClasses, "ps-9")} value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                      </div>
                      {/* Status filter pills */}
                      <div className="space-y-1 flex-[3]">
                        <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">{copy.status}</label>
                        <div className="flex flex-wrap gap-1.5 h-11 items-center">
                          {(["all", "present", "absent", "late", "excused", "unrecorded"] as AttendanceStatusFilter[]).map((s) => {
                            const label = s === "all" ? copy.allStatuses : s === "unrecorded" ? copy.unrecorded : copy.statusLabels[s as AttendanceStatus];
                            const active = filterStatus === s;
                            return (
                              <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={cn(
                                  "px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all",
                                  active
                                    ? s === "all" ? "bg-[var(--primary)] text-white border-transparent"
                                      : s === "present" ? "bg-emerald-500 text-white border-transparent"
                                        : s === "absent" ? "bg-rose-500 text-white border-transparent"
                                          : s === "late" ? "bg-amber-500 text-white border-transparent"
                                            : s === "excused" ? "bg-blue-500 text-white border-transparent"
                                              : "bg-[var(--surface-strong)] text-[var(--text-primary)] border-[var(--border)]"
                                    : "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--border)]"
                                )}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Bulk assign */}
                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]">
                      <Filter size={13} className="text-[var(--text-muted)]" />
                      <span className="text-[10px] font-black uppercase text-[var(--text-muted)] me-1">{copy.bulkAssign}</span>
                      {(["present", "absent", "late", "excused"] as AttendanceStatus[]).map((status) => (
                        <button
                          key={status}
                          onClick={() => applyStatusToFiltered(status)}
                          className={cn("px-3 py-1.5 rounded-xl text-[11px] font-black border transition hover:-translate-y-0.5", statusMeta[status].bg, statusMeta[status].color, statusMeta[status].border)}
                        >
                          {statusMeta[status].label}
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* ── Class breakdown ─────────────────────────────────────── */}
                  {classStats.length > 1 && (
                    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]">
                      <div className="flex items-center gap-2 mb-4">
                        <BarChart3 size={15} className="text-[var(--primary)]" />
                        <h2 className="text-sm font-black text-[var(--text-primary)]">حضور بالصف</h2>
                      </div>
                      <div className="space-y-2.5">
                        {classStats.map((cls) => (
                          <div key={cls.class_name} className="flex items-center gap-3">
                            <span className="text-xs font-black text-[var(--text-secondary)] w-28 shrink-0 truncate">{cls.class_name}</span>
                            <div className="flex-1 h-5 bg-[var(--surface-muted)] rounded-full overflow-hidden relative">
                              <div
                                className={cn("h-full rounded-full transition-all", cls.rate >= 80 ? "bg-emerald-500" : cls.rate >= 60 ? "bg-amber-500" : "bg-rose-500")}
                                style={{ width: `${cls.rate}%` }}
                              />
                            </div>
                            <span className={cn("text-xs font-black w-10 text-end shrink-0", cls.rate >= 80 ? "text-emerald-600 dark:text-emerald-400" : cls.rate >= 60 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400")}>{cls.rate}%</span>
                            <span className="text-[10px] text-[var(--text-muted)] font-bold w-16 shrink-0 hidden sm:block">
                              ↑{cls.present} ↓{cls.absent}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* ── Main Attendance Table ────────────────────────────────── */}
                  <section className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] overflow-hidden">
                    {/* Table header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                      <div className="flex items-center gap-3">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-[var(--warning)]/10 border border-[var(--warning)]/30 text-[var(--warning)] text-[11px] font-black">
                            <Lock size={11} /> مقفل
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/20 text-[var(--success)] text-[11px] font-black">
                            قابل للتعديل
                          </span>
                        )}
                        <span className="text-sm font-black text-[var(--text-primary)]">{copy.studentsList}</span>
                        <span className="text-[10px] font-black text-[var(--text-muted)] bg-[var(--surface-muted)] border border-[var(--border)] rounded-full px-2 py-0.5">{copy.studentCount(filteredStudents.length)}</span>
                      </div>
                      <button
                        onClick={exportDailyCsv}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-[11px] font-black text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
                      >
                        <Download size={13} /> CSV
                      </button>
                    </div>

                    {loadingStudents || loadingAttendance ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="h-10 w-10 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
                        <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">{copy.syncing}</span>
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="py-20 text-center text-[var(--text-muted)] font-bold border-2 border-dashed border-[var(--border)] rounded-2xl mx-5 my-5">
                        {copy.noResults}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-start border-collapse">
                          <thead>
                            <tr className="bg-[var(--surface-muted)]">
                              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">#</th>
                              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{copy.studentName}</th>
                              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{copy.classSection}</th>
                              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{copy.chooseStatus}</th>
                              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start hidden md:table-cell">{copy.note}</th>
                              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start hidden lg:table-cell">{copy.updatedAt}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {filteredStudents.map((student, idx) => {
                              const draft = attendanceDrafts[student.id] || { status: "", note: "", touched: false };
                              const rowStyle = draft.status && isAttendanceStatus(draft.status) ? statusRowMeta[draft.status] : null;
                              return (
                                <tr
                                  key={student.id}
                                  className={cn(
                                    "transition-colors",
                                    rowStyle?.border ?? "",
                                    rowStyle ? rowStyle.rowBg : "hover:bg-[var(--surface-muted)]/40",
                                    draft.touched && !isLocked && "ring-1 ring-inset ring-[var(--primary)]/20",
                                  )}
                                >
                                  <td className="px-4 py-3 text-[11px] font-black text-[var(--text-muted)] w-8">{idx + 1}</td>
                                  <td className="px-4 py-3">
                                    <span className="font-black text-[var(--text-primary)] text-sm">{student.full_name}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-xs font-bold text-[var(--text-secondary)]">{student.class_name}</span>
                                    {student.section && <span className="text-xs text-[var(--text-muted)] ms-1">· {student.section}</span>}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="inline-flex rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface-strong)]">
                                      {(["present", "absent", "late", "excused"] as AttendanceStatus[]).map((status) => {
                                        const isActive = draft.status === status;
                                        return (
                                          <button
                                            key={status}
                                            disabled={isLocked}
                                            onClick={() => !isLocked && setRowStatus(student.id, status)}
                                            className={cn(
                                              "px-3 py-2 text-[11px] font-black transition-all border-e last:border-e-0 border-[var(--border)]",
                                              isLocked
                                                ? isActive
                                                  ? `${statusMeta[status].bg} ${statusMeta[status].color} opacity-70`
                                                  : "text-[var(--text-muted)] opacity-25 cursor-not-allowed"
                                                : isActive
                                                  ? `${statusMeta[status].bg} ${statusMeta[status].color} shadow-sm`
                                                  : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                                            )}
                                          >
                                            {statusMeta[status].label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 hidden md:table-cell">
                                    <input
                                      className={cn("h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-xs font-bold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 w-full max-w-[200px]", isLocked && "opacity-40 cursor-not-allowed")}
                                      placeholder={copy.addNote}
                                      value={draft.note}
                                      onChange={(e) => !isLocked && setRowNote(student.id, e.target.value)}
                                      readOnly={isLocked}
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-[10px] font-bold text-[var(--text-muted)] whitespace-nowrap hidden lg:table-cell">
                                    {draft.updated_at ? new Date(draft.updated_at).toLocaleTimeString(locale === "en" ? "en-US" : "ar-IQ", { hour: "2-digit", minute: "2-digit" }) : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  {/* ── Repeated Absences ───────────────────────────────────── */}
                  <section className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] overflow-hidden">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-[var(--border)]">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={15} className="text-rose-500 shrink-0" />
                        <div>
                          <span className="text-sm font-black text-[var(--text-primary)]">الغياب المتكرر</span>
                          <span className="text-[11px] text-[var(--text-muted)] ms-2">آخر 30 يوم</span>
                        </div>
                        {repeatedAbsences.length > 0 && (
                          <span className="h-5 min-w-5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center px-1">
                            {repeatedAbsences.length}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-[var(--text-muted)]">حد:</span>
                        {[2, 3, 5, 7, 10].map((n) => (
                          <button
                            key={n}
                            onClick={() => setAbsenceThreshold(n)}
                            className={cn(
                              "h-7 w-7 rounded-lg text-[11px] font-black border transition",
                              absenceThreshold === n ? "bg-rose-500 text-white border-transparent" : "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--border)]"
                            )}
                          >
                            {n}
                          </button>
                        ))}
                        <button onClick={() => void fetchRepeatedAbsences(absenceThreshold)} className="h-7 w-7 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-muted)] transition hover:bg-[var(--border)]">
                          <RotateCcw size={12} />
                        </button>
                      </div>
                    </div>

                    {loadingRepeated ? (
                      <div className="flex justify-center py-10">
                        <div className="h-8 w-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
                      </div>
                    ) : repeatedAbsences.length === 0 ? (
                      <div className="flex items-center justify-center gap-3 py-10 text-[var(--text-muted)]">
                        <TrendingUp size={20} className="text-emerald-500 opacity-50" />
                        <span className="text-sm font-bold">لا يوجد طلاب تجاوزوا {absenceThreshold} غيابات</span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-start border-collapse">
                          <thead>
                            <tr className="bg-[var(--surface-muted)]">
                              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">الطالب</th>
                              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">الصف</th>
                              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center w-24">غيابات</th>
                              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start hidden sm:table-cell">آخر 3 أيام</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {repeatedAbsences.map((s) => (
                              <tr key={s.id} className="hover:bg-rose-50/30 dark:hover:bg-rose-900/10 transition-colors border-s-[3px] border-s-transparent hover:border-s-rose-400">
                                <td className="px-4 py-3 font-black text-[var(--text-primary)] text-sm">{s.full_name}</td>
                                <td className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)]">{s.class_name}{s.section ? ` · ${s.section}` : ""}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={cn(
                                    "inline-flex h-7 min-w-7 items-center justify-center rounded-full text-xs font-black px-2",
                                    s.absent_count >= 7 ? "bg-rose-500 text-white" : s.absent_count >= 5 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400"
                                  )}>
                                    {s.absent_count}
                                  </span>
                                </td>
                                <td className="px-4 py-3 hidden sm:table-cell">
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
                  </section>

                  <StudentAttendanceInsight schoolId={resolvedSchoolIdForInsights} className={filterClass} section={filterSection} />

                  {/* ── History / Trend ─────────────────────────────────────── */}
                  {historyRows.length > 0 && (
                    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] overflow-hidden">
                      <div className="px-5 py-4 border-b border-[var(--border)]">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-sm font-black text-[var(--text-primary)]">آخر 30 يوم</h2>
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{copy.historyDescription}</p>
                          </div>
                          {/* Weekly comparison */}
                          <div className="hidden sm:flex items-center gap-4">
                            <div className="text-center">
                              <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">هذا الأسبوع</div>
                              <div className={cn("text-lg font-black", weeklyComparison.diff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>{weeklyComparison.thisRate}%</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">الأسبوع الماضي</div>
                              <div className="text-lg font-black text-[var(--text-primary)]">{weeklyComparison.lastRate}%</div>
                            </div>
                            <div className={cn(
                              "flex items-center gap-1 h-8 px-3 rounded-xl text-xs font-black border",
                              weeklyComparison.diff > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40"
                                : weeklyComparison.diff < 0 ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/40"
                                  : "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)]"
                            )}>
                              {weeklyComparison.diff > 0 ? "↑" : weeklyComparison.diff < 0 ? "↓" : "—"} {weeklyComparison.diff !== 0 ? `${Math.abs(weeklyComparison.diff)}%` : "لا تغيير"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bar chart */}
                      <div className="p-5 space-y-1.5">
                        {historyRows.slice(0, 14).map((row) => (
                          <div key={row.date} className="flex items-center gap-3 group">
                            <span className="text-[10px] font-black text-[var(--text-muted)] w-24 shrink-0 group-hover:text-[var(--text-primary)] transition-colors">{row.date}</span>
                            <div className="flex-1 h-5 bg-[var(--surface-muted)] rounded-full overflow-hidden flex">
                              {row.total > 0 && (
                                <>
                                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(row.present / row.total) * 100}%` }} title={`حاضر: ${row.present}`} />
                                  <div className="bg-amber-400 h-full transition-all" style={{ width: `${(row.late / row.total) * 100}%` }} title={`متأخر: ${row.late}`} />
                                  <div className="bg-blue-400 h-full transition-all" style={{ width: `${(row.excused / row.total) * 100}%` }} title={`بعذر: ${row.excused}`} />
                                  <div className="bg-rose-400 h-full transition-all" style={{ width: `${(row.absent / row.total) * 100}%` }} title={`غائب: ${row.absent}`} />
                                </>
                              )}
                            </div>
                            <span className={cn(
                              "text-xs font-black w-10 text-end shrink-0",
                              row.rate >= 80 ? "text-emerald-600 dark:text-emerald-400" : row.rate >= 60 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                            )}>{row.rate}%</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-4 pt-3 mt-2 border-t border-[var(--border)]">
                          {[{ color: "bg-emerald-500", label: "حاضر" }, { color: "bg-amber-400", label: "متأخر" }, { color: "bg-blue-400", label: "بعذر" }, { color: "bg-rose-400", label: "غائب" }].map((l) => (
                            <div key={l.label} className="flex items-center gap-1.5">
                              <div className={cn("h-2.5 w-2.5 rounded-full", l.color)} />
                              <span className="text-[10px] font-bold text-[var(--text-muted)]">{l.label}</span>
                            </div>
                          ))}
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
