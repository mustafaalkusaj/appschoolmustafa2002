"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CreditCard, ChevronLeft, ChevronRight, AlertTriangle } from "@/lib/icons";
import { formatDate, formatNumber } from "@/lib/formatting";
import { DashboardRecentPayment } from "./types";
import { motion } from "framer-motion";
import { containerVariants, itemVariants, usePrefersReducedMotion, getVariants } from "@/lib/motion-variants";

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
  const reduced = usePrefersReducedMotion();

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <h3 className="flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
          <CreditCard size={16} className="text-[var(--primary)]" />
          {t("recentTitle")}
        </h3>
        <Link
          href={paymentsPageHref}
          className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline"
        >
          {t("viewAll")}
          {locale === "en" ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </Link>
      </div>
      <div className="p-4 space-y-2">
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
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-[var(--danger)]/10 text-[var(--danger)] flex items-center justify-center">
              <AlertTriangle size={22} />
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">{dashboardT("errors.overviewTitle")}</p>
            <p className="text-xs text-[var(--text-muted)]">{dashboardT("errors.overviewDescription")}</p>
            {onRetry && (
              <button onClick={onRetry} className="inline-flex items-center h-8 px-3 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition-colors">
                {commonT("retry")}
              </button>
            )}
          </div>
        ) : recentPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-[var(--surface-soft)] text-[var(--text-muted)] flex items-center justify-center">
              <CreditCard size={22} />
            </div>
            <p className="text-sm font-semibold text-[var(--text-muted)]">{t("noPayments")}</p>
          </div>
        ) : (
          <motion.div variants={getVariants(reduced, containerVariants(0.07))} initial="hidden" animate="visible">
          {recentPayments.map((p) => (
            <motion.div
              key={p.id}
              variants={getVariants(reduced, itemVariants)}
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
            </motion.div>
          ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
