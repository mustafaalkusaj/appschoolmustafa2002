"use client";

import { useEffect, useState } from "react";
import { usePathname, useParams, useRouter } from "next/navigation";
import {
  GraduationCap,
  CalendarDays,
  Clock,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Play,
  Trophy,
  AlertCircle,
} from "lucide-react";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ExamDetail {
  id: string;
  title: string;
  type: string | null;
  subject: string | null;
  total_marks: number | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string | null;
  description: string | null;
}

export default function ExamDetailPage() {
  const pathname = usePathname();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const BackArrow = isAr ? ArrowLeft : ArrowRight;

  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [hasAttempt, setHasAttempt] = useState(false);
  const [attemptStatus, setAttemptStatus] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession(`/api/student/exams/${id}`)
      .then((res) => {
        if (res.response.ok) {
          const payload = res.payload as {
            data: {
              exam: ExamDetail;
              hasAttempt: boolean;
              attemptStatus: string | null;
              score: number | null;
            };
          };
          setExam(payload.data.exam);
          setHasAttempt(payload.data.hasAttempt);
          setAttemptStatus(payload.data.attemptStatus);
          setScore(payload.data.score);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const now = new Date();
  const startsAt = exam?.starts_at ? new Date(exam.starts_at) : null;
  const endsAt = exam?.ends_at ? new Date(exam.ends_at) : null;
  const isWithinWindow =
    startsAt && endsAt ? now >= startsAt && now <= endsAt : false;
  const isUpcoming = startsAt ? now < startsAt : false;
  const isEnded = endsAt ? now > endsAt : false;

  function formatDateTime(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(isAr ? "ar" : "en", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function getTimeLimitLabel() {
    if (!startsAt || !endsAt) return null;
    const diffMin = Math.floor(
      (endsAt.getTime() - startsAt.getTime()) / 60000,
    );
    if (diffMin < 60) return `${diffMin} ${t("دقيقة", "min")}`;
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return m > 0
      ? `${h} ${t("ساعة", "hr")} ${m} ${t("دقيقة", "min")}`
      : `${h} ${t("ساعة", "hr")}`;
  }

  return (
    <StudentShell
      currentPath="/student/exams"
      titleAr="تفاصيل الامتحان"
      titleEn="Exam Details"
    >
      <div className="max-w-3xl mx-auto space-y-5">
        {/* back link */}
        <a
          href={`/${locale}/student/exams`}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--primary)] hover:underline"
        >
          <BackArrow className="h-4 w-4" />
          {t("العودة للامتحانات", "Back to exams")}
        </a>

        {loading ? (
          <div className="space-y-4">
            <div className="h-48 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
          </div>
        ) : !exam ? (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center">
              <GraduationCap className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-muted)]">
                {t("الامتحان غير موجود", "Exam not found")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ── Exam info ── */}
            <Card className="rounded-2xl">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                    {exam.title}
                  </h2>
                  <Badge
                    variant={
                      isWithinWindow
                        ? "success"
                        : isUpcoming
                          ? "info"
                          : "neutral"
                    }
                    size="sm"
                  >
                    {isWithinWindow
                      ? t("جارٍ الآن", "Active")
                      : isUpcoming
                        ? t("قادم", "Upcoming")
                        : t("انتهى", "Ended")}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {exam.subject && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-secondary)]">
                        {exam.subject}
                      </span>
                    </div>
                  )}
                  {exam.total_marks != null && (
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-secondary)]">
                        {t("الدرجة الكلية:", "Total marks:")}{" "}
                        {exam.total_marks}
                      </span>
                    </div>
                  )}
                  {getTimeLimitLabel() && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-secondary)]">
                        {getTimeLimitLabel()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[var(--text-muted)]">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {t("يبدأ:", "Starts:")}{" "}
                    {formatDateTime(exam.starts_at)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {t("ينتهي:", "Ends:")}{" "}
                    {formatDateTime(exam.ends_at)}
                  </div>
                </div>

                {exam.description && (
                  <div className="rounded-xl bg-[var(--surface-soft)] p-4">
                    <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                      {exam.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Action section ── */}
            <Card className="rounded-2xl">
              <CardContent className="p-5 sm:p-6">
                {attemptStatus === "completed" ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <Trophy className="h-10 w-10 text-[var(--success)]" />
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {t("أكملت الامتحان", "Exam completed")}
                    </p>
                    {score != null && exam.total_marks != null && (
                      <p className="text-2xl font-bold text-[var(--primary)]">
                        {score} / {exam.total_marks}
                      </p>
                    )}
                    <button
                      onClick={() =>
                        router.push(
                          `/${locale}/student/exams/${id}/results`,
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                    >
                      {t("عرض النتائج", "View results")}
                    </button>
                  </div>
                ) : attemptStatus === "in_progress" ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <AlertCircle className="h-10 w-10 text-[var(--warning)]" />
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {t(
                        "لديك محاولة قيد التقدم",
                        "You have an attempt in progress",
                      )}
                    </p>
                    <button
                      onClick={() =>
                        router.push(
                          `/${locale}/student/exams/${id}/take`,
                        )
                      }
                      disabled={!isWithinWindow}
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--warning)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <Play className="h-4 w-4" />
                      {t("أكمل الامتحان", "Continue Exam")}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <GraduationCap className="h-10 w-10 text-[var(--primary)]" />
                    {isWithinWindow ? (
                      <>
                        <p className="text-sm text-[var(--text-secondary)] text-center">
                          {t(
                            "أنت مستعد لبدء الامتحان. بمجرد البدء، سيبدأ العد التنازلي.",
                            "You are ready to start. Once you begin, the timer will start.",
                          )}
                        </p>
                        <button
                          onClick={() =>
                            router.push(
                              `/${locale}/student/exams/${id}/take`,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                        >
                          <Play className="h-4 w-4" />
                          {t("ابدأ الامتحان", "Start Exam")}
                        </button>
                      </>
                    ) : isUpcoming ? (
                      <p className="text-sm text-[var(--text-muted)] text-center">
                        {t(
                          "الامتحان لم يبدأ بعد. يرجى العودة في الموعد المحدد.",
                          "The exam has not started yet. Please come back at the scheduled time.",
                        )}
                      </p>
                    ) : (
                      <p className="text-sm text-[var(--text-muted)] text-center">
                        {t(
                          "انتهى وقت الامتحان.",
                          "The exam time has ended.",
                        )}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </StudentShell>
  );
}
