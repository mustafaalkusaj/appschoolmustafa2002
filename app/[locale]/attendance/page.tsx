"use client";
/* eslint-disable react-hooks/preserve-manual-memoization */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatNumber } from "@/lib/formatting";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import { cn } from "@/lib/brand/brand-utils";
import { CalendarDays, Search, Filter, Save, RotateCcw } from "@/lib/icons";

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

const STATUS_META: Record<AttendanceStatus, { label: string; bg: string; color: string; border: string }> = {
  present: { label: "حاضر", bg: "bg-emerald-50 dark:bg-emerald-900/20", color: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-800/50" },
  absent: { label: "غائب", bg: "bg-rose-50 dark:bg-rose-900/20", color: "text-rose-700 dark:text-rose-400", border: "border-rose-100 dark:border-rose-800/50" },
  late: { label: "متأخر", bg: "bg-amber-50 dark:bg-amber-900/20", color: "text-amber-700 dark:text-amber-400", border: "border-amber-100 dark:border-amber-800/50" },
  excused: { label: "بعذر", bg: "bg-blue-50 dark:bg-blue-900/20", color: "text-blue-700 dark:text-blue-400", border: "border-blue-100 dark:border-blue-800/50" },
};

function getLocalIsoDate(date: Date) {
  const shift = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - shift).toISOString().slice(0, 10);
}

function isAttendanceStatus(value: string): value is AttendanceStatus {
  return value === "present" || value === "absent" || value === "late" || value === "excused";
}

function mapAttendanceDbError(message: string) {
  if (message.includes('relation "attendance_records" does not exist')) {
    return "جدول سجلات الحضور غير متاح في قاعدة البيانات حالياً.";
  }
  return message;
}

export default function AttendancePage() {
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
      setError("تعذر تحميل قائمة الطلاب.");
      setLoadingStudents(false);
      return;
    }

    setStudents((data || []) as Student[]);
    setLoadingStudents(false);
  }, [profile, schoolScope.selectedSchoolId]);

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
      setError("تعذر تحميل سجلات الحضور: " + mapAttendanceDbError(error.message));
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
  }, [profile, schoolScope.selectedSchoolId, students]);

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
    setSuccess("تمت إعادة تحميل بيانات اليوم الحالي.");
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
      setError("لا توجد تغييرات جديدة للحفظ.");
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
      setError("تعذر حفظ الحضور: " + mapAttendanceDbError(error.message));
      setSaving(false);
      return;
    }

    setSuccess(`تم حفظ ${payload.length} سجل حضور بنجاح ✓`);
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
  const heroDateLabel = useMemo(() => new Date(`${selectedDate}T00:00:00`).toLocaleDateString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" }), [selectedDate]);

  const controlClasses = "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 w-full";

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
      <div className="flex min-h-screen bg-[var(--surface-muted)]">
        <AppSidebar currentPath="/attendance" />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar 
            title="إدارة الحضور" 
            subtitle="سجل الحضور اليومي للطلاب ومتابعة الالتزام" 
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
                    <h1 className="text-3xl font-black text-[var(--text-primary)]">سجل الحضور اليومي</h1>
                    <p className="text-sm text-[var(--text-muted)] max-w-2xl leading-relaxed">
                      وثّق حضور الطلاب، راجع الإحصائيات الفورية، وتابع تاريخ الالتزام بدقة عالية.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:w-auto">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-5 py-4 flex flex-col justify-center">
                      <div className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">التاريخ النشط</div>
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
                      <span className="text-sm">{saving ? "جارٍ الحفظ..." : `حفظ التغييرات (${changedCount})`}</span>
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
                    title="بيانات الحضور"
                    description="لن يتم تحميل سجلات الحضور أو حفظها قبل اختيار مدرسة صريحة لهذه الصفحة."
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
                          <h2 className="text-lg font-black text-[var(--text-primary)]">الفلاتر والتصفية</h2>
                        </div>
                        <button className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-black text-[var(--danger)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--surface-muted)]" onClick={resetUnsavedChanges}>
                          <RotateCcw size={14} />
                          إعادة تحميل البيانات
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                        <div className="space-y-1.5 lg:col-span-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">اليوم</label>
                          <div className="relative">
                            <CalendarDays size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                            <input type="date" className={cn(controlClasses, "ps-10")} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">الصف الدراسي</label>
                          <select className={controlClasses} value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setFilterSection(""); }}>
                            <option value="">كل الصفوف</option>
                            {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">الشعبة</label>
                          <select className={controlClasses} value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
                            <option value="">كل الشعب</option>
                            {sections.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">الحالة</label>
                          <select className={controlClasses} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as AttendanceStatusFilter)}>
                            <option value="all">كل الحالات</option>
                            <option value="present">حاضر</option>
                            <option value="absent">غائب</option>
                            <option value="late">متأخر</option>
                            <option value="excused">بعذر</option>
                            <option value="unrecorded">غير مسجل</option>
                          </select>
                        </div>
                        <div className="space-y-1.5 lg:col-span-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">بحث سريع</label>
                          <div className="relative">
                            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input placeholder="اسم الطالب..." className={cn(controlClasses, "ps-10")} value={search} onChange={(e) => setSearch(e.target.value)} />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
                        <span className="text-[10px] font-black uppercase text-[var(--text-muted)] self-center me-2">تعيين جماعي:</span>
                        {(["present", "absent", "late", "excused"] as AttendanceStatus[]).map((status) => (
                          <button
                            key={status}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[11px] font-black border shadow-sm transition-all hover:-translate-y-0.5",
                              STATUS_META[status].bg, STATUS_META[status].color, STATUS_META[status].border
                            )}
                            onClick={() => applyStatusToFiltered(status)}
                          >
                            تعيين الكل {STATUS_META[status].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* Stats Row */}
                  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-6">
                    {[
                      { label: "المعروض", value: formatNumber(stats.total), color: "text-[var(--text-primary)]" },
                      { label: "حاضر", value: formatNumber(stats.present), color: "text-[var(--success)]" },
                      { label: "غائب", value: formatNumber(stats.absent), color: "text-[var(--danger)]" },
                      { label: "متأخر", value: formatNumber(stats.late), color: "text-[var(--warning)]" },
                      { label: "بعذر", value: formatNumber(stats.excused), color: "text-[var(--info)]" },
                      { label: "النسبة", value: `${stats.attendanceRate}%`, color: "text-[var(--primary)]" },
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
                        <h2 className="text-xl font-black text-[var(--text-primary)]">قائمة الطلاب</h2>
                        <div className="px-3 py-1 rounded-full bg-[var(--surface-muted)] text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                          {formatNumber(filteredStudents.length)} طالب
                        </div>
                      </div>

                      {loadingStudents || loadingAttendance ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                          <div className="h-12 w-12 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
                          <span className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">جارٍ مزامنة السجلات...</span>
                        </div>
                      ) : filteredStudents.length === 0 ? (
                        <div className="py-20 text-center text-[var(--text-muted)] font-bold border-2 border-dashed border-[var(--border)] rounded-3xl">
                          لا توجد نتائج مطابقة للفلاتر.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                          <table className="w-full text-start border-collapse">
                            <thead>
                              <tr className="bg-[var(--surface-muted)] text-start">
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">اسم الطالب</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">الصف/الشعبة</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">تحديد الحالة</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">ملاحظة</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">التحديث</th>
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
                                                  ? `${STATUS_META[status].bg} ${STATUS_META[status].color} ${STATUS_META[status].border} shadow-[0_10px_22px_color-mix(in_srgb,var(--primary)_15%,transparent)] scale-[1.03]` 
                                                  : "bg-[var(--surface-strong)] border-[var(--border)] text-[var(--text-muted)] grayscale opacity-70 hover:grayscale-0 hover:opacity-100 hover:-translate-y-0.5"
                                              )}
                                              onClick={() => setRowStatus(student.id, status)}
                                            >
                                              {STATUS_META[status].label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <input 
                                        className={cn(controlClasses, "h-9 text-xs py-1")} 
                                        placeholder="إضافة ملاحظة..." 
                                        value={draft.note} 
                                        onChange={(e) => setRowNote(student.id, e.target.value)} 
                                      />
                                    </td>
                                    <td className="p-4 text-[10px] font-bold text-[var(--text-muted)] whitespace-nowrap">
                                      {draft.updated_at ? new Date(draft.updated_at).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }) : "—"}
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

                  {/* History Section */}
                  {historyRows.length > 0 && (
                    <section className="rounded-[40px] border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]">
                      <div className="space-y-8">
                        <div className="flex flex-col gap-1 border-b border-[var(--border)] pb-6">
                          <h2 className="text-xl font-black text-[var(--text-primary)]">ملخص آخر 14 يوماً</h2>
                          <p className="text-sm text-[var(--text-muted)]">راقب تطور نسبة الحضور اليومي للمدرسة</p>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                          <table className="w-full text-start border-collapse">
                            <thead>
                              <tr className="bg-[var(--surface-muted)] text-start">
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">التاريخ</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">حاضر</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">غائب</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">متأخر</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">بعذر</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">النسبة</th>
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
