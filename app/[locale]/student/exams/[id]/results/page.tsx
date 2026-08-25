"use client";

import { useEffect, useState } from "react";
import { usePathname, useParams } from "next/navigation";
import {
  Trophy,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuestionResult {
  questionId: string;
  prompt: string;
  type: string;
  options: string[] | null;
  correctAnswer: unknown;
  explanation: string | null;
  studentAnswer: unknown;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
}

interface ExamResults {
  examTitle: string;
  examSubject: string | null;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  timeSpent: number;
  submittedAt: string | null;
  breakdown: QuestionResult[];
}

export default function ExamResultsPage() {
  const pathname = usePathname();
  const { id } = useParams<{ id: string }>();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const BackArrow = isAr ? ArrowLeft : ArrowRight;

  const [results, setResults] = useState<ExamResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession(`/api/student/exams/${id}/results`)
      .then((res) => {
        if (res.response.ok) {
          const payload = res.payload as { data: ExamResults };
          setResults(payload.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0 && s > 0) return `${m} ${t("دقيقة", "min")} ${s} ${t("ثانية", "sec")}`;
    if (m > 0) return `${m} ${t("دقيقة", "min")}`;
    return `${s} ${t("ثانية", "sec")}`;
  }

  /* SVG score ring */
  function ScoreRing({
    percentage,
    passed,
  }: {
    percentage: number;
    passed: boolean;
  }) {
    const RADIUS = 54;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
    const offset = CIRCUMFERENCE - (percentage / 100) * CIRCUMFERENCE;
    const color = passed ? "var(--success)" : "var(--danger)";

    return (
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="var(--surface-soft)"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-bold"
            style={{ color }}
          >
            {percentage}%
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            {passed ? t("ناجح", "Passed") : t("راسب", "Failed")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <StudentShell
      currentPath="/student/exams"
      titleAr="نتائج الامتحان"
      titleEn="Exam Results"
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
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
          </div>
        ) : !results ? (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center">
              <Trophy className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-muted)]">
                {t("لا توجد نتائج", "No results found")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ── Score overview ── */}
            <Card className="rounded-2xl">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col items-center gap-4">
                  <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                    {results.examTitle}
                  </h2>
                  {results.examSubject && (
                    <span className="text-xs text-[var(--text-muted)]">
                      {results.examSubject}
                    </span>
                  )}

                  <ScoreRing
                    percentage={results.percentage}
                    passed={results.passed}
                  />

                  <p className="text-xl font-bold text-[var(--text-primary)]">
                    {results.score} / {results.totalMarks}
                  </p>

                  <Badge
                    variant={results.passed ? "success" : "danger"}
                    size="sm"
                  >
                    {results.passed ? t("ناجح", "Passed") : t("راسب", "Failed")}
                  </Badge>

                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <Clock className="h-3.5 w-3.5" />
                    {t("الوقت المستغرق:", "Time spent:")}{" "}
                    {formatDuration(results.timeSpent)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Question breakdown ── */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {t("تفاصيل الأسئلة", "Question breakdown")}
              </h3>

              {results.breakdown.map((q, i) => (
                <Card
                  key={q.questionId}
                  className="rounded-2xl"
                  style={{
                    borderColor: q.isCorrect
                      ? "color-mix(in srgb, var(--success) 30%, transparent)"
                      : "color-mix(in srgb, var(--danger) 30%, transparent)",
                  }}
                >
                  <CardContent className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        {q.isCorrect ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--success)] mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 shrink-0 text-[var(--danger)] mt-0.5" />
                        )}
                        <div>
                          <p className="text-xs text-[var(--text-muted)] mb-1">
                            {t("سؤال", "Question")} {i + 1}
                          </p>
                          <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                            {q.prompt}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-semibold rounded-lg px-2 py-1"
                        style={{
                          backgroundColor: q.isCorrect
                            ? "color-mix(in srgb, var(--success) 10%, transparent)"
                            : "color-mix(in srgb, var(--danger) 10%, transparent)",
                          color: q.isCorrect ? "var(--success)" : "var(--danger)",
                        }}
                      >
                        {q.marksAwarded}/{q.maxMarks}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs ps-7">
                      <div>
                        <span className="text-[var(--text-muted)]">
                          {t("إجابتك:", "Your answer:")}
                        </span>{" "}
                        <span
                          className="font-medium"
                          style={{
                            color: q.isCorrect
                              ? "var(--success)"
                              : "var(--danger)",
                          }}
                        >
                          {q.studentAnswer != null
                            ? String(q.studentAnswer)
                            : t("لم تجب", "No answer")}
                        </span>
                      </div>
                      {!q.isCorrect && (
                        <div>
                          <span className="text-[var(--text-muted)]">
                            {t("الإجابة الصحيحة:", "Correct answer:")}
                          </span>{" "}
                          <span className="font-medium text-[var(--success)]">
                            {q.correctAnswer != null
                              ? String(q.correctAnswer)
                              : "—"}
                          </span>
                        </div>
                      )}
                    </div>

                    {q.explanation && (
                      <div className="rounded-lg bg-[var(--surface-soft)] p-3 ms-7">
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </StudentShell>
  );
}
