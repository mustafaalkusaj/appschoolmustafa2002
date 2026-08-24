"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Clock,
  CalendarCheck,
  TrendingUp,
} from "lucide-react";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { StatsCard, KPIGrid } from "@/components/ui/stats-card";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";

interface AttendanceRecord {
  id: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  subject_name: string | null;
  note: string | null;
}

interface AttendanceSummary {
  total_days: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
}

const STATUS_MAP: Record<
  string,
  {
    ar: string;
    en: string;
    variant: "success" | "danger" | "warning" | "info";
    icon: typeof CheckCircle2;
  }
> = {
  present: { ar: "حاضر", en: "Present", variant: "success", icon: CheckCircle2 },
  absent: { ar: "غائب", en: "Absent", variant: "danger", icon: XCircle },
  late: { ar: "متأخر", en: "Late", variant: "warning", icon: Clock },
  excused: { ar: "إجازة", en: "Excused", variant: "info", icon: CalendarCheck },
};

export default function StudentAttendancePage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/student/attendance")
      .then((res) => {
        if (res.response.ok) {
          const d = (res.payload as any)?.data;
          setRecords(d?.records ?? []);
          setSummary(d?.summary ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <StudentShell
      currentPath="/student/attendance"
      titleAr="حضوري"
      titleEn="My Attendance"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[100px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse"
                />
              ))}
            </div>
            <div className="h-[300px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
          </div>
        ) : (
          <>
            {summary && (
              <>
                <Card>
                  <CardContent className="pt-[var(--card-padding)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[var(--text-secondary)]">
                        {t("نسبة الحضور", "Attendance Rate")}
                      </span>
                      <span
                        className={`text-2xl font-bold ${
                          summary.rate >= 80
                            ? "text-[var(--success)]"
                            : summary.rate >= 60
                              ? "text-[var(--warning)]"
                              : "text-[var(--danger)]"
                        }`}
                      >
                        {summary.rate}%
                      </span>
                    </div>
                    <Progress value={summary.rate} className="h-3" />
                  </CardContent>
                </Card>

                <KPIGrid>
                  <StatsCard
                    label={t("إجمالي الأيام", "Total Days")}
                    value={String(summary.total_days)}
                    icon={CalendarCheck}
                    variant="primary"
                  />
                  <StatsCard
                    label={t("حضور", "Present")}
                    value={String(summary.present)}
                    icon={CheckCircle2}
                    variant="success"
                  />
                  <StatsCard
                    label={t("غياب", "Absent")}
                    value={String(summary.absent)}
                    icon={XCircle}
                    variant="danger"
                  />
                  <StatsCard
                    label={t("تأخر", "Late")}
                    value={String(summary.late)}
                    icon={Clock}
                    variant="warning"
                  />
                </KPIGrid>
              </>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[var(--primary)]" />
                  <CardTitle className="text-base">
                    {t("سجل الحضور", "Attendance Records")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {records.length === 0 ? (
                  <EmptyState
                    icon={
                      <CalendarCheck className="h-10 w-10 text-[var(--text-tertiary)]" />
                    }
                    title={t("لا توجد سجلات حضور", "No attendance records")}
                    className="py-6 min-h-0"
                  />
                ) : (
                  <div className="space-y-2">
                    {records.map((r) => {
                      const st = STATUS_MAP[r.status] ?? STATUS_MAP.present;
                      const Icon = st.icon;
                      return (
                        <div
                          key={r.id}
                          className="flex items-center gap-3 rounded-lg border border-[var(--card-border)] p-3 hover:bg-[var(--card-bg)] transition-colors"
                        >
                          <div
                            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full"
                            style={{
                              backgroundColor: `color-mix(in srgb, var(--${st.variant}) 12%, transparent)`,
                            }}
                          >
                            <Icon
                              className="h-4.5 w-4.5"
                              style={{ color: `var(--${st.variant})` }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[var(--text-primary)]">
                                {r.date}
                              </span>
                              <Badge variant={st.variant} size="sm">
                                {isAr ? st.ar : st.en}
                              </Badge>
                            </div>
                            {(r.subject_name || r.note) && (
                              <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                                {r.subject_name ?? ""}
                                {r.subject_name && r.note ? " · " : ""}
                                {r.note ?? ""}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
