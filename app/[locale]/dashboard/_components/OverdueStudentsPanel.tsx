"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2 } from "@/lib/icons";
import { formatNumber } from "@/lib/formatting";
import { DashboardOverdueStudent } from "./types";
import { motion } from "framer-motion";
import { containerVariants, itemVariants, usePrefersReducedMotion, getVariants } from "@/lib/motion-variants";

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
  const reduced = usePrefersReducedMotion();

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <h3 className="flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
          <AlertTriangle size={16} className="text-[var(--danger)]" />
          {t("title")}
        </h3>
        <Link
          href={paymentsPageHref}
          className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline"
        >
          {dashboardT("payments.viewAll")}
          {locale === "en" ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </Link>
      </div>
      <div className="p-4 space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-xl border border-[var(--danger)]/10 bg-[color-mix(in_srgb,var(--danger)_4%,transparent)] p-3">
              <div className="mb-2 h-3 w-2/3 rounded-full bg-[var(--surface-muted)]" />
              <div className="h-2 w-1/3 rounded-full bg-[var(--surface-muted)]" />
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
        ) : overdueStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center">
              <CheckCircle2 size={22} />
            </div>
            <p className="text-sm font-semibold text-[var(--text-muted)]">{t("noOverdue")}</p>
          </div>
        ) : (
          <motion.div variants={getVariants(reduced, containerVariants(0.07))} initial="hidden" animate="visible">
          {overdueStudents.map((s) => (
            <motion.div
              key={s.id}
              variants={getVariants(reduced, itemVariants)}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[color-mix(in_srgb,var(--danger)_5%,transparent)] border border-[var(--danger)]/20 transition-colors hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{s.full_name}</div>
                <div className="text-[11px] text-[var(--text-muted)] font-medium">{s.class_name}</div>
              </div>
              <div className="text-start shrink-0">
                <div className="text-[10px] text-[var(--danger)] font-bold mb-0.5 uppercase tracking-wider">
                  {dashboardT("finance.remaining")}
                </div>
                <div className="font-bold text-[var(--danger)] text-sm whitespace-nowrap">
                  {commonT("currency")} {formatNumber(s.remaining_fee)}
                </div>
              </div>
            </motion.div>
          ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
