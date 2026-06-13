"use client";
import { useEffect, useRef } from "react";
import type { TeacherEvaluation } from "../../../_hooks/useTeacherProfile";

interface Props {
  evaluations: TeacherEvaluation[];
  evaluationsLoading: boolean;
  fetchEvaluations: () => Promise<void>;
  locale: "ar" | "en";
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-[var(--text-muted)]">—</span>;
  const color =
    score >= 8
      ? "bg-green-100 text-green-800 border-green-200"
      : score >= 6
      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
      : "bg-red-100 text-red-700 border-red-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {score}
    </span>
  );
}

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  const pct = score != null ? Math.min(100, (score / 10) * 100) : 0;
  const barColor =
    score == null
      ? "bg-gray-200"
      : score >= 8
      ? "bg-green-500"
      : score >= 6
      ? "bg-yellow-500"
      : "bg-red-500";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--text-muted)]">{label}</span>
        <ScoreBadge score={score} />
      </div>
      <div className="h-1.5 bg-[var(--surface-soft)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function PerformanceTab({ evaluations, evaluationsLoading, fetchEvaluations, locale }: Props) {
  const isEn = locale === "en";
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      void fetchEvaluations();
    }
  }, [fetchEvaluations]);

  if (evaluationsLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">{isEn ? "Loading evaluations..." : "جاري تحميل التقييمات..."}</span>
        </div>
      </div>
    );
  }

  if (evaluations.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-sm p-8 flex flex-col items-center gap-3">
        <span className="text-4xl">📊</span>
        <p className="text-[var(--text-muted)] text-sm">
          {isEn ? "No evaluations found." : "لا توجد تقييمات مسجلة."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {evaluations.map((ev) => (
        <div
          key={ev.id}
          className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-sm p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[var(--text-primary)]">
                {new Date(ev.evaluation_date).toLocaleDateString(isEn ? "en-GB" : "ar-IQ-u-nu-latn", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              {ev.overall_grade && (
                <span className="inline-flex items-center rounded-full border border-[var(--card-border)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-primary)]">
                  {ev.overall_grade}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">{isEn ? "Overall" : "الإجمالي"}</span>
              <ScoreBadge score={ev.overall_score} />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <ScoreBar
              label={isEn ? "Discipline" : "الانضباط"}
              score={ev.discipline_score}
            />
            <ScoreBar
              label={isEn ? "Curriculum" : "المنهج"}
              score={ev.curriculum_score}
            />
            <ScoreBar
              label={isEn ? "Student Results" : "نتائج الطلاب"}
              score={ev.student_results_score}
            />
            <ScoreBar
              label={isEn ? "Cooperation" : "التعاون"}
              score={ev.cooperation_score}
            />
          </div>

          {ev.notes && (
            <p className="mt-3 text-xs text-[var(--text-muted)] border-t border-[var(--card-border)] pt-3">
              {ev.notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
