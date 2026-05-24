"use client";

import { useTranslations } from "next-intl";
import { formatNumber } from "@/lib/formatting";
import { usePrefersReducedMotion } from "@/lib/motion-variants";
import {
  Banknote,
  TrendingUp,
  CalendarDays,
  Wallet,
  Tag,
  ReceiptText,
  CheckCircle2,
  Clock,
  HandCoins,
  ArrowUp,
  ArrowDown,
  Users,
} from "@/lib/icons";
import { cn } from "@/lib/brand/brand-utils";
import type { DashboardTotals, DashboardRecentPayment } from "./types";

interface DailyFinancialAnalysisProps {
  dashboardTotals: DashboardTotals;
  recentPayments: DashboardRecentPayment[];
  locale: "ar" | "en";
}

function isSameDay(dateStr: string | null, now: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatShortDate(dateStr: string | null, locale: "ar" | "en"): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(
    locale === "ar" ? "ar-IQ-u-nu-latn" : "en-IQ",
    { day: "numeric", month: "short" }
  );
}

export function DailyFinancialAnalysis({
  dashboardTotals,
  recentPayments,
  locale,
}: DailyFinancialAnalysisProps) {
  const t = useTranslations("dashboard.daily");
  const cur = useTranslations("common")("currency");
  const isRtl = locale === "ar";
  const reduced = usePrefersReducedMotion();

  const now = new Date();
  const todayPayments = recentPayments.filter((p) => isSameDay(p.created_at, now));
  const todayTotal = todayPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const todayCount = todayPayments.length;
  const todayMax =
    todayPayments.length > 0
      ? Math.max(...todayPayments.map((p) => p.amount ?? 0))
      : 0;
  const uniqueStudentsToday = new Set(todayPayments.map((p) => p.student_name ?? p.id)).size;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayPayments = recentPayments.filter((p) => isSameDay(p.created_at, yesterday));
  const yesterdayTotal = yesterdayPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const yesterdayCount = yesterdayPayments.length;
  const totalDelta = todayTotal - yesterdayTotal;
  const countDelta = todayCount - yesterdayCount;
  const totalDeltaPct = yesterdayTotal > 0 ? Math.round(Math.abs(totalDelta / yesterdayTotal) * 100) : null;

  // ── NEW: Net Daily Cash Flow ──
  const todayIncomes = dashboardTotals.todayIncomes ?? 0;
  const todayExpenses = dashboardTotals.todayExpenses ?? 0;
  const netPosition = todayIncomes - todayExpenses;
  const isNetPositive = netPosition >= 0;

  const todayStr = now.toLocaleDateString(
    locale === "ar" ? "ar-IQ-u-nu-latn" : "en-IQ",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );

  const displayPayments = recentPayments.slice(0, 8);

  return (
    <div className="space-y-3" dir={isRtl ? "rtl" : "ltr"}>

      {/* ══════════════════════════════════════════════════
          SECTION 1 — Header: Date + Collection Ring
      ══════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--primary)_20%,transparent)] bg-gradient-to-br from-[color-mix(in_srgb,var(--primary)_9%,var(--card-bg))] to-[var(--card-bg)] p-5">
        {/* Background decoration */}
        <div className="pointer-events-none absolute -top-8 -end-8 h-32 w-32 rounded-full bg-[var(--primary)] opacity-[0.04]" />

        <div className="flex items-center justify-between gap-4">
          {/* Left: title + date */}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest mb-1">
              {isRtl ? "التحليل اليومي · الفرع" : "Daily Analysis · Branch"}
            </p>
            <h2 className="text-base font-extrabold text-[var(--text-primary)] leading-tight">
              {t("title")}
            </h2>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{todayStr}</p>
          </div>

          {/* Right: Circular collection progress */}
          <div className="relative flex-shrink-0 flex flex-col items-center gap-1">
            <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
              <circle cx="36" cy="36" r="28" fill="none" stroke="var(--surface-muted)" strokeWidth="6" />
              <circle
                cx="36" cy="36" r="28" fill="none"
                stroke="var(--primary)" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - dashboardTotals.paidPct / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-black text-[var(--primary)] leading-none tabular-nums">
                {dashboardTotals.paidPct}%
              </span>
              <span className="text-[8px] text-[var(--text-muted)] font-bold mt-0.5">
                {isRtl ? "محصّل" : "Collected"}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom: collected progress bar */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-[var(--surface-muted)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--success)] transition-all duration-1000"
              style={{ width: `${dashboardTotals.paidPct}%` }}
            />
          </div>
          <span className="text-[10px] text-[var(--text-muted)] tabular-nums whitespace-nowrap">
            {cur} {formatNumber(dashboardTotals.totalPaid)} / {formatNumber(dashboardTotals.totalFees)}
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 2 — Today's KPI Grid (2×2)
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-2">

        {/* Payments count */}
        <div className="group relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--primary)_16%,transparent)] bg-[var(--card-bg)] p-4 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="h-8 w-8 rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] flex items-center justify-center text-[var(--primary)] group-hover:scale-110 transition-transform">
              <CalendarDays size={15} />
            </div>
            {yesterdayCount > 0 && (
              <span className={cn(
                "flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full",
                countDelta >= 0
                  ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
                  : "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
              )}>
                {countDelta >= 0
                  ? <ArrowUp size={9} />
                  : <ArrowDown size={9} />}
                {Math.abs(countDelta)}
              </span>
            )}
          </div>
          <div className="text-3xl font-black text-[var(--text-primary)] tabular-nums leading-none">
            {todayCount}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1.5 font-medium">
            {t("todayPayments")}
          </div>
          {yesterdayCount > 0 && (
            <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
              {isRtl ? `أمس: ${yesterdayCount}` : `Yesterday: ${yesterdayCount}`}
            </div>
          )}
        </div>

        {/* Today total */}
        <div className="group relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--success)_16%,transparent)] bg-[var(--card-bg)] p-4 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="h-8 w-8 rounded-xl bg-[color-mix(in_srgb,var(--success)_12%,transparent)] flex items-center justify-center text-[var(--success)] group-hover:scale-110 transition-transform">
              <Wallet size={15} />
            </div>
            {yesterdayTotal > 0 && totalDeltaPct !== null && (
              <span className={cn(
                "flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full",
                totalDelta >= 0
                  ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
                  : "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
              )}>
                {totalDelta >= 0 ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
                {totalDeltaPct}%
              </span>
            )}
          </div>
          <div className="text-lg font-black text-[var(--text-primary)] tabular-nums leading-none">
            {formatNumber(todayTotal)}
          </div>
          <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{cur}</div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1.5 font-medium">
            {t("todayTotal")}
          </div>
        </div>

        {/* NET POSITION — new feature */}
        <div className={cn(
          "group relative overflow-hidden rounded-2xl border p-4 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] transition-all",
          isNetPositive
            ? "border-[color-mix(in_srgb,var(--success)_16%,transparent)] bg-[var(--card-bg)]"
            : "border-[color-mix(in_srgb,var(--danger)_16%,transparent)] bg-[var(--card-bg)]"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className={cn(
              "h-8 w-8 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform",
              isNetPositive
                ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
                : "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
            )}>
              {isNetPositive ? <TrendingUp size={15} /> : <ArrowDown size={15} />}
            </div>
            <span className={cn(
              "text-[9px] font-black px-1.5 py-0.5 rounded-full",
              isNetPositive
                ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
                : "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
            )}>
              {isRtl ? "صافي اليوم" : "Net Today"}
            </span>
          </div>
          <div className={cn(
            "text-lg font-black tabular-nums leading-none",
            isNetPositive ? "text-[var(--success)]" : "text-[var(--danger)]"
          )}>
            {isNetPositive ? "+" : "-"}{formatNumber(Math.abs(netPosition))}
          </div>
          <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{cur}</div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1.5 font-medium">
            {isRtl ? "الإيراد - المصروف" : "Income − Expense"}
          </div>
        </div>

        {/* Students paid today — new feature */}
        <div className="group relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,#8b5cf6_16%,transparent)] bg-[var(--card-bg)] p-4 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="h-8 w-8 rounded-xl bg-[color-mix(in_srgb,#8b5cf6_12%,transparent)] flex items-center justify-center text-[#8b5cf6] group-hover:scale-110 transition-transform">
              <Users size={15} />
            </div>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[color-mix(in_srgb,#8b5cf6_12%,transparent)] text-[#8b5cf6]">
              {isRtl ? "اليوم" : "Today"}
            </span>
          </div>
          <div className="text-3xl font-black text-[var(--text-primary)] tabular-nums leading-none">
            {uniqueStudentsToday}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1.5 font-medium">
            {isRtl ? "طالب دفع اليوم" : "Students Paid Today"}
          </div>
          {dashboardTotals.studentsCount > 0 && (
            <div className="mt-2 h-1 bg-[var(--surface-muted)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#8b5cf6] rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.round((uniqueStudentsToday / dashboardTotals.studentsCount) * 100))}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 3 — Income vs Expenses Comparison
      ══════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center gap-2">
          <Banknote size={13} className="text-[var(--text-muted)]" />
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
            {isRtl ? "الحركة المالية اليوم" : "Today's Cash Flow"}
          </span>
        </div>
        <div className="p-4 grid grid-cols-3 gap-3 items-center">
          {/* Income */}
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[color-mix(in_srgb,var(--success)_7%,transparent)] border border-[color-mix(in_srgb,var(--success)_12%,transparent)]">
            <div className="h-7 w-7 rounded-lg bg-[var(--success)] flex items-center justify-center text-white">
              <ArrowUp size={13} />
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] tabular-nums text-center">{formatNumber(todayIncomes)}</div>
            <div className="text-[9px] text-[var(--success)] font-bold uppercase">{t("todayIncome")}</div>
          </div>

          {/* Net indicator */}
          <div className="flex flex-col items-center gap-1">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center",
              isNetPositive ? "text-[var(--success)]" : "text-[var(--danger)]",
              "bg-[var(--surface-soft)]"
            )}>
              {isNetPositive ? <TrendingUp size={16} /> : <ArrowDown size={16} />}
            </div>
            <div className={cn("text-xs font-black tabular-nums", isNetPositive ? "text-[var(--success)]" : "text-[var(--danger)]")}>
              {isNetPositive ? "+" : "-"}{formatNumber(Math.abs(netPosition))}
            </div>
            <div className="text-[9px] text-[var(--text-muted)]">{isRtl ? "صافي" : "Net"}</div>
          </div>

          {/* Expense */}
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[color-mix(in_srgb,#ef4444_7%,transparent)] border border-[color-mix(in_srgb,#ef4444_12%,transparent)]">
            <div className="h-7 w-7 rounded-lg bg-[#ef4444] flex items-center justify-center text-white">
              <HandCoins size={13} />
            </div>
            <div className="text-sm font-black text-[var(--text-primary)] tabular-nums text-center">{formatNumber(todayExpenses)}</div>
            <div className="text-[9px] text-[#ef4444] font-bold uppercase">{t("todayExpense")}</div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 4 — Collection Progress (Collected / Remaining)
      ══════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center gap-2">
          <TrendingUp size={13} className="text-[var(--text-muted)]" />
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
            {t("branchOverview")}
          </span>
        </div>
        <div className="p-4 space-y-4">

          {/* Collected */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-[var(--success)]" />
                <span className="text-xs font-semibold text-[var(--success)]">{t("collected")}</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)] tabular-nums">
                  {dashboardTotals.paidPct}%
                </span>
              </div>
              <span className="text-xs font-black text-[var(--text-primary)] tabular-nums">
                {cur} {formatNumber(dashboardTotals.totalPaid)}
              </span>
            </div>
            <div className="h-2.5 bg-[var(--surface-muted)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--success)] to-[color-mix(in_srgb,var(--success)_65%,var(--primary))] transition-all duration-700"
                style={{ width: `${dashboardTotals.paidPct}%` }}
              />
            </div>
          </div>

          {/* Remaining */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-[var(--warning)]" />
                <span className="text-xs font-semibold text-[var(--warning)]">{t("remaining")}</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)] tabular-nums">
                  {dashboardTotals.remainingPct}%
                </span>
              </div>
              <span className="text-xs font-black text-[var(--text-primary)] tabular-nums">
                {cur} {formatNumber(dashboardTotals.totalRemaining)}
              </span>
            </div>
            <div className="h-2.5 bg-[var(--surface-muted)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--warning)] to-[color-mix(in_srgb,var(--warning)_65%,#ef4444)] transition-all duration-700"
                style={{ width: `${dashboardTotals.remainingPct}%` }}
              />
            </div>
          </div>

          {/* Discount + Total */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)]">
            <div className="rounded-xl bg-[color-mix(in_srgb,var(--warning)_7%,transparent)] border border-[color-mix(in_srgb,var(--warning)_14%,transparent)] p-3 flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] flex items-center justify-center text-[var(--warning)] flex-shrink-0">
                <Tag size={14} />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide">{t("discount")}</div>
                <div className="text-sm font-black text-[var(--text-primary)] tabular-nums">{formatNumber(dashboardTotals.totalDiscount)}</div>
              </div>
            </div>
            <div className="rounded-xl bg-[color-mix(in_srgb,var(--primary)_7%,transparent)] border border-[color-mix(in_srgb,var(--primary)_14%,transparent)] p-3 flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] flex items-center justify-center text-[var(--primary)] flex-shrink-0">
                <Banknote size={14} />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide">{t("totalFees")}</div>
                <div className="text-sm font-black text-[var(--text-primary)] tabular-nums">{formatNumber(dashboardTotals.totalFees)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 5 — Recent Invoice List
      ══════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="px-4 py-2.5 bg-[var(--surface-muted)] border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReceiptText size={13} className="text-[var(--text-muted)]" />
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
              {t("recentList")}
            </span>
          </div>
          {todayCount > 0 && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]">
              {todayCount} {isRtl ? "اليوم" : "today"}
            </span>
          )}
        </div>

        {displayPayments.length > 0 ? (
          <div className="divide-y divide-[var(--border)]">
            {displayPayments.map((p) => {
              const isToday = isSameDay(p.created_at, now);
              const invoiceNum = p.id.slice(-5).toUpperCase();
              const dateLabel = formatShortDate(p.created_at, locale);
              return (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-muted)]",
                    isToday && "bg-[color-mix(in_srgb,var(--success)_4%,transparent)]"
                  )}
                >
                  <div
                    className={cn(
                      "h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0",
                      isToday
                        ? "bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-[var(--success)]"
                        : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                    )}
                  >
                    <ReceiptText size={14} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                        {p.student_name ?? "—"}
                      </span>
                      {isToday && (
                        <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-[var(--success)]">
                          {t("today")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[var(--text-muted)]">
                      {p.class_name && <span>{p.class_name}</span>}
                      {p.class_name && <span className="opacity-40">·</span>}
                      <span className="font-mono">#{invoiceNum}</span>
                      <span className="opacity-40">·</span>
                      <span>{dateLabel}</span>
                    </div>
                  </div>

                  <div className="text-sm font-bold text-[var(--success)] whitespace-nowrap tabular-nums">
                    {cur} {formatNumber(p.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 gap-2.5">
            <div className="h-11 w-11 rounded-2xl bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-muted)]">
              <ReceiptText size={20} />
            </div>
            <p className="text-sm text-[var(--text-muted)]">{t("noPaymentsToday")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
