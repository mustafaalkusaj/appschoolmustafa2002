"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Save, ArrowRight } from "lucide-react";
import { TeacherShell } from "@/components/TeacherShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { Card, CardContent } from "@/components/ui/card";

export default function TeacherNewExamPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [type, setType] = useState("quiz");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startsAt) {
      setError(t("يرجى ملء الحقول المطلوبة", "Please fill required fields"));
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetchJsonWithAuthorizedSession("/api/teacher/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subject: subject.trim() || null,
          class_name: className.trim() || null,
          starts_at: startsAt,
          duration_minutes: durationMinutes ? Number(durationMinutes) : null,
          type,
        }),
      });

      if (res.response.ok) {
        router.push(`/${locale}/teacher/exams`);
      } else {
        const payload = res.payload as { error?: string } | null;
        setError(payload?.error ?? t("حدث خطأ", "An error occurred"));
      }
    } catch {
      setError(t("حدث خطأ في الاتصال", "Connection error"));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2.5 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--primary)] transition-shadow";

  const labelClass = "block text-sm font-medium text-[var(--text-primary)] mb-1.5";

  return (
    <TeacherShell
      currentPath="/teacher/exams"
      titleAr="امتحان جديد"
      titleEn="New Exam"
      actions={
        <button
          onClick={() => router.push(`/${locale}/teacher/exams`)}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowRight className="h-4 w-4" />
          {t("الرجوع", "Back")}
        </button>
      }
    >
      <div className="max-w-2xl mx-auto">
        <Card className="rounded-2xl">
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-[var(--card-radius)] bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className={labelClass}>
                  {t("عنوان الامتحان", "Exam Title")} *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("أدخل عنوان الامتحان", "Enter exam title")}
                  className={inputClass}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    {t("المادة", "Subject")}
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t("مثال: الرياضيات", "e.g. Mathematics")}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    {t("الصف", "Class")}
                  </label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder={t("مثال: الصف الأول", "e.g. Grade 1")}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    {t("تاريخ ووقت البدء", "Start Date & Time")} *
                  </label>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    {t("المدة (بالدقائق)", "Duration (minutes)")}
                  </label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    placeholder={t("مثال: 60", "e.g. 60")}
                    min="1"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  {t("نوع الامتحان", "Exam Type")}
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={inputClass}
                >
                  <option value="quiz">{t("اختبار قصير", "Quiz")}</option>
                  <option value="midterm">{t("نصف السنة", "Midterm")}</option>
                  <option value="final">{t("نهائي", "Final")}</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-[var(--card-radius)] bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {submitting
                    ? t("جاري الحفظ...", "Saving...")
                    : t("حفظ الامتحان", "Save Exam")}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </TeacherShell>
  );
}
