"use client";

import { useState } from "react";
import type { SchoolManagerBranchSummary } from "@/lib/school-manager/overview";
import { BranchDetailPanel } from "./BranchDetailPanel";
import { Layers, Users } from "@/lib/icons";

type Locale = "ar" | "en";

interface BranchCardClientProps {
  locale: Locale;
  branch: SchoolManagerBranchSummary;
  schoolId: string;
}

function fmt(value: number) {
  return value.toLocaleString("en-US");
}

function fmtCurrency(value: number) {
  return `${fmt(value)} IQD`;
}

function pctColor(pct: number) {
  if (pct >= 75) return "text-[var(--success)]";
  if (pct >= 40) return "text-[var(--warning)]";
  return "text-[var(--danger)]";
}

/** SVG donut gauge — replaces the plain circular border */
function DonutGauge({ pct }: { pct: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, Math.max(0, pct)) / 100);
  const arcColor =
    pct >= 75 ? "var(--success)" : pct >= 40 ? "#fbbf24" : "var(--danger)";

  return (
    <div className="relative h-[72px] w-[72px]">
      <svg
        width="72" height="72" viewBox="0 0 72 72"
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Track */}
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
        {/* Arc */}
        <circle
          cx="36" cy="36" r={r}
          fill="none"
          stroke={arcColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex items-baseline gap-0.5 leading-none">
          <span className="text-lg font-black tabular-nums text-white">{pct}</span>
          <span className="text-[9px] font-black text-white/70">%</span>
        </div>
        <div className="text-[8px] font-bold text-white/50 mt-0.5">تحصيل</div>
      </div>
    </div>
  );
}

const COPY = {
  ar: {
    afterDiscount: "الرسوم بعد التخفيض",
    paid: "المحصّل",
    transferredPaid: "مدفوع المنقولين",
    paidWithTransferred: "المدفوع + المنقولين",
    remaining: "المتبقي",
    expenses: "المصروفات",
    income: "الإيرادات",
    net: "الصافي",
    netWithIncome: "الصافي الشامل",
    discount: "التخفيض",
    students: "طالب",
    transferredCount: "المنقولين",
    viewStudents: "عرض الطلاب",
    branchDetails: "تفاصيل الفرع",
    teachers: "أستاذ",
    subjects: "مادة",
    andMore: "و",
    moreSubjects: "أخرى",
    noTeachers: "لا يوجد أساتذة",
    sectionFees: "الرسوم",
    sectionCollection: "التحصيل",
    sectionFinance: "المالية",
  },
  en: {
    afterDiscount: "Fees After Discount",
    paid: "Collected",
    transferredPaid: "Transferred Paid",
    paidWithTransferred: "Paid + Transferred",
    remaining: "Remaining",
    expenses: "Expenses",
    income: "Revenue",
    net: "Net",
    netWithIncome: "Net (incl. Revenue)",
    discount: "Discount",
    students: "students",
    transferredCount: "Transferred",
    viewStudents: "View Students",
    branchDetails: "Branch Details",
    teachers: "teachers",
    subjects: "subjects",
    andMore: "and",
    moreSubjects: "more",
    noTeachers: "No teachers",
    sectionFees: "Fees",
    sectionCollection: "Collection",
    sectionFinance: "Finance",
  },
} as const;

function buildExportHref(format: "excel" | "word" | "pdf" | "csv", branchId?: string | null) {
  const params = new URLSearchParams({ format });
  if (branchId) params.set("branchId", branchId);
  return `/api/web/group/export?${params.toString()}`;
}

const MAX_VISIBLE_SUBJECTS = 5;

function SubjectChips({
  teachersBySubject,
  andMore,
  moreSubjects,
}: {
  teachersBySubject: Array<{ subject: string; count: number }>;
  andMore: string;
  moreSubjects: string;
}) {
  if (teachersBySubject.length === 0) return null;
  const visible = teachersBySubject.slice(0, MAX_VISIBLE_SUBJECTS);
  const extra = teachersBySubject.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map(({ subject, count }) => (
        <span
          key={subject}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--primary)]/20 bg-[var(--primary-soft)] px-2.5 py-1 text-[11px] font-black text-[var(--primary)]"
        >
          {subject}
          <span className="rounded-full bg-[var(--primary)]/15 px-1.5 py-0.5 text-[9px] tabular-nums">{count}</span>
        </span>
      ))}
      {extra > 0 && (
        <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-black text-[var(--text-muted)]">
          {andMore} {extra} {moreSubjects}
        </span>
      )}
    </div>
  );
}

function StatChip({ label, value, valueColor, borderColor }: {
  label: string;
  value: string;
  valueColor: string;
  borderColor: string;
}) {
  return (
    <div className={`rounded-lg border border-slate-200 border-s-4 bg-white px-3 py-3 ${borderColor}`}>
      <div className="text-[11px] font-bold text-slate-500 leading-none">{label}</div>
      <div className={`mt-1.5 text-sm font-black tabular-nums font-mono leading-tight ${valueColor}`}>{value}</div>
    </div>
  );
}

function SectionDivider({ icon, label, dotColor }: {
  icon: React.ReactNode;
  label: string;
  dotColor: string;
}) {
  return (
    <div className="flex items-center gap-2 mt-4 mb-2">
      <div className="flex items-center gap-1.5 text-slate-400">
        <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`} />
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

export function BranchCardClient({ locale, branch, schoolId }: BranchCardClientProps) {
  const [showDetail, setShowDetail] = useState(false);
  const copy = COPY[locale];
  const pct = branch.paidPercentage;
  const net = branch.totalPaid - branch.totalExpenses;
  const netWithIncome = branch.totalPaidWithTransferred + branch.totalIncomes - branch.totalExpenses;
  const subjectsCount = branch.teachersBySubject.length;

  return (
    <section className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
      {/* Blue accent top line */}
      <div className="h-1 w-full bg-[#3b82f6]" />

      {/* ── Header ── */}
      <div className="relative overflow-hidden bg-[#0f172a] px-6 pt-5 pb-5">
        {/* Single subtle blob */}
        <div className="pointer-events-none absolute -top-8 -end-8 h-32 w-32 rounded-full bg-white/4 blur-2xl" />
        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M0 0h1v20H0zM19 0h1v20h-1zM0 0v1h20V0zM0 19v1h20v-1z'/%3E%3C/g%3E%3C/svg%3E\")" }}
        />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 pt-1">
            <h2 className="truncate text-2xl font-black text-white leading-tight">{branch.branchName}</h2>
            <p className="mt-1.5 text-sm font-bold text-white/70">
              {fmt(branch.studentsCount)} {copy.students}
              {branch.transferredCount > 0 && (
                <span className="text-white/50 mr-2"> · {fmt(branch.transferredCount)} {copy.transferredCount}</span>
              )}
            </p>
            {branch.teachersCount > 0 ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-white/55">
                <Users size={11} />
                {fmt(branch.teachersCount)} {copy.teachers}
                {subjectsCount > 0 && (
                  <span className="opacity-70">· {subjectsCount} {copy.subjects}</span>
                )}
              </p>
            ) : (
              <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-white/35">
                <Users size={11} />
                {copy.noTeachers}
              </p>
            )}
          </div>

          {/* SVG Donut Gauge */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            <DonutGauge pct={pct} />
            {branch.branchId && (
              <a
                href={`/${locale}/branches/${branch.branchId}/students`}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-white/60 hover:bg-white/25 hover:text-white transition-colors"
                title={copy.viewStudents}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative z-10 mt-4">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className={`h-full rounded-full transition-all duration-700 ${pct >= 75 ? "bg-white" : pct >= 40 ? "bg-amber-300" : "bg-red-300"}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Featured 3-stat strip ── */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 rtl:divide-x-reverse border-b border-slate-100">
        <div className="px-4 py-4 text-center">
          <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{copy.afterDiscount}</div>
          <div className="mt-1 text-base font-black tabular-nums font-mono text-[#0f172a] leading-tight">{fmtCurrency(branch.totalFeesAfterDiscount)}</div>
        </div>
        <div className="px-4 py-4 text-center">
          <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--success)]/70">{copy.paid}</div>
          <div className="mt-1 text-base font-black tabular-nums font-mono text-[var(--success)] leading-tight">{fmtCurrency(branch.totalPaid)}</div>
          <div className="text-[9px] font-mono text-[var(--success)]/60 mt-0.5">{fmt(branch.paidPercentage)}%</div>
        </div>
        <div className="px-4 py-4 text-center">
          <div className={`text-[9px] font-bold uppercase tracking-widest ${branch.totalRemaining > 0 ? "text-[var(--danger)]/70" : "text-[var(--success)]/70"}`}>{copy.remaining}</div>
          <div className={`mt-1 text-base font-black tabular-nums font-mono leading-tight ${branch.totalRemaining > 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{fmtCurrency(branch.totalRemaining)}</div>
          <div className={`text-[8px] mt-0.5 ${branch.totalRemaining > 0 ? "text-[var(--danger)]/60" : "text-[var(--success)]/60"}`}>
            {branch.totalRemaining > 0 ? (locale === "ar" ? "متأخر" : "overdue") : "✓"}
          </div>
        </div>
      </div>

      {/* ── Grouped stats ── */}
      <div className="flex-1 px-5 pb-3">
        <SectionDivider
          label={copy.sectionFees}
          dotColor="bg-[var(--info)]"
          icon={
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
          }
        />
        <div className="grid grid-cols-2 gap-1.5">
          <StatChip label={copy.discount} value={fmtCurrency(branch.totalDiscount)} valueColor="text-[var(--info)]" borderColor="border-s-[var(--info)]" />
          <StatChip label={copy.transferredPaid} value={fmtCurrency(branch.transferredPaid)} valueColor="text-[var(--warning)]" borderColor="border-s-[var(--warning)]" />
        </div>

        <SectionDivider
          label={copy.sectionCollection}
          dotColor="bg-[var(--success)]"
          icon={
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            </svg>
          }
        />
        <div className="grid grid-cols-2 gap-1.5">
          <StatChip label={copy.paidWithTransferred} value={fmtCurrency(branch.totalPaidWithTransferred)} valueColor="text-[var(--success)]" borderColor="border-s-[var(--success)]" />
          <StatChip label={copy.remaining} value={fmtCurrency(branch.totalRemaining)} valueColor={branch.totalRemaining > 0 ? "text-[var(--danger)]" : "text-[var(--success)]"} borderColor={branch.totalRemaining > 0 ? "border-s-[var(--danger)]" : "border-s-[var(--success)]"} />
        </div>

        <SectionDivider
          label={copy.sectionFinance}
          dotColor="bg-[var(--warning)]"
          icon={
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          }
        />
        <div className="grid grid-cols-2 gap-1.5">
          <StatChip label={copy.expenses} value={fmtCurrency(branch.totalExpenses)} valueColor="text-[var(--warning)]" borderColor="border-s-[var(--warning)]" />
          <StatChip label={copy.income} value={fmtCurrency(branch.totalIncomes)} valueColor="text-[#20B96B]" borderColor="border-s-[#20B96B]" />
          <StatChip label={copy.net} value={fmtCurrency(net)} valueColor={net >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"} borderColor={net >= 0 ? "border-s-[var(--success)]" : "border-s-[var(--danger)]"} />
          <StatChip label={copy.netWithIncome} value={fmtCurrency(netWithIncome)} valueColor={netWithIncome >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"} borderColor={netWithIncome >= 0 ? "border-s-[var(--success)]" : "border-s-[var(--danger)]"} />
        </div>
      </div>

      {/* ── Branch Details toggle ── */}
      {branch.branchId && (
        <div className="px-5 pb-0">
          <button
            onClick={() => setShowDetail((v) => !v)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] py-2.5 text-xs font-black text-[var(--text-secondary)] transition-all hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
          >
            <Layers size={13} />
            {copy.branchDetails}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                 className={`transition-transform duration-200 ${showDetail ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showDetail && (
            <div className="mt-3 space-y-3">
              {branch.teachersBySubject.length > 0 && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                    <Users size={10} />
                    {fmt(branch.teachersCount)} {copy.teachers} · {subjectsCount} {copy.subjects}
                  </p>
                  <SubjectChips
                    teachersBySubject={branch.teachersBySubject}
                    andMore={copy.andMore}
                    moreSubjects={copy.moreSubjects}
                  />
                </div>
              )}
              <BranchDetailPanel schoolId={schoolId} branchId={branch.branchId} />
            </div>
          )}
        </div>
      )}

      {/* ── Export ── */}
      <div className="border-t border-slate-100 px-5 py-3 mt-3">
        <div className="flex items-center gap-1.5">
          {([
            {
              format: "excel" as const, label: "Excel",
              hover: "hover:border-emerald-500 hover:text-emerald-700",
              icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
            },
            {
              format: "word" as const, label: "Word",
              hover: "hover:border-blue-500 hover:text-blue-700",
              icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
            },
            {
              format: "pdf" as const, label: "PDF",
              hover: "hover:border-red-500 hover:text-red-700",
              icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
            },
            {
              format: "csv" as const, label: "CSV",
              hover: "hover:border-orange-500 hover:text-orange-700",
              icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
            },
          ]).map(({ format, label, hover, icon }) => (
            <a
              key={format}
              href={buildExportHref(format, branch.branchId)}
              target={format !== "excel" && format !== "csv" ? "_blank" : undefined}
              rel="noreferrer"
              className={`flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-500 transition-all ${hover}`}
            >
              {icon}
              {label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
