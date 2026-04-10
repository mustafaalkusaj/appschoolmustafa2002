"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2 } from "@/lib/icons";
import { formatNumber } from "@/lib/formatting";
import { DashboardOverdueStudent } from "./types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

interface OverdueStudentsPanelProps {
  overdueStudents: DashboardOverdueStudent[];
  paymentsPageHref: string;
  locale: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function OverdueStudentsPanel({
  overdueStudents,
  paymentsPageHref,
  locale,
  loading,
  error,
  onRetry,
}: OverdueStudentsPanelProps) {
  const t = useTranslations("dashboard.overdue");
  const dashboardT = useTranslations("dashboard");
  const commonT = useTranslations("common");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-[var(--danger)]" />
          <span>{t("title")}</span>
        </CardTitle>
        <Link
          href={paymentsPageHref} 
          className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
        >
          {dashboardT("payments.viewAll")}
          {locale === "en" ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-xl border border-[var(--danger)]/10 bg-[color-mix(in_srgb,var(--danger)_4%,transparent)] p-3">
                <div className="mb-2 h-3 w-2/3 rounded-full bg-[var(--surface-muted)]" />
                <div className="h-2 w-1/3 rounded-full bg-[var(--surface-muted)]" />
              </div>
            ))
          ) : error ? (
            <ErrorState
              title={dashboardT("errors.overviewTitle")}
              description={dashboardT("errors.overviewDescription")}
              onRetry={onRetry}
              retryLabel={commonT("retry")}
              className="min-h-[220px] px-0 py-8"
            />
          ) : overdueStudents.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={24} />}
              title={t("noOverdue")}
              className="bg-[color-mix(in_srgb,var(--success)_5%,transparent)] border-[var(--success)]/20"
            />
          ) : (
            overdueStudents.map((s) => (
              <div 
                key={s.id} 
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[color-mix(in_srgb,var(--danger)_5%,transparent)] border border-[var(--danger)]/20 transition-colors hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {s.full_name}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] font-medium">
                    {s.class_name}
                  </div>
                </div>
                <div className="text-start shrink-0">
                  <div className="text-[10px] text-[var(--danger)] font-bold mb-0.5 uppercase tracking-wider">
                    {dashboardT("finance.remaining")}
                  </div>
                  <div className="font-bold text-[var(--danger)] text-sm whitespace-nowrap">
                    {commonT("currency")} {formatNumber(s.remaining_fee)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
