"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Clock,
  CalendarCheck,
  Filter,
  Save,
  Loader2,
} from "lucide-react";
import { TeacherShell } from "@/components/TeacherShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface StudentAttendance {
  student_id: string;
  full_name: string;
  status: AttendanceStatus;
}

const STATUS_OPTIONS: Array<{
  value: AttendanceStatus;
  ar: string;
  en: string;
  variant: "success" | "danger" | "warning" | "info";
  icon: typeof CheckCircle2;
}> = [
  { value: "present", ar: "حاضر", en: "Present", variant: "success", icon: CheckCircle2 },
  { value: "absent", ar: "غائب", en: "Absent", variant: "danger", icon: XCircle },
  { value: "late", ar: "متأخر", en: "Late", variant: "warning", icon: Clock },
  { value: "excused", ar: "إجازة", en: "Excused", variant: "info", icon: CalendarCheck },
];

export default function TeacherAttendancePage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [classNames, setClassNames] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [classesLoading, setClassesLoading] = useState(true);

  // Load class names on mount
  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/teacher/classes")
      .then((res) => {
        if (res.response.ok) {
          const cls = (res.payload as any)?.data?.classes ?? [];
          const names = cls.map((c: any) => c.class_name as string);
          setClassNames(names);
          if (names.length > 0 && !selectedClass) setSelectedClass(names[0]);
        }
      })
      .catch(() => {})
      .finally(() => setClassesLoading(false));
  }, []);

  // Fetch attendance when class or date changes
  const fetchAttendance = useCallback(() => {
    if (!selectedClass || !selectedDate) return;
    setLoading(true);
    setSaveMsg(null);
    fetchJsonWithAuthorizedSession(
      `/api/teacher/attendance?class_name=${encodeURIComponent(selectedClass)}&date=${selectedDate}`,
    )
      .then((res) => {
        if (res.response.ok) {
          setStudents((res.payload as any)?.data?.students ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClass, selectedDate]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  function updateStatus(studentId: string, status: AttendanceStatus) {
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === studentId ? { ...s, status } : s,
      ),
    );
  }

  async function handleSave() {
    if (!selectedClass || !selectedDate || students.length === 0) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/teacher/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_name: selectedClass,
          date: selectedDate,
          records: students.map((s) => ({
            student_id: s.student_id,
            status: s.status,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSaveMsg({ type: "success", text: t("تم حفظ الحضور بنجاح", "Attendance saved successfully") });
      } else {
        setSaveMsg({ type: "error", text: data.error ?? t("حدث خطأ", "Something went wrong") });
      }
    } catch {
      setSaveMsg({ type: "error", text: t("خطأ في الاتصال", "Connection error") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <TeacherShell
      currentPath="/teacher/attendance"
      titleAr="الحضور"
      titleEn="Attendance"
    >
      <div className="space-y-4 max-w-3xl mx-auto">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Filter className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={classesLoading}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-soft)] ps-9 pe-8 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all appearance-none"
            >
              {classesLoading ? (
                <option>{t("جاري التحميل...", "Loading...")}</option>
              ) : classNames.length === 0 ? (
                <option>{t("لا توجد صفوف", "No classes")}</option>
              ) : (
                classNames.map((cn) => (
                  <option key={cn} value={cn}>
                    {cn}
                  </option>
                ))
              )}
            </select>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
          />
        </div>

        {/* Student attendance list */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-[56px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse"
              />
            ))}
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck className="h-12 w-12 text-[var(--text-tertiary)]" />}
            title={t("لا يوجد طلاب لهذا الصف", "No students for this class")}
          />
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5 text-[var(--primary)]" />
                    <CardTitle className="text-sm sm:text-base">
                      {selectedClass} · {selectedDate}
                    </CardTitle>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {students.length} {t("طالب", "students")}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {students.map((student) => (
                    <div
                      key={student.student_id}
                      className="flex items-center gap-2 sm:gap-3 rounded-lg border border-[var(--card-border)] p-2.5 sm:p-3"
                    >
                      <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[var(--primary)]/[0.1]">
                        <span className="text-[10px] font-bold text-[var(--primary)]">
                          {student.full_name
                            .split(" ")
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join("")}
                        </span>
                      </div>
                      <p className="flex-1 min-w-0 text-xs sm:text-sm font-medium text-[var(--text-primary)] truncate">
                        {student.full_name}
                      </p>
                      <div className="flex gap-1">
                        {STATUS_OPTIONS.map((opt) => {
                          const isSelected = student.status === opt.value;
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                updateStatus(student.student_id, opt.value)
                              }
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                                isSelected
                                  ? `bg-[var(--${opt.variant})]/[0.15] text-[var(--${opt.variant})] ring-1 ring-[var(--${opt.variant})]/30`
                                  : "bg-[var(--surface-soft)] text-[var(--text-muted)] hover:bg-[var(--surface-strong)]"
                              }`}
                              title={isAr ? opt.ar : opt.en}
                            >
                              <Icon className="h-3 w-3" />
                              <span className="hidden sm:inline">
                                {isAr ? opt.ar : opt.en}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Save button & message */}
            {saveMsg && (
              <p
                className={`text-xs rounded-lg px-3 py-2 ${
                  saveMsg.type === "success"
                    ? "text-[var(--success)] bg-[var(--success)]/[0.08]"
                    : "text-[var(--danger)] bg-[var(--danger)]/[0.08]"
                }`}
              >
                {saveMsg.text}
              </p>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving
                ? t("جاري الحفظ...", "Saving...")
                : t("حفظ الحضور", "Save Attendance")}
            </button>
          </>
        )}
      </div>
    </TeacherShell>
  );
}
