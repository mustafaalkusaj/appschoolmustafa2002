"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Plus, FileText, Clock } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
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

interface Assignment {
  id: string;
  title: string;
  class_name: string | null;
  subject: string | null;
  due_at: string | null;
  description: string | null;
  content_kind: string | null;
  created_at: string;
}

export default function AdminAssignmentsPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const schoolId =
    schoolScope.selectedSchoolId ?? profile?.school_id ?? profile?.school?.id ?? "";

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadAssignments = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const res = await fetchJsonWithAuthorizedSession(
        `/api/web/assignments?schoolId=${schoolId}`,
      );
      if (res.response.ok) {
        setAssignments(
          ((res.payload as { data: Assignment[] })?.data ?? []),
        );
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  function daysUntil(dateStr: string | null) {
    if (!dateStr) return null;
    return Math.ceil(
      (new Date(dateStr).getTime() - Date.now()) / 86400000,
    );
  }

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/assignments" />
        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title={t("الواجبات", "Assignments")}
            actions={
              <button
                onClick={() => setShowForm((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white bg-[var(--primary)] hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                {t("إضافة واجب", "Add Assignment")}
              </button>
            }
          />

          <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
            {showForm && (
              <NewAssignmentForm
                schoolId={schoolId}
                isAr={isAr}
                t={t}
                onCreated={() => {
                  setShowForm(false);
                  loadAssignments();
                }}
                onCancel={() => setShowForm(false)}
              />
            )}

            {loading ? (
              <div className="text-center py-12 text-[var(--text-muted)]">
                {t("جاري التحميل...", "Loading...")}
              </div>
            ) : assignments.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-12 w-12" />}
                title={t("لا توجد واجبات", "No assignments")}
                description={t(
                  "اضغط على إضافة واجب لإنشاء واجب جديد",
                  "Click Add Assignment to create one",
                )}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {assignments.map((a) => {
                  const days = daysUntil(a.due_at);
                  const isPast = days !== null && days < 0;
                  return (
                    <Card key={a.id} className="rounded-2xl">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base font-semibold line-clamp-2">
                            {a.title}
                          </CardTitle>
                          {days !== null && (
                            <Badge
                              variant={isPast ? "danger" : "neutral"}
                              className="shrink-0 text-xs"
                            >
                              {isPast
                                ? t("منتهي", "Past due")
                                : days === 0
                                  ? t("اليوم", "Today")
                                  : `${days} ${t("يوم", "days")}`}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-1.5 text-sm text-[var(--text-muted)]">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          {a.subject ?? "—"} • {a.class_name ?? "—"}
                        </div>
                        {a.due_at && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(a.due_at).toLocaleDateString(
                              isAr ? "ar-IQ" : "en-US",
                            )}
                          </div>
                        )}
                        {a.description && (
                          <p className="text-xs line-clamp-2 mt-1">
                            {a.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function NewAssignmentForm({
  schoolId,
  isAr,
  t,
  onCreated,
  onCancel,
}: {
  schoolId: string;
  isAr: boolean;
  t: (ar: string, en: string) => string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const inputClass =
    "w-full px-3 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--primary)] transition-shadow";
  const labelClass =
    "block text-sm font-medium text-[var(--text-primary)] mb-1.5";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !className.trim() || !subject.trim()) {
      setError(
        t("يرجى ملء الحقول المطلوبة", "Please fill required fields"),
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetchJsonWithAuthorizedSession("/api/web/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          title: title.trim(),
          description: description.trim() || null,
          class_name: className.trim(),
          subject: subject.trim(),
          due_at: dueDate || null,
        }),
      });

      if (res.response.ok) {
        onCreated();
      } else {
        const payload = res.payload as { error?: string | { message?: string } } | null;
        const msg =
          typeof payload?.error === "string"
            ? payload.error
            : (payload?.error as { message?: string })?.message;
        setError(msg ?? t("حدث خطأ", "An error occurred"));
      }
    } catch {
      setError(t("حدث خطأ في الاتصال", "Connection error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="rounded-2xl mb-6">
      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {t("واجب جديد", "New Assignment")}
          </h3>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-950/30 dark:border-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                {t("عنوان الواجب", "Title")} *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("أدخل عنوان الواجب", "Enter title")}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                {t("المادة", "Subject")} *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("مثلاً: الرياضيات", "e.g. Math")}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                {t("الصف", "Class")} *
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder={t("مثلاً: الأول", "e.g. First")}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                {t("تاريخ التسليم", "Due Date")}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              {t("الوصف", "Description")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("تفاصيل الواجب...", "Assignment details...")}
              rows={3}
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-[var(--primary)] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting
                ? t("جاري الإرسال...", "Sending...")
                : t("إضافة وإرسال إشعار", "Add & Notify Students")}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              {t("إلغاء", "Cancel")}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
