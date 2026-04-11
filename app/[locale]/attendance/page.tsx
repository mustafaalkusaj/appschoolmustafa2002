"use client";
/* eslint-disable react-hooks/preserve-manual-memoization */

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatNumber } from "@/lib/formatting";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import { cn } from "@/lib/brand/brand-utils";
import { CalendarDays, Search, Filter, Save, RotateCcw } from "@/lib/icons";
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

type AttendanceHistoryRow = {
  attendance_date: string;
  status: string;
};

type AttendanceStatusCounts = {
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

function mapAttendanceDbError(message: string, copy: AttendanceCopy) {
  if (message.includes('relation "attendance_records" does not exist')) {
    return copy.dbTableMissing;
  }
  return message;
}

export default function AttendancePage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) === "en" ? "en" : "ar";
  const copy = ATTENDANCE_COPY[locale];
  const statusMeta = useMemo(() => buildStatusMeta(copy), [copy]);
  const { profile } = useRole();
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

  const fetchStudents = useCallback(async () => {
    setLoadingStudents(true);
    setError("");
    const scopedSchoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!scopedSchoolId) {
      setStudents([]);
      setLoadingStudents(false);
      return;
    }

    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, class_name, section, status, school_id, branch_id")
      .eq("school_id", scopedSchoolId)
      .neq("status", "deleted")
      .order("class_name", { ascending: true })
      .order("full_name", { ascending: true });

    if (error) {
      setError(copy.loadStudentsFailed);
      setLoadingStudents(false);
      return;
    }

    setStudents((data || []) as Student[]);
    setLoadingStudents(false);
  }, [copy.loadStudentsFailed, profile, schoolScope.selectedSchoolId]);

  const resolvedSchoolIdForInsights = useMemo(() => {
    return schoolScope.selectedSchoolId ?? profile?.school_id ?? null;
  }, [profile?.school_id, schoolScope.selectedSchoolId]);

  const fetchAttendanceForDate = useCallback(async (dateValue: string) => {
    setLoadingAttendance(true);
    setError("");
    const scopedSchoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!scopedSchoolId) {
      setAttendanceDrafts({});
      setLoadingAttendance(false);
      return;
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .select("id, student_id, status, note, updated_at, school_id")
      .eq("school_id", scopedSchoolId)
      .eq("attendance_date", dateValue);

    if (error) {
      setError(`${copy.loadAttendanceFailedPrefix} ${mapAttendanceDbError(error.message, copy)}`);
      setLoadingAttendance(false);
      return;
    }

    const byStudent: Record<string, AttendanceRow> = {};
    ((data || []) as AttendanceRow[]).forEach((row) => {
      byStudent[row.student_id] = row;
    });

    const nextDrafts: Record<string, AttendanceDraft> = {};
    students.forEach((student) => {
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

    setAttendanceDrafts(nextDrafts);
    setLoadingAttendance(false);
  }, [copy, profile, schoolScope.selectedSchoolId, students]);

  const fetchHistory = useCallback(async (dateValue: string) => {
    const scopedSchoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!scopedSchoolId) {
      setHistoryRows([]);
      return;
    }
    const d = new Date(dateValue + "T00:00:00");
    d.setDate(d.getDate() - 14);
    const fromDate = getLocalIsoDate(d);

    const { data, error } = await supabase
      .from("attendance_records")
      .select("attendance_date, status, school_id")
      .eq("school_id", scopedSchoolId)
      .gte("attendance_date", fromDate)
      .lte("attendance_date", dateValue);

    if (error) return;

    const grouped: Record<string, AttendanceStatusCounts> = {};

    ((data || []) as AttendanceHistoryRow[]).forEach((row) => {
      if (!grouped[row.attendance_date]) {
        grouped[row.attendance_date] = { present: 0, absent: 0, late: 0, excused: 0 };
      }
      if (row.status in grouped[row.attendance_date]) {
        const statusKey = row.status as keyof AttendanceStatusCounts;
        grouped[row.attendance_date][statusKey] += 1;
      }
    });

    const rows = Object.keys(grouped)
      .sort((a, b) => (a > b ? -1 : 1))
      .map((date) => {
        const g = grouped[date];
        const total = g.present + g.absent + g.late + g.excused;
        const rate = total ? Math.round(((g.present + g.late) / total) * 100) : 0;
        return { date, ...g, total, rate };
      });

    setHistoryRows(rows);
  }, [profile, schoolScope.selectedSchoolId]);

  useEffect(() => {
    if (schoolScope.scopeLoading) return;
    void fetchStudents();
  }, [fetchStudents, schoolScope.scopeLoading]);

  useEffect(() => {
    if (schoolScope.scopeLoading || schoolScope.shouldBlockContent) {
      setAttendanceDrafts({});
      setHistoryRows([]);
      return;
    }
    if (!students.length) {
      setAttendanceDrafts({});
      setHistoryRows([]);
      return;
    }
    void fetchAttendanceForDate(selectedDate);
    void fetchHistory(selectedDate);
  }, [selectedDate, students.length, fetchAttendanceForDate, fetchHistory, schoolScope.scopeLoading, schoolScope.shouldBlockContent]);

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
    fetchAttendanceForDate(selectedDate);
    setSuccess(copy.reloadSuccess);
    setTimeout(() => setSuccess(""), 2500);
  }

  async function saveAttendance() {
    setSaving(true);
    setError("");

    const studentById: Record<string, Student> = {};
    students.forEach((student) => {
      studentById[student.id] = student;
    });

    const changedEntries = Object.entries(attendanceDrafts).filter(([, draft]) => draft.touched && draft.status);

    if (!changedEntries.length) {
      setError(copy.noChanges);
      setSaving(false);
      return;
    }

    const payload = changedEntries.map(([studentId, draft]) => {
      const student = studentById[studentId];
      return {
        student_id: studentId,
        school_id: student?.school_id || null,
        branch_id: student?.branch_id || null,
        attendance_date: selectedDate,
        status: draft.status,
        note: draft.note.trim() || null,
      };
    });

    const { error } = await supabase
      .from("attendance_records")
      .upsert(payload, { onConflict: "student_id,attendance_date" });

    if (error) {
      setError(`${copy.saveFailedPrefix} ${mapAttendanceDbError(error.message, copy)}`);
      setSaving(false);
      return;
    }

    setSuccess(copy.saveSuccess(payload.length));
    setTimeout(() => setSuccess(""), 3000);
    await fetchAttendanceForDate(selectedDate);
    await fetchHistory(selectedDate);
    setSaving(false);
  }

  const classes = useMemo(() => Array.from(new Set(students.map((s) => s.class_name).filter(Boolean))) as string[], [students]);
  const sections = useMemo(() => {
    const source = filterClass ? students.filter((s) => s.class_name === filterClass) : students;
    return Array.from(new Set(source.map((s) => s.section).filter(Boolean))) as string[];
  }, [students, filterClass]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const draft = attendanceDrafts[student.id];
      const status = draft?.status || "";
      const matchSearch = student.full_name?.includes(search) || student.class_name?.includes(search) || (student.section || "").includes(search);
      const matchClass = filterClass ? student.class_name === filterClass : true;
      const matchSection = filterSection ? (student.section || "") === filterSection : true;
      const matchStatus = filterStatus === "all" ? true : filterStatus === "unrecorded" ? !status : status === filterStatus;
      return matchSearch && matchClass && matchSection && matchStatus;
    });
  }, [students, attendanceDrafts, search, filterClass, filterSection, filterStatus]);

  const stats = useMemo(() => {
    const count = { present: 0, absent: 0, late: 0, excused: 0, unrecorded: 0 };
    filteredStudents.forEach((student) => {
      const status = attendanceDrafts[student.id]?.status || "";
      if (!status) { count.unrecorded += 1; return; }
      if (status in count) count[status as AttendanceStatus] += 1;
    });
    const total = filteredStudents.length;
    const attendanceRate = total ? Math.round(((count.present + count.late) / total) * 100) : 0;
    return { ...count, total, attendanceRate };
  }, [filteredStudents, attendanceDrafts]);

  const changedCount = useMemo(() => Object.values(attendanceDrafts).filter((draft) => draft.touched && draft.status).length, [attendanceDrafts]);
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

          <main className="flex-1 pt-16 overflow-y-auto custom-scrollbar">
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
                    <button
                      className={cn(
                        "h-full px-6 py-4 rounded-2xl font-black transition-all shadow-lg flex flex-col items-center justify-center gap-1 min-w-[180px] border",
                        changedCount > 0
                          ? "bg-[var(--primary)] text-white border-transparent shadow-[0_16px_30px_color-mix(in_srgb,var(--primary)_24%,transparent)] hover:-translate-y-0.5 active:translate-y-0"
                          : "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)] cursor-not-allowed opacity-60"
                      )}
                      onClick={saveAttendance}
                      disabled={saving || changedCount === 0}
                    >
                      <Save size={20} />
                      <span className="text-sm">{saving ? copy.saving : copy.saveChanges(changedCount)}</span>
                    </button>
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

                  {/* Main Attendance Grid */}
                  <section className="rounded-[40px] border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]">
                    <div className="space-y-8">
                      <div className="flex items-center justify-between border-b border-[var(--border)] pb-6">
                        <h2 className="text-xl font-black text-[var(--text-primary)]">{copy.studentsList}</h2>
                        <div className="px-3 py-1 rounded-full bg-[var(--surface-muted)] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                          {copy.studentCount(filteredStudents.length)}
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
                                      <div className="flex flex-wrap gap-2 min-w-[260px]">
                                        {(["present", "absent", "late", "excused"] as AttendanceStatus[]).map((status) => {
                                          const isActive = draft.status === status;
                                          return (
                                            <button
                                              key={status}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-[11px] font-black border shadow-sm transition-all",
                                                isActive 
                                                  ? `${statusMeta[status].bg} ${statusMeta[status].color} ${statusMeta[status].border} shadow-[0_10px_22px_color-mix(in_srgb,var(--primary)_15%,transparent)] scale-[1.03]` 
                                                  : "bg-[var(--surface-strong)] border-[var(--border)] text-[var(--text-muted)] grayscale opacity-70 hover:grayscale-0 hover:opacity-100 hover:-translate-y-0.5"
                                              )}
                                              onClick={() => setRowStatus(student.id, status)}
                                            >
                                              {statusMeta[status].label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <input 
                                        className={cn(controlClasses, "h-9 text-xs py-1")} 
                                        placeholder={copy.addNote}
                                        value={draft.note} 
                                        onChange={(e) => setRowNote(student.id, e.target.value)} 
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
                          <h2 className="text-xl font-black text-[var(--text-primary)]">{copy.historyTitle}</h2>
                          <p className="text-sm text-[var(--text-muted)]">{copy.historyDescription}</p>
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
