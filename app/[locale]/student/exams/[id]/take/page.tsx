"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useParams, useRouter } from "next/navigation";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { Card, CardContent } from "@/components/ui/card";

interface Question {
  id: string;
  prompt: string;
  type: string;
  options: string[] | null;
  marks: number;
}

export default function TakeExamPage() {
  const pathname = usePathname();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [endsAt, setEndsAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submittedRef = useRef(false);
  const answersRef = useRef<Record<string, unknown>>({});
  const currentIdxRef = useRef(0);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    currentIdxRef.current = currentIdx;
  }, [currentIdx]);

  /* ── start / resume exam ── */
  useEffect(() => {
    fetchJsonWithAuthorizedSession(`/api/student/exams/${id}/start`, {
      method: "POST",
    })
      .then(async (res) => {
        if (res.response.ok) {
          const payload = res.payload as {
            data: {
              attemptId: string;
              questions: Question[];
              endsAt: string;
            };
          };
          setAttemptId(payload.data.attemptId);
          setQuestions(payload.data.questions);
          setEndsAt(new Date(payload.data.endsAt));

          /* resume any previously autosaved draft for this attempt */
          try {
            const draftRes = await fetchJsonWithAuthorizedSession(
              `/api/student/exams/${id}/autosave?attemptId=${payload.data.attemptId}`,
            );
            if (draftRes.response.ok) {
              const draftPayload = draftRes.payload as {
                data?: {
                  draft?: {
                    answers: Array<{ questionId?: string; question_id?: string; answer: unknown }>;
                    currentIndex?: number;
                  } | null;
                };
              };
              const draft = draftPayload.data?.draft;
              if (draft?.answers?.length) {
                const restored: Record<string, unknown> = {};
                for (const a of draft.answers) {
                  const qid = a.questionId ?? a.question_id;
                  if (qid) restored[qid] = a.answer;
                }
                setAnswers(restored);
              }
              if (typeof draft?.currentIndex === "number") {
                setCurrentIdx(draft.currentIndex);
              }
            }
          } catch {
            /* resuming a draft is a convenience — ignore failures */
          }
        } else {
          const p = res.payload as { error?: string };
          setError(p.error ?? "start_failed");
        }
      })
      .catch(() => setError("network_error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── periodic autosave ── */
  useEffect(() => {
    if (!attemptId) return;
    const iv = setInterval(() => {
      if (submittedRef.current) return;
      const currentAnswers = answersRef.current;
      const answerList = Object.entries(currentAnswers).map(
        ([questionId, answer]) => ({ questionId, answer }),
      );
      if (answerList.length === 0) return;
      fetchJsonWithAuthorizedSession(`/api/student/exams/${id}/autosave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          answers: answerList,
          currentIndex: currentIdxRef.current,
        }),
      }).catch(() => {
        /* best-effort autosave; the final /submit call is authoritative */
      });
    }, 20_000);
    return () => clearInterval(iv);
  }, [attemptId, id]);

  /* ── integrity signals: tab switch / focus loss ── */
  useEffect(() => {
    if (!attemptId) return;
    const reportIntegrityEvent = (eventType: string) => {
      if (submittedRef.current) return;
      fetchJsonWithAuthorizedSession(`/api/student/exams/${id}/integrity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, eventType }),
      }).catch(() => {
        /* integrity logging is best-effort and must never block the exam */
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        reportIntegrityEvent("tab_change");
      }
    };
    const handleBlur = () => reportIntegrityEvent("focus_lost");

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [attemptId, id]);

  /* ── countdown timer ── */
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.floor((endsAt.getTime() - Date.now()) / 1000),
      );
      setTimeLeft(remaining);
      if (remaining <= 0 && !submittedRef.current) {
        handleSubmit();
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);

  /* ── submit handler ── */
  const handleSubmit = useCallback(async () => {
    if (submittedRef.current || !attemptId) return;
    submittedRef.current = true;
    setSubmitting(true);
    setShowConfirm(false);

    try {
      const res = await fetchJsonWithAuthorizedSession(
        `/api/student/exams/${id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId, answers }),
        },
      );

      if (res.response.ok) {
        router.replace(`/${locale}/student/exams/${id}/results`);
      } else {
        submittedRef.current = false;
        setSubmitting(false);
        const p = res.payload as { error?: string };
        setError(p.error ?? "submit_failed");
      }
    } catch {
      submittedRef.current = false;
      setSubmitting(false);
      setError("network_error");
    }
  }, [attemptId, answers, id, locale, router]);

  function setAnswer(questionId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  const question = questions[currentIdx] ?? null;
  const answeredCount = Object.keys(answers).length;
  const isUrgent = timeLeft != null && timeLeft < 300;

  return (
    <StudentShell
      currentPath="/student/exams"
      titleAr="الامتحان"
      titleEn="Exam"
    >
      <div className="max-w-3xl mx-auto space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
          </div>
        ) : error ? (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center space-y-3">
              <AlertTriangle className="h-10 w-10 text-[var(--danger)] mx-auto" />
              <p className="text-sm text-[var(--text-secondary)]">
                {error === "already_completed"
                  ? t("لقد أكملت هذا الامتحان مسبقاً", "You already completed this exam")
                  : error === "exam_ended"
                    ? t("انتهى وقت الامتحان", "The exam time has ended")
                    : error === "exam_not_started"
                      ? t("لم يبدأ الامتحان بعد", "The exam has not started yet")
                      : t("حدث خطأ", "An error occurred")}
              </p>
              <a
                href={`/${locale}/student/exams`}
                className="inline-block text-sm text-[var(--primary)] hover:underline mt-2"
              >
                {t("العودة للامتحانات", "Back to exams")}
              </a>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ── Timer bar ── */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between rounded-xl px-4 py-2.5 border"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: isUrgent
                  ? "var(--danger)"
                  : "var(--card-border)",
              }}
            >
              <span className="text-xs text-[var(--text-muted)]">
                {answeredCount}/{questions.length}{" "}
                {t("أجبت", "answered")}
              </span>
              <div
                className="flex items-center gap-1.5 font-mono text-sm font-bold"
                style={{
                  color: isUrgent ? "var(--danger)" : "var(--text-primary)",
                }}
              >
                <Clock className="h-4 w-4" />
                {timeLeft != null ? formatTime(timeLeft) : "--:--"}
              </div>
            </div>

            {/* ── Question pills ── */}
            <div className="flex flex-wrap gap-2">
              {questions.map((q, i) => {
                const answered = answers[q.id] != null;
                const active = i === currentIdx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(i)}
                    className="w-9 h-9 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: active
                        ? "var(--primary)"
                        : answered
                          ? "var(--success)"
                          : "var(--surface-soft)",
                      color: active || answered ? "#fff" : "var(--text-muted)",
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            {/* ── Current question ── */}
            {question && (
              <Card className="rounded-2xl">
                <CardContent className="p-5 sm:p-6 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm sm:text-base font-semibold text-[var(--text-primary)] leading-relaxed">
                      {question.prompt}
                    </p>
                    <span className="shrink-0 text-xs text-[var(--text-muted)] rounded-lg bg-[var(--surface-soft)] px-2 py-1">
                      {question.marks}{" "}
                      {question.marks === 1
                        ? t("درجة", "mark")
                        : t("درجات", "marks")}
                    </span>
                  </div>

                  {/* MCQ */}
                  {question.type === "mcq" &&
                    Array.isArray(question.options) && (
                      <div className="space-y-2">
                        {question.options.map((opt, oi) => {
                          const selected =
                            String(answers[question.id] ?? "") === String(opt);
                          return (
                            <button
                              key={oi}
                              onClick={() => setAnswer(question.id, opt)}
                              className="w-full text-start rounded-xl border p-3.5 text-sm transition-all"
                              style={{
                                borderColor: selected
                                  ? "var(--primary)"
                                  : "var(--card-border)",
                                backgroundColor: selected
                                  ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                                  : "transparent",
                                color: "var(--text-primary)",
                              }}
                            >
                              <span
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold me-2"
                                style={{
                                  backgroundColor: selected
                                    ? "var(--primary)"
                                    : "var(--surface-soft)",
                                  color: selected
                                    ? "#fff"
                                    : "var(--text-muted)",
                                }}
                              >
                                {String.fromCharCode(65 + oi)}
                              </span>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}

                  {/* True / False */}
                  {question.type === "true_false" && (
                    <div className="flex gap-3">
                      {[
                        { value: "true", label: t("صح", "True") },
                        { value: "false", label: t("خطأ", "False") },
                      ].map((opt) => {
                        const selected =
                          String(answers[question.id] ?? "") === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() =>
                              setAnswer(question.id, opt.value)
                            }
                            className="flex-1 rounded-xl border p-3.5 text-sm font-medium transition-all"
                            style={{
                              borderColor: selected
                                ? "var(--primary)"
                                : "var(--card-border)",
                              backgroundColor: selected
                                ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                                : "transparent",
                              color: "var(--text-primary)",
                            }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Short answer */}
                  {question.type === "short_answer" && (
                    <textarea
                      value={String(answers[question.id] ?? "")}
                      onChange={(e) =>
                        setAnswer(question.id, e.target.value)
                      }
                      placeholder={t(
                        "اكتب إجابتك هنا...",
                        "Type your answer here...",
                      )}
                      rows={4}
                      dir={isAr ? "rtl" : "ltr"}
                      className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 resize-y"
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Navigation ── */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
                disabled={currentIdx === 0}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--card-border)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] disabled:opacity-40 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
                {t("السابق", "Previous")}
              </button>

              {currentIdx < questions.length - 1 ? (
                <button
                  onClick={() =>
                    setCurrentIdx((p) =>
                      Math.min(questions.length - 1, p + 1),
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                >
                  {t("التالي", "Next")}
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--success)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {t("إرسال الامتحان", "Submit Exam")}
                </button>
              )}
            </div>

            {/* ── Confirmation dialog ── */}
            {showConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div
                  className="rounded-2xl p-6 w-[90%] max-w-md space-y-4 shadow-xl"
                  style={{
                    backgroundColor: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-[var(--warning)]" />
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      {t("تأكيد الإرسال", "Confirm submission")}
                    </h3>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {t(
                      `أجبت على ${answeredCount} من ${questions.length} سؤال. هل أنت متأكد من إرسال الامتحان؟`,
                      `You answered ${answeredCount} of ${questions.length} questions. Are you sure you want to submit?`,
                    )}
                  </p>
                  <div className="flex items-center gap-3 justify-end">
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="rounded-xl px-4 py-2 text-sm text-[var(--text-muted)] hover:underline"
                    >
                      {t("إلغاء", "Cancel")}
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--success)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {submitting && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {t("إرسال", "Submit")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </StudentShell>
  );
}
