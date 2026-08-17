"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { formatNumber } from "@/lib/formatting";
import {
  TrendingUp,
  Briefcase,
  Users,
  HandCoins,
  Wallet,
  CalendarDays,
  Download,
  Printer,
  ArrowUp,
  ArrowDown,
} from "@/lib/icons";
import { motion } from "framer-motion";
import { downloadExcelExport } from "@/lib/excel-client";
import { printHtmlDocument, wrapPrintDocument } from "@/lib/print/branding";
import { useRuntimeBranding } from "@/hooks/brand/useRuntimeBranding";
import { getLocaleFromPath } from "@/lib/locale-routing";

type ReportsMetrics = {
  netRevenue: number;
  netPayments: number;
  totalBalance: number;
  totalPaid: number;
  totalFees: number;
  expenseVolume: number;
  salaryVolume: number;
  salaryByMonth: Array<{ month: string; total: number }>;
  currentStudentsTotalFees: number;
  currentStudentsCollected: number;
  currentStudentsDiscounts: number;
  currentStudentsRemaining: number;
  transferredStudentsTotalFees: number;
  transferredStudentsCollected: number;
  transferredStudentsDiscounts: number;
  transferredStudentsRemaining: number;
  otherRevenueTotal: number;
  expensesByType: Array<{ name: string; total: number }>;
};

interface FinancialDashboardProps {
  metrics: ReportsMetrics;
  currency: string;
}

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const BAR_COLORS = [
  "var(--primary)", "var(--info)", "var(--success)",
  "var(--warning)", "var(--danger)",
  "#818cf8", "#34d399", "#f97316", "#a78bfa", "#fb7185",
];

function formatMonth(month: string, isEn: boolean) {
  const parts = month.split("-");
  const monthIndex = parseInt(parts[1] ?? "0", 10) - 1;
  const names = isEn ? MONTHS_EN : MONTHS_AR;
  return `${names[monthIndex] ?? month} ${parts[0] ?? ""}`.trim();
}

export function FinancialDashboard({ metrics, currency }: FinancialDashboardProps) {
  const pathname = usePathname();
  const isEn = getLocaleFromPath(pathname) === "en";

  // This panel shipped with every label hardcoded in Arabic, so /en/reports
  // rendered an Arabic dashboard inside an English page.
  const c = useMemo(() => isEn ? {
    exportExcel: "Download Excel", exporting: "Exporting...", print: "Print",
    fileName: "financial_report", summarySheet: "Financial summary",
    item: "Item", amount: "Amount",
    currentTotal: "Current students - total fees",
    currentCollected: "Current students - collected",
    currentDiscounts: "Current students - discounts",
    currentRemaining: "Current students - outstanding",
    transferredTotal: "Transferred students - total fees",
    transferredCollected: "Transferred students - collected",
    otherRevenue: "Other revenue",
    allTotal: "All revenue - total fees", allCollected: "All revenue - collected",
    allDiscounts: "All revenue - discounts", allRemaining: "All revenue - outstanding",
    expenses: "Expenses", salaries: "Salaries",
    collectionRatePct: "Collection rate %", availableBalance: "Available balance",
    monthlySalariesSheet: "Monthly salaries", month: "Month",
    expensesByTypeSheet: "Expenses by type", type: "Type",
    printTitle: "Financial report", operatingExpenses: "Operating expenses",
    summaryTitle: "Financial summary", totalRevenue: "Total revenue",
    totalExpenses: "Total expenses", netBalance: "Net balance",
    overallCollectionRate: "Overall collection rate",
    revenueBreakdown: "Revenue breakdown",
    currentStudents: "Current students", transferredStudents: "Transferred students",
    total: "Total", collected: "Collected", discounts: "Discounts", outstanding: "Outstanding",
    collectionRate: "Collection rate",
    totalAmounts: "Total amounts", collectedAmounts: "Collected", remainingDebts: "Outstanding",
    expensesByType: "Expenses by type", noExpenses: "No expenses recorded",
    monthlySalaries: "Monthly salaries", noSalaries: "No salaries recorded",
  } : {
    exportExcel: "تحميل اكسل", exporting: "جارٍ التصدير...", print: "طباعة",
    fileName: "التقرير_المالي", summarySheet: "الملخص المالي",
    item: "البند", amount: "المبلغ",
    currentTotal: "واردات الطلاب الحاليين - المبالغ الكلية",
    currentCollected: "واردات الطلاب الحاليين - المستحصلة",
    currentDiscounts: "واردات الطلاب الحاليين - الخصومات",
    currentRemaining: "واردات الطلاب الحاليين - الديون",
    transferredTotal: "واردات المنقولين - المبالغ الكلية",
    transferredCollected: "واردات المنقولين - المستحصلة",
    otherRevenue: "واردات أخرى",
    allTotal: "جميع الواردات - المبالغ الكلية", allCollected: "جميع الواردات - المستحصلة",
    allDiscounts: "جميع الواردات - الخصومات", allRemaining: "جميع الواردات - الديون",
    expenses: "المصروفات", salaries: "الرواتب",
    collectionRatePct: "نسبة التحصيل %", availableBalance: "الرصيد المتاح",
    monthlySalariesSheet: "الرواتب الشهرية", month: "الشهر",
    expensesByTypeSheet: "المصاريف حسب النوع", type: "النوع",
    printTitle: "التقرير المالي", operatingExpenses: "المصروفات التشغيلية",
    summaryTitle: "ملخص مالي", totalRevenue: "إجمالي الواردات",
    totalExpenses: "إجمالي المصاريف", netBalance: "الرصيد الصافي",
    overallCollectionRate: "نسبة التحصيل الكلي",
    revenueBreakdown: "تفصيل الواردات",
    currentStudents: "الطلاب الحاليين", transferredStudents: "الطلاب المنقولين",
    total: "الكلي", collected: "المستحصل", discounts: "الخصومات", outstanding: "الديون",
    collectionRate: "نسبة التحصيل",
    totalAmounts: "المبالغ الكلية", collectedAmounts: "المستحصلة", remainingDebts: "الديون المتبقية",
    expensesByType: "المصاريف حسب النوع", noExpenses: "لا توجد مصاريف مسجلة",
    monthlySalaries: "الرواتب الشهرية", noSalaries: "لا توجد رواتب مسجلة",
  }, [isEn]);

  const allRevenueTotalFees = metrics.currentStudentsTotalFees + metrics.transferredStudentsTotalFees + metrics.otherRevenueTotal;
  const allRevenueCollected = metrics.currentStudentsCollected + metrics.transferredStudentsCollected + metrics.otherRevenueTotal;
  const allRevenueDiscounts = metrics.currentStudentsDiscounts + metrics.transferredStudentsDiscounts;
  const allRevenueRemaining = metrics.currentStudentsRemaining + metrics.transferredStudentsRemaining;
  const collectionRate = allRevenueTotalFees > 0 ? Math.round((allRevenueCollected / allRevenueTotalFees) * 100) : 0;
  const availableBalance = allRevenueCollected - metrics.expenseVolume - metrics.salaryVolume;
  const totalExpenses = metrics.expenseVolume + metrics.salaryVolume;

  const runtimeBranding = useRuntimeBranding();
  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await downloadExcelExport({
        filename: `${c.fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheets: [
          {
            name: "financial_summary",
            title: c.summarySheet,
            columns: [
              { header: c.item, key: "label", width: 35 },
              { header: c.amount, key: "amount", width: 20, numFmt: "#,##0" as const },
            ],
            rows: [
              { label: c.currentTotal, amount: metrics.currentStudentsTotalFees },
              { label: c.currentCollected, amount: metrics.currentStudentsCollected },
              { label: c.currentDiscounts, amount: metrics.currentStudentsDiscounts },
              { label: c.currentRemaining, amount: metrics.currentStudentsRemaining },
              { label: c.transferredTotal, amount: metrics.transferredStudentsTotalFees },
              { label: c.transferredCollected, amount: metrics.transferredStudentsCollected },
              { label: c.otherRevenue, amount: metrics.otherRevenueTotal },
              { label: c.allTotal, amount: allRevenueTotalFees },
              { label: c.allCollected, amount: allRevenueCollected },
              { label: c.allDiscounts, amount: allRevenueDiscounts },
              { label: c.allRemaining, amount: allRevenueRemaining },
              { label: c.expenses, amount: metrics.expenseVolume },
              { label: c.salaries, amount: metrics.salaryVolume },
              { label: c.collectionRatePct, amount: collectionRate },
              { label: c.availableBalance, amount: availableBalance },
            ],
          },
          ...(metrics.salaryByMonth.length > 0 ? [{
            name: "monthly_salaries",
            title: c.monthlySalariesSheet,
            columns: [
              { header: c.month, key: "month", width: 20 },
              { header: c.amount, key: "total", width: 20, numFmt: "#,##0" as const },
            ],
            rows: metrics.salaryByMonth.map((s) => ({ month: formatMonth(s.month, isEn), total: s.total })),
          }] : []),
          ...(metrics.expensesByType.length > 0 ? [{
            name: "expenses_by_type",
            title: c.expensesByTypeSheet,
            columns: [
              { header: c.type, key: "name", width: 30 },
              { header: c.amount, key: "total", width: 20, numFmt: "#,##0" as const },
            ],
            rows: metrics.expensesByType.map((e) => ({ name: e.name, total: e.total })),
          }] : []),
        ],
      });
    } catch { /* silent */ } finally { setExporting(false); }
  };

  const handlePrint = () => {
    const rows: [string, string][] = [
      [c.currentCollected, `${currency} ${formatNumber(metrics.currentStudentsCollected)}`],
      [c.transferredCollected, `${currency} ${formatNumber(metrics.transferredStudentsCollected)}`],
      [c.otherRevenue, `${currency} ${formatNumber(metrics.otherRevenueTotal)}`],
      [c.allCollected, `${currency} ${formatNumber(allRevenueCollected)}`],
      [c.operatingExpenses, `${currency} ${formatNumber(metrics.expenseVolume)}`],
      [c.salaries, `${currency} ${formatNumber(metrics.salaryVolume)}`],
      [c.collectionRate, `${collectionRate}%`],
      [c.availableBalance, `${currency} ${formatNumber(availableBalance)}`],
    ];
    const html = wrapPrintDocument({
      title: c.printTitle,
      branding: {
        schoolName: runtimeBranding.schoolName,
        logoUrl: runtimeBranding.logoUrl,
        primaryColor: runtimeBranding.primaryColor,
        secondaryColor: runtimeBranding.secondaryColor,
        locale: isEn ? "en" : "ar",
      },
      bodyHtml: `<table><thead><tr><th>${c.item}</th><th>${c.amount}</th></tr></thead>
        <tbody>${rows.map(([l, v]) => `<tr><td>${l}</td><td style="font-weight:bold">${v}</td></tr>`).join("")}</tbody>
      </table>`,
    });
    printHtmlDocument(html);
  };

  return (
    <div className="space-y-5">

      {/* ── Action buttons ── */}
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={exporting}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-secondary)] text-xs font-black hover:bg-[color-mix(in_srgb,var(--success)_10%,transparent)] hover:text-[var(--success)] hover:border-[color-mix(in_srgb,var(--success)_25%,transparent)] transition-all disabled:opacity-50"
        >
          <Download size={14} />
          {exporting ? c.exporting : c.exportExcel}
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-secondary)] text-xs font-black hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-[var(--primary)] hover:border-[color-mix(in_srgb,var(--primary)_25%,transparent)] transition-all"
        >
          <Printer size={14} />
          {c.print}
        </button>
      </div>

      {/* ── Financial Summary ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-[var(--border)]">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}>
            <TrendingUp size={18} />
          </div>
          <h3 className="text-base font-black text-[var(--text-primary)]">{c.summaryTitle}</h3>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-[var(--border)]">
          {[
            { label: c.totalRevenue, value: allRevenueCollected, color: "var(--success)", icon: ArrowUp },
            { label: c.totalExpenses, value: totalExpenses, color: "var(--danger)", icon: ArrowDown },
            { label: c.netBalance, value: availableBalance, color: availableBalance >= 0 ? "var(--success)" : "var(--danger)", icon: TrendingUp },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="px-5 py-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `color-mix(in srgb, ${item.color} 12%, transparent)`, color: item.color }}>
                    <Icon size={16} />
                  </div>
                  <span className="text-xs font-bold text-[var(--text-muted)] leading-tight">{item.label}</span>
                </div>
                <div className="text-3xl font-black tabular-nums leading-none" style={{ color: item.color }}>
                  {currency} {formatNumber(item.value)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Collection Rate bar */}
        <div className="px-6 pb-5">
          <div className="rounded-xl p-4" style={{ background: "color-mix(in srgb, var(--success) 5%, var(--surface-soft))" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{c.overallCollectionRate}</span>
              <span className="text-sm font-black" style={{ color: collectionRate >= 80 ? "var(--success)" : collectionRate >= 50 ? "var(--warning)" : "var(--danger)" }}>
                {collectionRate}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-[var(--border)]">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(collectionRate, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{ backgroundColor: collectionRate >= 80 ? "var(--success)" : collectionRate >= 50 ? "var(--warning)" : "var(--danger)" }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Revenue Breakdown ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden"
      >
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-[var(--border)]">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)" }}>
            <HandCoins size={18} />
          </div>
          <h3 className="text-base font-black text-[var(--text-primary)]">{c.revenueBreakdown}</h3>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              title: c.currentStudents,
              icon: Users,
              color: "var(--info)",
              totalFees: metrics.currentStudentsTotalFees,
              collected: metrics.currentStudentsCollected,
              discounts: metrics.currentStudentsDiscounts,
              remaining: metrics.currentStudentsRemaining,
            },
            {
              title: c.transferredStudents,
              icon: Users,
              color: "var(--primary)",
              totalFees: metrics.transferredStudentsTotalFees,
              collected: metrics.transferredStudentsCollected,
              discounts: metrics.transferredStudentsDiscounts,
              remaining: metrics.transferredStudentsRemaining,
            },
            {
              title: c.otherRevenue,
              icon: HandCoins,
              color: "var(--success)",
              totalFees: metrics.otherRevenueTotal,
              collected: metrics.otherRevenueTotal,
              discounts: 0,
              remaining: 0,
            },
          ].map((src, i) => {
            const Icon = src.icon;
            const rate = src.totalFees > 0 ? Math.round((src.collected / src.totalFees) * 100) : 0;
            return (
              <div key={i} className="rounded-xl p-4"
                style={{ background: `color-mix(in srgb, ${src.color} 5%, var(--surface-soft))` }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `color-mix(in srgb, ${src.color} 15%, transparent)`, color: src.color }}>
                    <Icon size={16} />
                  </div>
                  <span className="text-sm font-black text-[var(--text-primary)]">{src.title}</span>
                </div>
                <div className="space-y-2.5">
                  {[
                    { label: c.total, value: src.totalFees, color: "var(--text-primary)" },
                    { label: c.collected, value: src.collected, color: "var(--success)" },
                    { label: c.discounts, value: src.discounts, color: "var(--warning)" },
                    { label: c.outstanding, value: src.remaining, color: "var(--danger)" },
                  ].map((row, j) => (
                    <div key={j} className="flex items-center justify-between gap-2 py-0.5">
                      <span className="text-xs font-bold text-[var(--text-muted)] shrink-0">{row.label}</span>
                      <span className="text-lg font-black tabular-nums leading-none" style={{ color: row.color }}>{currency} {formatNumber(row.value)}</span>
                    </div>
                  ))}
                </div>
                {src.totalFees > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)]">
                    <div className="flex justify-between text-[9px] font-black mb-1.5 text-[var(--text-muted)]">
                      <span>{c.collectionRate}</span>
                      <span style={{ color: src.color }}>{rate}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden bg-[var(--border)]">
                      <motion.div className="h-full rounded-full" initial={{ width: 0 }}
                        animate={{ width: `${Math.min(rate, 100)}%` }}
                        transition={{ duration: 0.7, delay: i * 0.1, ease: "easeOut" }}
                        style={{ backgroundColor: src.color }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* All revenue summary row */}
        <div className="mx-5 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: c.totalAmounts, value: allRevenueTotalFees, color: "var(--info)" },
            { label: c.collectedAmounts, value: allRevenueCollected, color: "var(--success)" },
            { label: c.discounts, value: allRevenueDiscounts, color: "var(--warning)" },
            { label: c.remainingDebts, value: allRevenueRemaining, color: "var(--danger)" },
          ].map((item, i) => (
            <div key={i} className="rounded-xl p-3 bg-[var(--surface-soft)] text-center">
              <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">{item.label}</div>
              <div className="text-sm font-black" style={{ color: item.color }}>{currency} {formatNumber(item.value)}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Two columns: Expenses by type + Salaries by month ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Expenses by type */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden"
        >
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "color-mix(in srgb, var(--danger) 12%, transparent)", color: "var(--danger)" }}>
                <Wallet size={18} />
              </div>
              <h3 className="text-base font-black text-[var(--text-primary)]">{c.expensesByType}</h3>
            </div>
            <span className="text-sm font-black" style={{ color: "var(--danger)" }}>{currency} {formatNumber(metrics.expenseVolume)}</span>
          </div>
          <div className="p-5 space-y-3">
            {metrics.expensesByType.length === 0 ? (
              <div className="py-5 flex items-center gap-3 rounded-xl px-4"
                style={{ background: "color-mix(in srgb, var(--danger) 5%, var(--surface-soft))" }}>
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "color-mix(in srgb, var(--danger) 12%, transparent)", color: "var(--danger)" }}>
                  <Wallet size={18} />
                </div>
                <p className="text-sm font-bold text-[var(--text-muted)]">{c.noExpenses}</p>
              </div>
            ) : (
              metrics.expensesByType.map((item, idx) => {
                const pct = metrics.expenseVolume > 0 ? (item.total / metrics.expenseVolume) * 100 : 0;
                const color = BAR_COLORS[idx % BAR_COLORS.length];
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs font-bold text-[var(--text-secondary)]">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[var(--text-muted)]">{Math.round(pct)}%</span>
                        <span className="text-xs font-black text-[var(--text-primary)]">{currency} {formatNumber(item.total)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden bg-[var(--surface-soft)]">
                      <motion.div className="h-full rounded-full" initial={{ width: 0 }}
                        animate={{ width: `${Math.min(pct, 100)}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.05, ease: "easeOut" }}
                        style={{ backgroundColor: color }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Salaries by month */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden"
        >
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}>
                <Briefcase size={18} />
              </div>
              <h3 className="text-base font-black text-[var(--text-primary)]">{c.monthlySalaries}</h3>
            </div>
            <span className="text-sm font-black" style={{ color: "var(--primary)" }}>{currency} {formatNumber(metrics.salaryVolume)}</span>
          </div>
          <div className="p-5">
            {metrics.salaryByMonth.length === 0 ? (
              <div className="py-5 flex items-center gap-3 rounded-xl px-4"
                style={{ background: "color-mix(in srgb, var(--primary) 5%, var(--surface-soft))" }}>
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}>
                  <Briefcase size={18} />
                </div>
                <p className="text-sm font-bold text-[var(--text-muted)]">{c.noSalaries}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const maxSalary = Math.max(...metrics.salaryByMonth.map((s) => s.total), 1);
                  return metrics.salaryByMonth.map((item, idx) => {
                    const pct = (item.total / maxSalary) * 100;
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)" }}>
                          <CalendarDays size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-black text-[var(--text-muted)]">{formatMonth(item.month, isEn)}</span>
                            <span className="text-xs font-black text-[var(--text-primary)]">{currency} {formatNumber(item.total)}</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden bg-[var(--surface-soft)]">
                            <motion.div className="h-full rounded-full" initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, delay: idx * 0.05, ease: "easeOut" }}
                              style={{ backgroundColor: "var(--primary)" }} />
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </motion.div>
      </div>

    </div>
  );
}
