"use client";
/* eslint-disable react-hooks/preserve-manual-memoization */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatNumber } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { resolveSchoolIdForProfile } from "@/lib/school-context";

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

type HistorySummary = {
  date: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  rate: number;
};

const STATUS_META: Record<AttendanceStatus, { label: string; badgeClass: string; color: string }> = {
  present: { label: "حاضر", badgeClass: "badge badge--success", color: "var(--success)" },
  absent: { label: "غائب", badgeClass: "badge badge--danger", color: "var(--danger)" },
  late: { label: "متأخر", badgeClass: "badge badge--warning", color: "var(--warning)" },
  excused: { label: "بعذر", badgeClass: "badge badge--info", color: "var(--primary)" },
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

    const grouped: Record<string, { present: number; absent: number; late: number; excused: number }> = {};

    ((data || []) as AttendanceHistoryRow[]).forEach((row) => {
      if (!grouped[row.attendance_date]) {
        grouped[row.attendance_date] = { present: 0, absent: 0, late: 0, excused: 0 };
      }
      if (row.status in grouped[row.attendance_date]) {
        grouped[row.attendance_date][row.status] += 1;
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
      <div className="app-layout">
        <AppSidebar currentPath="/attendance" />

        <div className="app-main">
          <AppShellTopbar
            title="الحضور اليومي"
            subtitle="سجّل الحضور وحدّثه حسب التاريخ والصف والشعبة"
            scope={schoolScope}
          />

          <div className="content app-shell-content">
            {success && <div className="msg-success">{success}</div>}
            {error && <div className="msg-error">{error}</div>}
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
                      className="form-input"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                    <button type="button" className="date-btn" onClick={openDatePicker} title="فتح التقويم">
                      <AppIcon token="📅" size={16} />
                    </button>
                  </div>
                  <select className="form-select" value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setFilterSection(""); }}>
                    <option value="">كل الصفوف</option>
                    {classes.map((className) => <option key={className} value={className}>{className}</option>)}
                  </select>
                  <select className="form-select" value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
                    <option value="">كل الشعب</option>
                    {sections.map((section) => <option key={section} value={section}>{section}</option>)}
                  </select>
                  <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as AttendanceStatusFilter)}>
                    <option value="all">كل الحالات</option>
                    <option value="present">حاضر</option>
                    <option value="absent">غائب</option>
                    <option value="late">متأخر</option>
                    <option value="excused">بعذر</option>
                    <option value="unrecorded">غير مسجل</option>
                  </select>
                  <input
                    className="form-input search"
                    placeholder="ابحث بالاسم أو الصف أو الشعبة..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <button className="ui-button ui-button--ghost" onClick={() => applyStatusToFiltered("present")}>تعيين الكل حاضر</button>
                  <button className="ui-button ui-button--ghost" onClick={() => applyStatusToFiltered("absent")}>تعيين الكل غائب</button>
                  <button className="ui-button ui-button--ghost" onClick={() => applyStatusToFiltered("late")}>تعيين الكل متأخر</button>
                  <button className="ui-button ui-button--ghost" onClick={() => applyStatusToFiltered("excused")}>تعيين الكل بعذر</button>
                  <button className="ui-button ui-button--danger" onClick={resetUnsavedChanges}>إلغاء التغييرات غير المحفوظة</button>
                  <button className="ui-button ui-button--primary" onClick={saveAttendance} disabled={saving || loadingAttendance}>
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
                          <td style={{ fontWeight: 700, color: "var(--primary)" }}>{student.full_name}</td>
                          <td>{student.class_name || "—"}</td>
                          <td>{student.section || "—"}</td>
                          <td>
                            {status ? (
                              <span className={STATUS_META[status].badgeClass}>
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
                                    style={status === statusOption ? { color: meta.color } : {}}
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
                              className="form-input"
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
    </ProtectedRoute>
  );
}
