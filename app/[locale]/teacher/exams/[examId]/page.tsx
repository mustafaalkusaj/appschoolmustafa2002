"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useParams } from "next/navigation";
import { ClipboardList, Edit, ArrowRight, Clock, Users } from "lucide-react";
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

interface ExamDetail {
  id: string;
  title: string;
  subject: string | null;
  class_name: string | null;
  starts_at: string;
  duration_minutes: number | null;
  type: string | null;
  status: string | null;
  description: string | null;
  questions: ExamQuestion[];
}

interface ExamQuestion {
  id: string;
  question_text: string;
  question_type: string | null;
  points: number | null;
  order: number | null;
}

const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  quiz: { ar: "اختبار قصير", en: "Quiz" },
  midterm: { ar: "نصف السنة", en: "Midterm" },
  final: { ar: "نهائي", en: "Final" },
};

export default function TeacherExamDetailPage() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const examId = params?.examId as string;
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!examId) return;
    fetchJsonWithAuthorizedSession(`/api/teacher/exams/${examId}`)
      .then((res) => {
        if (res.response.ok) {
          const payload = res.payload as { data: ExamDetail } | null;
          setExam(payload?.data ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [examId]);

  return (
    <TeacherShell
      currentPath="/teacher/exams"
      titleAr="تفاصيل الامتحان"
      titleEn="Exam Details"
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
      <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="space-y-4">
            <div className="h-40 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
            <div className="h-24 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
          </div>
        ) : !exam ? (
          <EmptyState
            icon={
              <ClipboardList className="h-12 w-12 text-[var(--text-tertiary)]" />
            }
            title={t("الامتحان غير موجود", "Exam not found")}
            description={t(
              "لم يتم العثور على هذا الامتحان",
              "This exam could not be found",
            )}
          />
        ) : (
          <>
            {/* Exam Info */}
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg">
                      {exam.title}
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
                      {exam.class_name && <span>{exam.class_name} · </span>}
                      {exam.subject && <span>{exam.subject}</span>}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      router.push(`/${locale}/teacher/exams/${exam.id}/edit`)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--card-radius)] border border-[var(--card-border)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-strong)] transition-colors"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    {t("تعديل", "Edit")}
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[var(--text-muted)]" />
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">
                        {t("التاريخ", "Date")}
                      </p>
                      <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                        {exam.starts_at}
                      </p>
                    </div>
                  </div>

                  {exam.duration_minutes && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[var(--text-muted)]" />
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">
                          {t("المدة", "Duration")}
                        </p>
                        <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                          {exam.duration_minutes} {t("دقيقة", "min")}
                        </p>
                      </div>
                    </div>
                  )}

                  {exam.type && (
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-[var(--text-muted)]" />
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">
                          {t("النوع", "Type")}
                        </p>
                        <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                          {TYPE_LABELS[exam.type]?.[isAr ? "ar" : "en"] ??
                            exam.type}
                        </p>
                      </div>
                    </div>
                  )}

                  {exam.status && (
                    <div>
                      <p className="text-xs text-[var(--text-muted)] mb-1">
                        {t("الحالة", "Status")}
                      </p>
                      <Badge
                        variant={
                          exam.status === "published"
                            ? "success"
                            : exam.status === "draft"
                              ? "warning"
                              : "info"
                        }
                        size="sm"
                      >
                        {exam.status === "published"
                          ? t("منشور", "Published")
                          : exam.status === "draft"
                            ? t("مسودة", "Draft")
                            : exam.status === "completed"
                              ? t("مكتمل", "Completed")
                              : exam.status}
                      </Badge>
                    </div>
                  )}
                </div>

                {exam.description && (
                  <p className="text-sm text-[var(--text-secondary)] mt-4">
                    {exam.description}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Questions */}
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" style={{ color: "#8b5cf6" }} />
                  <CardTitle className="text-sm sm:text-base">
                    {t("الأسئلة", "Questions")} (
                    {exam.questions?.length ?? 0})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {!exam.questions || exam.questions.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] text-center py-6">
                    {t(
                      "لا توجد أسئلة مضافة بعد",
                      "No questions added yet",
                    )}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {exam.questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="rounded-xl border border-[var(--card-border)] p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                              <span className="text-[var(--text-muted)]">
                                {idx + 1}.{" "}
                              </span>
                              {q.question_text}
                            </p>
                            {q.question_type && (
                              <p className="text-xs text-[var(--text-muted)] mt-1">
                                {q.question_type}
                              </p>
                            )}
                          </div>
                          {q.points != null && (
                            <Badge variant="info" size="sm">
                              {q.points} {t("درجة", "pts")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </TeacherShell>
  );
}
