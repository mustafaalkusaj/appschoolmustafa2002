"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useParams } from "next/navigation";
import {
  FileText,
  CalendarDays,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Send,
  Pencil,
} from "lucide-react";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AssignmentDetail {
  id: string;
  title: string;
  subject: string | null;
  due_at: string | null;
  content_kind: string;
  description: string | null;
  created_at: string | null;
}

interface SubmissionDetail {
  id: string;
  notes: string | null;
  file_url: string | null;
  file_name: string | null;
  submitted_at: string | null;
}

export default function AssignmentDetailPage() {
  const pathname = usePathname();
  const { id } = useParams<{ id: string }>();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const BackArrow = isAr ? ArrowLeft : ArrowRight;

  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetchJsonWithAuthorizedSession(
        `/api/student/assignments/${id}`,
      );
      if (res.response.ok) {
        const payload = res.payload as {
          data: {
            assignment: AssignmentDetail;
            submission: SubmissionDetail | null;
          };
        };
        setAssignment(payload.data.assignment);
        setSubmission(payload.data.submission);
        if (payload.data.submission?.notes) {
          setNotes(payload.data.submission.notes);
        }
      }
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit() {
    if (!notes.trim()) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetchJsonWithAuthorizedSession(
        `/api/student/assignments/${id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: notes.trim() }),
        },
      );

      if (res.response.ok) {
        setSuccess(true);
        setEditing(false);
        await fetchData();
      } else {
        const p = res.payload as { error?: string };
        setError(p.error ?? "submit_failed");
      }
    } catch {
      setError("network_error");
    } finally {
      setSubmitting(false);
    }
  }

  const isPast =
    assignment?.due_at ? new Date(assignment.due_at) < new Date() : false;
  const showForm = !submission || editing;

  return (
    <StudentShell
      currentPath="/student/assignments"
      titleAr="تسليم الواجب"
      titleEn="Submit Assignment"
    >
      <div className="max-w-3xl mx-auto space-y-5">
        {/* back link */}
        <a
          href={`/${locale}/student/assignments`}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--primary)] hover:underline"
        >
          <BackArrow className="h-4 w-4" />
          {t("العودة للواجبات", "Back to assignments")}
        </a>

        {loading ? (
          <div className="space-y-4">
            <div className="h-40 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
            <div className="h-52 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
          </div>
        ) : !assignment ? (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-muted)]">
                {t("الواجب غير موجود", "Assignment not found")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ── Assignment info ── */}
            <Card className="rounded-2xl">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                      {assignment.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                      {assignment.subject && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          <span className="text-xs text-[var(--text-muted)]">
                            {assignment.subject}
                          </span>
                        </div>
                      )}
                      {assignment.due_at && (
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          <span className="text-xs text-[var(--text-muted)]">
                            {t("التسليم:", "Due:")}{" "}
                            {assignment.due_at.slice(0, 10)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={isPast ? "danger" : "success"}
                    size="sm"
                  >
                    {isPast
                      ? t("انتهى الموعد", "Past due")
                      : t("مفتوح", "Open")}
                  </Badge>
                </div>

                {assignment.description && (
                  <div className="rounded-xl bg-[var(--surface-soft)] p-4">
                    <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                      {assignment.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Existing submission ── */}
            {submission && !editing && (
              <Card className="rounded-2xl border-[var(--success)]/30">
                <CardContent className="p-5 sm:p-6 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
                      <span className="text-sm font-semibold text-[var(--success)]">
                        {t("تم التسليم", "Submitted")}
                      </span>
                    </div>
                    <button
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:underline"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t("تعديل", "Edit")}
                    </button>
                  </div>

                  {submission.notes && (
                    <div className="rounded-xl bg-[var(--surface-soft)] p-4">
                      <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                        {submission.notes}
                      </p>
                    </div>
                  )}

                  {submission.submitted_at && (
                    <p className="text-xs text-[var(--text-muted)]">
                      {t("تاريخ التسليم:", "Submitted at:")}{" "}
                      {new Date(submission.submitted_at).toLocaleString(
                        isAr ? "ar" : "en",
                      )}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Submit / Edit form ── */}
            {showForm && (
              <Card className="rounded-2xl">
                <CardContent className="p-5 sm:p-6 space-y-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {submission
                      ? t("تعديل الإجابة", "Edit submission")
                      : t("تسليم الواجب", "Submit assignment")}
                  </h3>

                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t(
                      "اكتب إجابتك أو ملاحظاتك هنا...",
                      "Write your answer or notes here...",
                    )}
                    rows={6}
                    className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 resize-y"
                    dir={isAr ? "rtl" : "ltr"}
                  />

                  {error && (
                    <p className="text-xs text-[var(--danger)]">
                      {error === "notes_required"
                        ? t("يرجى كتابة إجابة", "Please write an answer")
                        : t("حدث خطأ، حاول مجدداً", "An error occurred, try again")}
                    </p>
                  )}

                  {success && (
                    <p className="text-xs text-[var(--success)]">
                      {t("تم التسليم بنجاح!", "Submitted successfully!")}
                    </p>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !notes.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      {submitting
                        ? t("جارٍ الإرسال...", "Submitting...")
                        : submission
                          ? t("حفظ التعديل", "Save changes")
                          : t("إرسال", "Submit")}
                    </button>

                    {editing && (
                      <button
                        onClick={() => {
                          setEditing(false);
                          setNotes(submission?.notes ?? "");
                        }}
                        className="text-sm text-[var(--text-muted)] hover:underline"
                      >
                        {t("إلغاء", "Cancel")}
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </StudentShell>
  );
}
