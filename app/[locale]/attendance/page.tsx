"use client";
/* eslint-disable react-hooks/preserve-manual-memoization */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatNumber } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { resolveSchoolIdForProfile } from "@/lib/school/context";

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

const STATUS_META: Record<AttendanceStatus, { label: string; bg: string; color: string }> = {
  present: { label: "حاضر", bg: "#D1FAE5", color: "#065F46" },
  absent: { label: "غائب", bg: "#FEE2E2", color: "#991B1B" },
  late: { label: "متأخر", bg: "#FEF3C7", color: "#92400E" },
  excused: { label: "بعذر", bg: "#DBEAFE", color: "#1E40AF" },
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
    return "جدول attendance_records غير موجود في Supabase. نفّذ ملف database_setup.sql داخل محرر SQL.";
  }
  if (message.includes("permission denied") || message.includes("row-level security")) {
    return "صلاحيات الحضور غير مكتملة. نفّذ ملف database_setup.sql لتطبيق سياسات RLS.";
  }
  return message;
}

export default function AttendancePage() {
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const dateInputRef = useRef<HTMLInputElement>(null);
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
      setError("تعذر تحميل قائمة الطلاب: " + error.message);
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
      return {
        ...prev,
        [studentId]: { ...current, status, touched: true },
      };
    });
  }

  function setRowNote(studentId: string, note: string) {
    setAttendanceDrafts((prev) => {
      const current = prev[studentId] || { status: "", note: "", touched: false };
      return {
        ...prev,
        [studentId]: { ...current, note, touched: true },
      };
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

  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;
    const picker = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === "function") {
      picker.showPicker();
      return;
    }
    input.focus();
    input.click();
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
      setError("لا توجد تغييرات للحفظ.");
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

    setSuccess(`تم حفظ ${payload.length} سجل حضور.`);
    setTimeout(() => setSuccess(""), 3000);
    await fetchAttendanceForDate(selectedDate);
    await fetchHistory(selectedDate);
    setSaving(false);
  }

  const classes = useMemo(
    () => Array.from(new Set(students.map((s) => s.class_name).filter(Boolean))) as string[],
    [students]
  );

  const sections = useMemo(() => {
    const source = filterClass ? students.filter((s) => s.class_name === filterClass) : students;
    return Array.from(new Set(source.map((s) => s.section).filter(Boolean))) as string[];
  }, [students, filterClass]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const draft = attendanceDrafts[student.id];
      const status = draft?.status || "";

      const matchSearch =
        student.full_name?.includes(search) ||
        student.class_name?.includes(search) ||
        (student.section || "").includes(search);

      const matchClass = filterClass ? student.class_name === filterClass : true;
      const matchSection = filterSection ? (student.section || "") === filterSection : true;
      const matchStatus =
        filterStatus === "all"
          ? true
          : filterStatus === "unrecorded"
          ? !status
          : status === filterStatus;

      return matchSearch && matchClass && matchSection && matchStatus;
    });
  }, [students, attendanceDrafts, search, filterClass, filterSection, filterStatus]);

  const stats = useMemo(() => {
    const count = { present: 0, absent: 0, late: 0, excused: 0, unrecorded: 0 };
    filteredStudents.forEach((student) => {
      const status = attendanceDrafts[student.id]?.status || "";
      if (!status) {
        count.unrecorded += 1;
        return;
      }
      if (status in count) count[status as AttendanceStatus] += 1;
    });
    const total = filteredStudents.length;
    const attendanceRate = total ? Math.round(((count.present + count.late) / total) * 100) : 0;
    return { ...count, total, attendanceRate };
  }, [filteredStudents, attendanceDrafts]);

  const changedCount = useMemo(
    () => Object.values(attendanceDrafts).filter((draft) => draft.touched && draft.status).length,
    [attendanceDrafts]
  );

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--p2:#4C2F9E;--p3:#6C4AB6;--p4:#9B7EDC;--bg:#F0EEFF;--dark:#1F1547;--gray:#6B7280}
        body{font-family:var(--font-manrope),Segoe UI,sans-serif;direction:rtl;background:var(--bg);color:var(--dark)}
        .layout{display:flex;height:100vh}
        .sidebar{width:200px;background:linear-gradient(180deg,#EDE8FA,#E0D8F8);display:flex;flex-direction:column;padding:1rem .8rem;border-right:1px solid rgba(108,74,182,.1);flex-shrink:0}
        .logo{display:flex;align-items:center;gap:.6rem;margin-bottom:1rem;padding:.4rem}
        .logo-ico{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--p3),var(--p4));display:flex;align-items:center;justify-content:center}
        .logo-ico svg{width:18px;height:18px;fill:white}
        .logo span{font-size:.88rem;font-weight:800;color:var(--p2)}
        .nav{display:flex;align-items:center;gap:.6rem;padding:.55rem .8rem;border-radius:9px;color:var(--p2);font-size:.8rem;font-weight:600;cursor:pointer;transition:all .2s;text-decoration:none}
        .nav:hover{background:rgba(108,74,182,.1)}
        .nav.active{background:linear-gradient(135deg,var(--p3),var(--p4));color:white}
        .nav.danger{color:#EF4444}
        .nav.danger:hover{background:#FEE2E2}
        .sep{height:1px;background:rgba(108,74,182,.12);margin:.4rem 0}
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
        .topbar{background:white;padding:.7rem 1.4rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(108,74,182,.08);flex-shrink:0}
        .topbar-title{font-size:.95rem;font-weight:800}
        .topbar-sub{font-size:.72rem;color:var(--gray)}
        .content{flex:1;overflow:auto;padding:1.2rem 1.4rem}
        .ok{background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7;border-radius:9px;padding:.6rem .9rem;font-size:.8rem;font-weight:600;margin-bottom:.8rem}
        .err{background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5;border-radius:9px;padding:.6rem .9rem;font-size:.8rem;font-weight:600;margin-bottom:.8rem}
        .toolbar{background:white;border-radius:13px;padding:.9rem;border:1px solid rgba(108,74,182,.08);display:flex;gap:.7rem;flex-wrap:wrap;align-items:center;margin-bottom:.9rem}
        .date-wrap{display:flex;align-items:center;gap:.35rem}
        .input,.select{padding:.55rem .7rem;border:1px solid rgba(108,74,182,.16);border-radius:9px;background:white;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;outline:none;min-height:38px}
        .input:focus,.select:focus{border-color:var(--p3)}
        .date-wrap .input{min-width:170px;cursor:pointer}
        .date-btn{padding:.54rem .65rem;border:1px solid rgba(108,74,182,.16);border-radius:9px;background:white;color:var(--p2);font-size:.95rem;cursor:pointer;line-height:1}
        .date-btn:hover{background:#F8F6FF}
        .search{flex:1;min-width:210px}
        .btn{padding:.55rem .9rem;border:none;border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.78rem;font-weight:700;cursor:pointer;white-space:nowrap}
        .btn-main{background:linear-gradient(135deg,var(--p3),var(--p2));color:white}
        .btn-light{background:#EDE8FA;color:var(--p2)}
        .btn-danger{background:#FEE2E2;color:#991B1B}
        .stats{display:grid;grid-template-columns:repeat(6,1fr);gap:.7rem;margin-bottom:1rem}
        .card{background:white;border-radius:12px;padding:.7rem .8rem;border:1px solid rgba(108,74,182,.06)}
        .c-label{font-size:.7rem;color:var(--gray)}
        .c-val{font-size:1rem;font-weight:800;margin-top:.1rem}
        .tbl-wrap{background:white;border-radius:13px;border:1px solid rgba(108,74,182,.08);overflow:hidden}
        table{width:100%;border-collapse:collapse}
        thead{background:#F8F6FF}
        th{padding:.58rem .75rem;font-size:.72rem;font-weight:700;color:var(--p2);text-align:left;border-bottom:1px solid rgba(108,74,182,.08)}
        td{padding:.58rem .75rem;font-size:.76rem;border-bottom:1px solid rgba(108,74,182,.05);vertical-align:middle}
        tr:hover td{background:#FAFAFE}
        .status-group{display:flex;gap:.3rem;flex-wrap:wrap}
        .status-btn{padding:.25rem .5rem;border:none;border-radius:999px;font-size:.66rem;font-weight:700;cursor:pointer;background:#F3F4F6;color:#374151}
        .status-btn.active{box-shadow:0 0 0 2px rgba(108,74,182,.22)}
        .badge{display:inline-flex;align-items:center;padding:.18rem .5rem;border-radius:999px;font-size:.65rem;font-weight:700}
        .muted{color:var(--gray)}
        .history{margin-top:1rem;background:white;border-radius:13px;border:1px solid rgba(108,74,182,.08);overflow:hidden}
        .h-head{display:flex;align-items:center;justify-content:space-between;padding:.75rem .9rem;border-bottom:1px solid rgba(108,74,182,.08)}
        .h-title{font-size:.8rem;font-weight:800}
        .empty{padding:2rem;text-align:center;color:var(--gray)}
        @media (max-width:1200px){.stats{grid-template-columns:repeat(3,1fr)}}
        @media (max-width:880px){
          .sidebar{display:none}
          .content{padding:1rem}
          .stats{grid-template-columns:repeat(2,1fr)}
          th,td{padding:.55rem .5rem}
        }
      `}</style>

      <div className="layout">
        <AppSidebar currentPath="/attendance" showFloatingToggle />

        <div className="main">
          <div className="content app-shell-content">
            {success && <div className="ok">{success}</div>}
            {error && <div className="err">{error}</div>}
            <SchoolScopeBanner scope={schoolScope} showSelector={false} />
            {schoolScope.shouldBlockContent ? (
              <SchoolScopeEmptyState
                scope={schoolScope}
                title="بيانات الحضور"
                description="لن يتم تحميل سجلات الحضور أو حفظها قبل اختيار مدرسة صريحة لهذه الصفحة."
              />
            ) : (
              <>
                <div className="toolbar">
                  <div className="date-wrap">
                    <input
                      ref={dateInputRef}
                      className="input"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                    <button type="button" className="date-btn" onClick={openDatePicker} title="فتح التقويم">
                      <AppIcon token="📅" size={16} />
                    </button>
                  </div>
                  <select className="select" value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setFilterSection(""); }}>
                    <option value="">كل الصفوف</option>
                    {classes.map((className) => <option key={className} value={className}>{className}</option>)}
                  </select>
                  <select className="select" value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
                    <option value="">كل الشعب</option>
                    {sections.map((section) => <option key={section} value={section}>{section}</option>)}
                  </select>
                  <select className="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as AttendanceStatusFilter)}>
                    <option value="all">كل الحالات</option>
                    <option value="present">حاضر</option>
                    <option value="absent">غائب</option>
                    <option value="late">متأخر</option>
                    <option value="excused">بعذر</option>
                    <option value="unrecorded">غير مسجل</option>
                  </select>
                  <input
                    className="input search"
                    placeholder="ابحث بالاسم أو الصف أو الشعبة..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <button className="btn btn-light" onClick={() => applyStatusToFiltered("present")}>تعيين الكل حاضر</button>
                  <button className="btn btn-light" onClick={() => applyStatusToFiltered("absent")}>تعيين الكل غائب</button>
                  <button className="btn btn-light" onClick={() => applyStatusToFiltered("late")}>تعيين الكل متأخر</button>
                  <button className="btn btn-light" onClick={() => applyStatusToFiltered("excused")}>تعيين الكل بعذر</button>
                  <button className="btn btn-danger" onClick={resetUnsavedChanges}>إلغاء التغييرات غير المحفوظة</button>
                  <button className="btn btn-main" onClick={saveAttendance} disabled={saving || loadingAttendance}>
                    {saving ? "جارٍ الحفظ..." : `حفظ التغييرات (${formatNumber(changedCount)})`}
                  </button>
                </div>

            <div className="stats">
              <div className="card"><div className="c-label">إجمالي المعروض</div><div className="c-val">{formatNumber(stats.total)}</div></div>
              <div className="card"><div className="c-label">حاضر</div><div className="c-val" style={{ color: STATUS_META.present.color }}>{formatNumber(stats.present)}</div></div>
              <div className="card"><div className="c-label">غائب</div><div className="c-val" style={{ color: STATUS_META.absent.color }}>{formatNumber(stats.absent)}</div></div>
              <div className="card"><div className="c-label">متأخر</div><div className="c-val" style={{ color: STATUS_META.late.color }}>{formatNumber(stats.late)}</div></div>
              <div className="card"><div className="c-label">بعذر</div><div className="c-val" style={{ color: STATUS_META.excused.color }}>{formatNumber(stats.excused)}</div></div>
              <div className="card"><div className="c-label">نسبة الحضور</div><div className="c-val">{formatNumber(stats.attendanceRate)}%</div></div>
            </div>

            <div className="tbl-wrap">
              {loadingStudents || loadingAttendance ? (
                <div className="empty">جارٍ تحميل بيانات الحضور...</div>
              ) : filteredStudents.length === 0 ? (
                <div className="empty">لا توجد نتائج مطابقة للفلاتر الحالية.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>اسم الطالب</th>
                      <th>الصف</th>
                      <th>الشعبة</th>
                      <th>الحالة المسجلة</th>
                      <th>تحديد سريع</th>
                      <th>ملاحظة</th>
                      <th>آخر تحديث</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, index) => {
                      const draft = attendanceDrafts[student.id] || { status: "", note: "", touched: false };
                      const status = draft.status;
                      return (
                        <tr key={student.id}>
                          <td className="muted">{index + 1}</td>
                          <td style={{ fontWeight: 700, color: "var(--p2)" }}>{student.full_name}</td>
                          <td>{student.class_name || "—"}</td>
                          <td>{student.section || "—"}</td>
                          <td>
                            {status ? (
                              <span
                                className="badge"
                                style={{ background: STATUS_META[status].bg, color: STATUS_META[status].color }}
                              >
                                {STATUS_META[status].label}
                              </span>
                            ) : (
                              <span className="muted">غير مسجل</span>
                            )}
                          </td>
                          <td>
                            <div className="status-group">
                              {(["present", "absent", "late", "excused"] as AttendanceStatus[]).map((statusOption) => {
                                const meta = STATUS_META[statusOption];
                                return (
                                  <button
                                    key={statusOption}
                                    className={`status-btn${status === statusOption ? " active" : ""}`}
                                    style={status === statusOption ? { background: meta.bg, color: meta.color } : {}}
                                    onClick={() => setRowStatus(student.id, statusOption)}
                                  >
                                    {meta.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td>
                            <input
                              className="input"
                              style={{ width: "100%", minWidth: 150 }}
                              placeholder="ملاحظة (اختياري)"
                              value={draft.note}
                              onChange={(e) => setRowNote(student.id, e.target.value)}
                            />
                          </td>
                          <td className="muted">
                            {draft.updated_at ? new Date(draft.updated_at).toLocaleString("ar-IQ") : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="history">
              <div className="h-head">
                <div className="h-title">ملخص آخر 14 يوماً</div>
                <div className="muted">{historyRows.length} يوماً مسجلاً</div>
              </div>
              {historyRows.length === 0 ? (
                <div className="empty">لا توجد سجلات سابقة حتى الآن.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>حاضر</th>
                      <th>غائب</th>
                      <th>متأخر</th>
                      <th>بعذر</th>
                      <th>الإجمالي</th>
                      <th>نسبة الحضور</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((row) => (
                      <tr key={row.date}>
                        <td>{row.date}</td>
                        <td style={{ color: STATUS_META.present.color, fontWeight: 700 }}>{formatNumber(row.present)}</td>
                        <td style={{ color: STATUS_META.absent.color, fontWeight: 700 }}>{formatNumber(row.absent)}</td>
                        <td style={{ color: STATUS_META.late.color, fontWeight: 700 }}>{formatNumber(row.late)}</td>
                        <td style={{ color: STATUS_META.excused.color, fontWeight: 700 }}>{formatNumber(row.excused)}</td>
                        <td>{formatNumber(row.total)}</td>
                        <td>{formatNumber(row.rate)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
    </ProtectedRoute>
  );
}
