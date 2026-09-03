"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, Plus, Calendar } from "lucide-react";
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

interface Exam {
  id: string;
  title: string;
  subject: string | null;
  class_name: string | null;
  starts_at: string;
  duration_minutes: number | null;
  type: string | null;
  status: string | null;
}

const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  quiz: { ar: "اختبار قصير", en: "Quiz" },
  midterm: { ar: "نصف السنة", en: "Midterm" },
  final: { ar: "نهائي", en: "Final" },
};

function getStatusVariant(status: string | null): "success" | "warning" | "info" | "danger" {
  switch (status) {
    case "published":
      return "success";
    case "draft":
      return "warning";
    case "completed":
      return "info";
    default:
      return "info";
  }
}

export default function TeacherExamsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/teacher/exams")
      .then((res) => {
        if (res.response.ok)
          setExams(((res.payload as { data: Exam[] })?.data ?? []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <TeacherShell
      currentPath="/teacher/exams"
      titleAr="الامتحانات"
      titleEn="Exams"
      actions={
        <button
          onClick={() => router.push(`/${locale}/teacher/exams/new`)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--card-radius)] bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          {t("اضافة امتحان", "Add Exam")}
        </button>
      }
    >
      <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl sm:rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse"
              />
            ))}
          </div>
        ) : exams.length === 0 ? (
          <EmptyState
            icon={
              <ClipboardList className="h-12 w-12 text-[var(--text-tertiary)]" />
            }
            title={t("لا توجد امتحانات", "No exams")}
            description={t(
              "لم تقم باضافة اي امتحان بعد",
              "You haven't added any exams yet",
            )}
          />
        ) : (
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" style={{ color: "#8b5cf6" }} />
                <CardTitle className="text-sm sm:text-base">
                  {t("جميع الامتحانات", "All Exams")} ({exams.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {exams.map((exam) => {
                  const typeLabel = exam.type
                    ? TYPE_LABELS[exam.type]?.[isAr ? "ar" : "en"] ?? exam.type
                    : null;

                  return (
                    <button
                      key={exam.id}
                      onClick={() =>
                        router.push(`/${locale}/teacher/exams/${exam.id}`)
                      }
                      className="w-full rounded-xl border border-[var(--card-border)] p-4 hover:bg-[var(--surface-strong)] active:scale-[0.98] transition-all text-start"
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                            {exam.title}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            {exam.class_name && (
                              <span>{exam.class_name} · </span>
                            )}
                            {exam.subject && <span>{exam.subject} · </span>}
                            {typeLabel && <span>{typeLabel} · </span>}
                            {exam.starts_at}
                            {exam.duration_minutes && (
                              <span>
                                {" "}
                                · {exam.duration_minutes} {t("دقيقة", "min")}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {exam.status && (
                            <Badge
                              variant={getStatusVariant(exam.status)}
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
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TeacherShell>
  );
}
