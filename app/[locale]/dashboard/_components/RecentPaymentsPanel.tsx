"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CreditCard, ChevronLeft, ChevronRight } from "@/lib/icons";
import { formatDate, formatNumber } from "@/lib/formatting";
import { DashboardRecentPayment } from "./types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

interface RecentPaymentsPanelProps {
  recentPayments: DashboardRecentPayment[];
  paymentsPageHref: string;
  locale: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function RecentPaymentsPanel({
  recentPayments,
  paymentsPageHref,
  locale,
  loading,
  error,
  onRetry,
}: RecentPaymentsPanelProps) {
  const t = useTranslations("dashboard.payments");
  const dashboardT = useTranslations("dashboard");
  const commonT = useTranslations("common");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <CreditCard size={18} className="text-[var(--primary)]" />
          <span>{t("recentTitle")}</span>
        </CardTitle>
        <Link
          href={paymentsPageHref} 
          className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
        >
          {t("viewAll")}
          {locale === "en" ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[var(--surface-muted)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 rounded-full bg-[var(--surface-muted)]" />
                    <div className="h-2 w-1/2 rounded-full bg-[var(--surface-muted)]" />
                  </div>
                </div>
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
          ) : recentPayments.length === 0 ? (
            <EmptyState
              icon={<CreditCard size={24} />}
              title={t("noPayments")}
            />
          ) : (
            recentPayments.map((p) => (
              <div 
                key={p.id} 
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-muted)]/50 border border-[var(--border)] transition-colors hover:bg-[var(--surface-muted)]"
              >
                <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)] flex items-center justify-center text-sm font-bold shrink-0">
                  {(p.student_name || "؟")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {p.student_name || "—"}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] font-medium">
                    {p.class_name || "—"} • {p.created_at ? formatDate(p.created_at) : "—"}
                  </div>
                </div>
                <div className="font-bold text-[var(--success)] text-sm whitespace-nowrap">
                  {commonT("currency")} {formatNumber(p.amount)}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
