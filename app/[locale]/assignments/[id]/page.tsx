"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useParams } from "next/navigation";
import { ArrowRight, ArrowLeft, FileText, CalendarDays, BookOpen, Users } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCard, KPIGrid } from "@/components/ui/stats-card";
import { EmptyState } from "@/components/ui/empty-state";

interface AssignmentDetail {
  id: string;
  title: string;
  description: string | null;
  class_name: string | null;
  subject: string | null;
  due_at: string | null;
  max_grade: number | null;
  status: string | null;
}

interface SubmissionRow {
  id: string;
  student_id: string;
  student_name: string;
  submitted_at: string | null;
  is_late: boolean;
  grade: number | null;
  feedback: string | null;
  status: string;
}

interface DetailResponse {
  assignment: AssignmentDetail;
  submissions: SubmissionRow[];
  counts: {
    total_students: number;
    total_submissions: number;
    graded: number;
  };
}

export default function AdminAssignmentDetailPage() {
  const pathname = usePathname();
  const { id } = useParams<{ id: string }>();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const BackArrow = isAr ? ArrowLeft : ArrowRight;

  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const schoolId =
    schoolScope.selectedSchoolId ?? profile?.school_id ?? profile?.school?.id ?? "";

  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDetail = useCallback(async () => {
    if (!schoolId || !id) return;
    setLoading(true);
    try {
      const res = await fetchJsonWithAuthorizedSession(
        `/api/web/assignments/${id}?schoolId=${schoolId}`,
      );
      if (res.response.ok) {
        setData((res.payload as { data: DetailResponse })?.data ?? null);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [schoolId, id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/assignments" />
        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar title={t("تفاصيل الواجب", "Assignment Details")} />

          <main className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 max-w-4xl mx-auto w-full">
            <a
              href={`/${locale}/assignments`}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--primary)] hover:underline"
            >
              <BackArrow className="h-4 w-4" />
              {t("العودة للواجبات", "Back to assignments")}
            </a>

            {loading ? (
              <div className="space-y-4">
                <div className="h-32 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
                <div className="h-64 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
              </div>
            ) : !data ? (
              <EmptyState
                icon={<FileText className="h-12 w-12" />}
                title={t("الواجب غير موجود", "Assignment not found")}
              />
            ) : (
              <>
                <Card className="rounded-2xl">
                  <CardContent className="p-5 sm:p-6 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                        {data.assignment.title}
                      </h2>
                      {data.assignment.status && (
                        <Badge variant="neutral" size="sm">
                          {data.assignment.status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      {data.assignment.subject && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          <span className="text-xs text-[var(--text-muted)]">
                            {data.assignment.subject}
                          </span>
                        </div>
                      )}
                      {data.assignment.class_name && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          <span className="text-xs text-[var(--text-muted)]">
                            {data.assignment.class_name}
                          </span>
                        </div>
                      )}
                      {data.assignment.due_at && (
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          <span className="text-xs text-[var(--text-muted)]">
                            {t("التسليم:", "Due:")}{" "}
                            {new Date(data.assignment.due_at).toLocaleDateString(
                              isAr ? "ar-IQ" : "en-US",
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                    {data.assignment.description && (
                      <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                        {data.assignment.description}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <KPIGrid>
                  <StatsCard
                    label={t("عدد الطلاب", "Students")}
                    value={String(data.counts.total_students)}
                    icon={Users}
                    variant="info"
                  />
                  <StatsCard
                    label={t("التسليمات", "Submissions")}
                    value={String(data.counts.total_submissions)}
                    icon={FileText}
                    variant="neutral"
                  />
                  <StatsCard
                    label={t("تم تقييمها", "Graded")}
                    value={String(data.counts.graded)}
                    icon={BookOpen}
                    variant="success"
                  />
                </KPIGrid>

                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-sm sm:text-base">
                      {t("التسليمات", "Submissions")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.submissions.length === 0 ? (
                      <EmptyState
                        icon={<FileText className="h-10 w-10" />}
                        title={t("لا توجد تسليمات بعد", "No submissions yet")}
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-start text-xs text-[var(--text-muted)] border-b border-[var(--card-border)]">
                              <th className="py-2 px-2 text-start">
                                {t("الطالب", "Student")}
                              </th>
                              <th className="py-2 px-2 text-start">
                                {t("تاريخ التسليم", "Submitted at")}
                              </th>
                              <th className="py-2 px-2 text-start">
                                {t("الحالة", "Status")}
                              </th>
                              <th className="py-2 px-2 text-start">
                                {t("الدرجة", "Grade")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.submissions.map((s) => (
                              <tr
                                key={s.id}
                                className="border-b border-[var(--card-border)] last:border-0"
                              >
                                <td className="py-2 px-2 text-[var(--text-primary)]">
                                  {s.student_name}
                                </td>
                                <td className="py-2 px-2 text-[var(--text-muted)]">
                                  {s.submitted_at
                                    ? new Date(s.submitted_at).toLocaleString(
                                        isAr ? "ar" : "en",
                                      )
                                    : "—"}
                                  {s.is_late && (
                                    <Badge
                                      variant="danger"
                                      size="sm"
                                      className="ms-2"
                                    >
                                      {t("متأخر", "Late")}
                                    </Badge>
                                  )}
                                </td>
                                <td className="py-2 px-2">
                                  <Badge
                                    variant={
                                      s.status === "graded" ? "success" : "warning"
                                    }
                                    size="sm"
                                  >
                                    {s.status === "graded"
                                      ? t("مقيّم", "Graded")
                                      : t("بانتظار التقييم", "Pending")}
                                  </Badge>
                                </td>
                                <td className="py-2 px-2 text-[var(--text-primary)] font-semibold">
                                  {s.grade !== null
                                    ? `${s.grade}/${data.assignment.max_grade ?? 100}`
                                    : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
