"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart3,
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

interface StudentGrade {
  student_id: string;
  full_name: string;
  score: number | null;
  max_score: number;
}

interface GradeData {
  students: StudentGrade[];
  class_names: string[];
  subjects: string[];
}

export default function TeacherGradesPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [data, setData] = useState<GradeData | null>(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Initial load to get class names and subjects
  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/teacher/grades")
      .then((res) => {
        if (res.response.ok) {
          const d = (res.payload as any)?.data as GradeData | undefined;
          if (d) {
            setData(d);
            setStudents(d.students ?? []);
            if (d.class_names.length > 0 && !selectedClass) setSelectedClass(d.class_names[0]);
            if (d.subjects.length > 0 && !selectedSubject) setSelectedSubject(d.subjects[0]);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Refetch when filters change
  useEffect(() => {
    if (!selectedClass && !selectedSubject) return;
    setLoading(true);
    setSaveMsg(null);
    const params = new URLSearchParams();
    if (selectedClass) params.set("class_name", selectedClass);
    if (selectedSubject) params.set("subject", selectedSubject);
    fetchJsonWithAuthorizedSession(`/api/teacher/grades?${params.toString()}`)
      .then((res) => {
        if (res.response.ok) {
          const d = (res.payload as any)?.data;
          setStudents(d?.students ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClass, selectedSubject]);

  function updateScore(studentId: string, score: number | null) {
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === studentId ? { ...s, score } : s,
      ),
    );
  }

  async function handleSave() {
    if (students.length === 0) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/teacher/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_name: selectedClass,
          subject: selectedSubject,
          grades: students
            .filter((s) => s.score != null)
            .map((s) => ({
              student_id: s.student_id,
              score: s.score,
              max_score: s.max_score,
            })),
        }),
      });
      const payload = await res.json();
      if (res.ok && payload.ok) {
        setSaveMsg({ type: "success", text: t("تم حفظ الدرجات بنجاح", "Grades saved successfully") });
      } else {
        setSaveMsg({ type: "error", text: payload.error ?? t("حدث خطأ", "Something went wrong") });
      }
    } catch {
      setSaveMsg({ type: "error", text: t("خطأ في الاتصال", "Connection error") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <TeacherShell
      currentPath="/teacher/grades"
      titleAr="الدرجات"
      titleEn="Grades"
    >
      <div className="space-y-4 max-w-3xl mx-auto">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Filter className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-soft)] ps-9 pe-8 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all appearance-none"
            >
              <option value="">{t("اختر الصف", "Select Class")}</option>
              {(data?.class_names ?? []).map((cn) => (
                <option key={cn} value={cn}>
                  {cn}
                </option>
              ))}
            </select>
          </div>
          <div className="relative flex-1">
            <BarChart3 className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-soft)] ps-9 pe-8 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all appearance-none"
            >
              <option value="">{t("اختر المادة", "Select Subject")}</option>
              {(data?.subjects ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Grades table */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[56px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse"
              />
            ))}
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            icon={<BarChart3 className="h-12 w-12 text-[var(--text-tertiary)]" />}
            title={t("لا يوجد طلاب لعرض الدرجات", "No students to show grades")}
          />
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-[var(--primary)]" />
                    <CardTitle className="text-sm sm:text-base">
                      {t("درجات الطلاب", "Student Grades")}
                    </CardTitle>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {students.length} {t("طالب", "students")}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {students.map((student) => {
                    const pct =
                      student.score != null && student.max_score > 0
                        ? Math.round((student.score / student.max_score) * 100)
                        : null;
                    return (
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
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            min={0}
                            max={student.max_score}
                            value={student.score ?? ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? null : Number(e.target.value);
                              updateScore(student.student_id, val);
                            }}
                            placeholder="—"
                            className="w-16 rounded-lg border border-[var(--card-border)] bg-[var(--surface-soft)] px-2 py-1.5 text-center text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                          />
                          <span className="text-xs text-[var(--text-muted)]">
                            / {student.max_score}
                          </span>
                          {pct != null && (
                            <Badge
                              variant={
                                pct >= 80
                                  ? "success"
                                  : pct >= 50
                                    ? "warning"
                                    : "danger"
                              }
                              size="sm"
                            >
                              {pct}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

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
                : t("حفظ الدرجات", "Save Grades")}
            </button>
          </>
        )}
      </div>
    </TeacherShell>
  );
}
