"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useParams } from "next/navigation";
import { ArrowRight, ArrowLeft, FileText, CheckCircle2, Send } from "lucide-react";
import { TeacherShell } from "@/components/TeacherShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface SubmissionRow {
  id: string;
  student_id: string;
  student_name: string;
  notes: string | null;
  file_url: string | null;
  file_name: string | null;
  submitted_at: string | null;
  is_late: boolean;
  grade: number | null;
  feedback: string | null;
  status: string;
  graded_at: string | null;
}

interface SubmissionsResponse {
  submissions: SubmissionRow[];
  max_grade: number;
}

export default function TeacherAssignmentSubmissionsPage() {
  const pathname = usePathname();
  const { id } = useParams<{ id: string }>();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const BackArrow = isAr ? ArrowLeft : ArrowRight;

  const [data, setData] = useState<SubmissionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<
    Record<string, { grade: string; feedback: string }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const loadSubmissions = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetchJsonWithAuthorizedSession(
        `/api/teacher/assignments/${id}/submissions`,
      );
      if (res.response.ok) {
        const payload = (res.payload as { data: SubmissionsResponse })?.data;
        setData(payload ?? null);
        const nextDrafts: Record<string, { grade: string; feedback: string }> = {};
        for (const s of payload?.submissions ?? []) {
          nextDrafts[s.id] = {
            grade: s.grade !== null ? String(s.grade) : "",
            feedback: s.feedback ?? "",
          };
        }
        setDrafts(nextDrafts);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  async function handleGrade(submissionId: string) {
    const draft = drafts[submissionId];
    if (!draft || draft.grade.trim() === "") return;

    setSavingId(submissionId);
    setErrorById((prev) => ({ ...prev, [submissionId]: "" }));

    try {
      const res = await fetchJsonWithAuthorizedSession(
        `/api/teacher/assignments/${id}/submissions/${submissionId}/grade`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grade: Number(draft.grade),
            feedback: draft.feedback.trim() || null,
          }),
        },
      );

      if (res.response.ok) {
        await loadSubmissions();
      } else {
        const p = res.payload as { error?: string };
        setErrorById((prev) => ({
          ...prev,
          [submissionId]: p.error ?? "update_failed",
        }));
      }
    } catch {
      setErrorById((prev) => ({ ...prev, [submissionId]: "network_error" }));
    } finally {
      setSavingId(null);
    }
  }

  const maxGrade = data?.max_grade ?? 100;

  return (
    <TeacherShell
      currentPath="/teacher/assignments"
      titleAr="تسليمات الواجب"
      titleEn="Assignment Submissions"
    >
      <div className="max-w-3xl mx-auto space-y-5">
        <a
          href={`/${locale}/teacher/assignments`}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--primary)] hover:underline"
        >
          <BackArrow className="h-4 w-4" />
          {t("العودة للواجبات", "Back to assignments")}
        </a>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse"
              />
            ))}
          </div>
        ) : !data || data.submissions.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-12 w-12 text-[var(--text-tertiary)]" />}
            title={t("لا توجد تسليمات بعد", "No submissions yet")}
          />
        ) : (
          <div className="space-y-4">
            {data.submissions.map((s) => {
              const draft = drafts[s.id] ?? { grade: "", feedback: "" };
              const error = errorById[s.id];
              return (
                <Card key={s.id} className="rounded-2xl">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm sm:text-base">
                        {s.student_name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {s.is_late && (
                          <Badge variant="danger" size="sm">
                            {t("متأخر", "Late")}
                          </Badge>
                        )}
                        <Badge
                          variant={s.status === "graded" ? "success" : "warning"}
                          size="sm"
                        >
                          {s.status === "graded"
                            ? t("مقيّم", "Graded")
                            : t("بانتظار التقييم", "Pending")}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {s.submitted_at && (
                      <p className="text-xs text-[var(--text-muted)]">
                        {t("تاريخ التسليم:", "Submitted:")}{" "}
                        {new Date(s.submitted_at).toLocaleString(
                          isAr ? "ar" : "en",
                        )}
                      </p>
                    )}
                    {s.notes && (
                      <div className="rounded-xl bg-[var(--surface-soft)] p-3">
                        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                          {s.notes}
                        </p>
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-[120px_1fr] items-start pt-2">
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                          {t("الدرجة", "Grade")} / {maxGrade}
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={maxGrade}
                          value={draft.grade}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [s.id]: { ...draft, grade: e.target.value },
                            }))
                          }
                          className="w-full px-3 py-2 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                          {t("ملاحظات التقييم", "Feedback")}
                        </label>
                        <textarea
                          value={draft.feedback}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [s.id]: { ...draft, feedback: e.target.value },
                            }))
                          }
                          rows={2}
                          className="w-full px-3 py-2 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)] resize-y"
                        />
                      </div>
                    </div>

                    {error && (
                      <p className="text-xs text-[var(--danger)]">
                        {t("حدث خطأ، حاول مجدداً", "An error occurred, try again")}
                      </p>
                    )}

                    <div>
                      <button
                        onClick={() => handleGrade(s.id)}
                        disabled={savingId === s.id || draft.grade.trim() === ""}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white bg-[var(--primary)] hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {s.status === "graded" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        {savingId === s.id
                          ? t("جارٍ الحفظ...", "Saving...")
                          : t("حفظ التقييم", "Save Grade")}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </TeacherShell>
  );
}
