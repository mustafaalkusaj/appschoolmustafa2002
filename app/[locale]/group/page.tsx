import { redirect } from "next/navigation";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { localizeAppPath } from "@/lib/locale-routing";
import { resolveSchoolManagerOverview } from "@/lib/school-manager/overview";
import { SchoolManagerComparisonChart } from "./_components/SchoolManagerComparisonChart";
import { RefreshButton } from "./_components/RefreshButton";
import { BranchTableClient } from "./_components/BranchTableClient";
import { GroupRevealSection } from "./_components/GroupRevealSection";
import { GroupHeroPercent } from "./_components/GroupHeroPercent";
import { GroupSectionNav } from "./_components/GroupSectionNav";
import { GroupExportBar } from "./_components/GroupExportBar";

export const dynamic = "force-dynamic";

const COPY = {
  ar: {
    title: "لوحة المدير المالية",
    subtitle: "نظرة شاملة على أداء الفروع والتحصيل المالي",
    branchSection: "أداء الفروع",
    totalSection: "ملخص المدرسة الكلي",
    analysisTitle: "تحليل الأداء",
    analysisSubtitle: "أبرز المؤشرات التنفيذية على مستوى المدرسة",
    beforeDiscount: "الرسوم قبل التخفيض",
    afterDiscount: "الرسوم بعد التخفيض",
    discount: "التخفيض",
    remaining: "المتبقي",
    paid: "المحصّل",
    transferredPaid: "مدفوع المنقولين",
    paidWithTransferred: "المدفوع + المنقولين",
    transferredCount: "المنقولين",
    expenses: "المصروفات",
    students: "طالب",
    paidPercentage: "نسبة التحصيل",
    excel: "Excel",
    word: "Word",
    pdf: "PDF",
    strongestCollection: "أفضل تحصيل",
    highestRemaining: "أعلى متبقي",
    highestExpenses: "أعلى مصروفات",
    noBranches: "لا توجد فروع نشطة مرتبطة بهذه المدرسة حاليًا.",
    generatedAt: "آخر تحديث",
    schoolTotalLabel: "إجمالي المدرسة",
    export: "تصدير",
    viewStudents: "عرض الطلاب",
    income: "الإيرادات",
    net: "الصافي",
    netWithIncome: "الصافي الشامل",
    feesWithTransferred: "الرسوم مع المنقولين",
    collectionRate: "معدل التحصيل",
    totalBranches: "فرع",
  },
  en: {
    title: "Financial Manager Dashboard",
    subtitle: "Comprehensive view of branch performance and financial collection",
    branchSection: "Branch Performance",
    totalSection: "School Summary",
    analysisTitle: "Performance Analysis",
    analysisSubtitle: "Key executive indicators at the school level",
    beforeDiscount: "Fees Before Discount",
    afterDiscount: "Fees After Discount",
    discount: "Discount",
    remaining: "Remaining",
    paid: "Collected",
    transferredPaid: "Transferred Paid",
    paidWithTransferred: "Paid + Transferred",
    transferredCount: "Transferred",
    expenses: "Expenses",
    students: "students",
    paidPercentage: "Collection Rate",
    excel: "Excel",
    word: "Word",
    pdf: "PDF",
    strongestCollection: "Best Collection",
    highestRemaining: "Highest Outstanding",
    highestExpenses: "Highest Expenses",
    noBranches: "No active branches linked to this school yet.",
    generatedAt: "Last updated",
    schoolTotalLabel: "School Total",
    export: "Export",
    viewStudents: "View Students",
    income: "Revenue",
    net: "Net",
    netWithIncome: "Net (incl. Revenue)",
    feesWithTransferred: "Fees with Transferred",
    collectionRate: "Collection Rate",
    totalBranches: "branches",
  },
} as const;

type Locale = keyof typeof COPY;

function fmt(value: number) {
  return value.toLocaleString("en-US");
}

function fmtIQD(value: number) {
  if (Math.abs(value) >= 1_000_000_000)
    return `${(value / 1_000_000_000).toFixed(2)} مليار IQD`;
  if (Math.abs(value) >= 1_000_000)
    return `${(value / 1_000_000).toFixed(1)} مليون IQD`;
  return `${value.toLocaleString("en-US")} IQD`;
}

function pctColor(pct: number) {
  if (pct >= 75) return "text-emerald-600";
  if (pct >= 40) return "text-amber-600";
  return "text-red-600";
}

function pctBg(pct: number) {
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function formatUpdatedAt(locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-IQ" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

function buildExportHref(format: "excel" | "word" | "pdf" | "csv") {
  return `/api/web/group/export?format=${format}`;
}

function MiniRingHero({ pct, size = 44, stroke = 4 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, pct) / 100) * circ;
  const color = pct >= 75 ? "#059669" : pct >= 40 ? "#d97706" : "#dc2626";
  return (
    <svg
      width={size}
      height={size}
      className="shrink-0"
      style={{ transform: "rotate(-90deg)" }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#f3f4f6"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

function SummaryGroup({
  title,
  accentCls,
  rows,
}: {
  title: string;
  accentCls: string;
  rows: [string, string, string?][];
}) {
  return (
    <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
      <div className={`border-t-[3px] px-4 py-3 ${accentCls}`}>
        <span className="text-[12px] font-bold text-gray-800">{title}</span>
      </div>
      <div className="divide-y divide-gray-50 px-4 pb-3">
        {rows.map(([label, value, color]) => (
          <div key={label} className="flex items-center justify-between py-2">
            <span className="text-[12px] text-gray-500">{label}</span>
            <span
              className={`font-mono text-[13px] font-bold tabular-nums ${color || "text-gray-800"}`}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function GroupDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const copy = COPY[locale];

  const context = await resolveSchoolScopedActorContext(null, {
    allowedRoles: ["admin"],
    roleDeniedMessage:
      locale === "ar"
        ? "هذه الصفحة مخصصة لمدير المدرسة على مستوى المدرسة فقط."
        : "This page is reserved for school-level managers only.",
  });

  if (!context.ok) {
    if (context.status === 401) redirect(localizeAppPath("/login", locale));
    redirect(localizeAppPath("/access-denied", locale));
  }

  if (context.value.scopeLevel !== "group_admin") {
    redirect(localizeAppPath("/access-denied", locale));
  }

  const { actorSupabase, targetSchoolId } = context.value;
  const dataClient = createServiceSupabaseClient();

  const [{ data: school, error: schoolError }, overview] = await Promise.all([
    actorSupabase
      .from("schools")
      .select("id, name")
      .eq("id", targetSchoolId)
      .maybeSingle(),
    resolveSchoolManagerOverview(dataClient, targetSchoolId),
  ]);

  if (schoolError || !school?.id) redirect(localizeAppPath("/access-denied", locale));

  const totals = overview.totals;
  const net = totals.totalPaid - totals.totalExpenses;
  const netWithIncome =
    totals.totalPaidWithTransferred + totals.totalIncomes - totals.totalExpenses;
  const totalTeachers = overview.branches.reduce((sum, b) => sum + b.teachersCount, 0);

  const chartPoints = overview.branches.map((branch) => ({
    branchName: branch.branchName,
    totalFeesAfterDiscount: branch.totalFeesAfterDiscount,
    totalPaid: branch.totalPaid,
    totalRemaining: branch.totalRemaining,
    totalExpenses: branch.totalExpenses,
    totalIncomes: branch.totalIncomes,
  }));

  return (
    <div className="space-y-5 pb-12">
      <GroupSectionNav />

      {/* ── Hero ── */}
      <GroupRevealSection delay={0}>
      <section id="sec-hero" className="relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* Gradient top stripe */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600 opacity-70" />

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white shadow-md">
              م
            </div>
            <div>
              <h1 className="text-[18px] font-black leading-tight text-gray-900">{school!.name}</h1>
              <p className="text-[11px] text-gray-400">{copy.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50 px-3 py-1.5">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="font-mono text-[10px] font-semibold text-gray-500">
                {formatUpdatedAt(locale)}
              </span>
            </div>
            <RefreshButton locale={locale} />
          </div>
        </div>

        {/* Main metrics */}
        <div className="grid grid-cols-[auto_1px_1fr] items-center gap-0 px-8 pb-5 pt-7">
          {/* Big ring with % inside */}
          <div className="flex flex-col items-center gap-2 pe-9">
            <div className="relative flex items-center justify-center">
              <MiniRingHero pct={totals.paidPercentage} size={104} stroke={6} />
              <div className="absolute flex flex-col items-center">
                <GroupHeroPercent
                  value={totals.paidPercentage}
                  colorClass={pctColor(totals.paidPercentage)}
                />
                <span className="text-[10px] font-bold text-gray-400">%</span>
              </div>
            </div>
            <span className="text-center text-[10px] font-bold text-gray-400">
              {copy.collectionRate}
            </span>
          </div>

          {/* Vertical divider */}
          <div className="h-[70px] bg-gray-200" />

          {/* 4-stat grid */}
          <div className="grid grid-cols-4 gap-0 ps-6">
            {([
              { label: copy.afterDiscount, value: fmtIQD(totals.totalFeesAfterDiscount), sub: locale === "ar" ? "بعد الخصم" : "after discount" },
              { label: copy.paid, value: fmtIQD(totals.totalPaid), color: "text-emerald-600" },
              { label: copy.remaining, value: fmtIQD(totals.totalRemaining), color: "text-red-600" },
              { label: copy.expenses, value: fmtIQD(totals.totalExpenses) },
            ] as { label: string; value: string; color?: string; sub?: string }[]).map((s, i) => (
              <div key={s.label} className={`flex flex-col gap-1.5 ${i > 0 ? "ps-5 border-s border-gray-100" : ""} ${i < 3 ? "pe-5" : ""}`}>
                <div className="text-[10px] font-semibold text-gray-400">{s.label}</div>
                <div className={`font-mono text-[22px] font-black leading-none tabular-nums ${s.color || "text-gray-900"}`}>
                  {s.value}
                </div>
                {s.sub && <span className="text-[10px] text-gray-400">{s.sub}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom KPI strip */}
        <div className="border-t border-gray-100 px-8 pb-4 pt-0">
          <div className="flex">
            {([
              { label: locale === "ar" ? "الإيرادات" : "Revenue", value: fmtIQD(totals.totalIncomes) },
              { label: locale === "ar" ? "الصافي" : "Net", value: fmtIQD(net), color: net >= 0 ? "text-emerald-600" : "text-red-600" },
              { label: locale === "ar" ? "الخصومات" : "Discounts", value: fmtIQD(totals.totalDiscount) },
              { label: locale === "ar" ? "الطلاب" : "Students", value: fmt(totals.studentsCount) },
              { label: locale === "ar" ? "المعلمين" : "Teachers", value: fmt(totalTeachers) },
              { label: copy.transferredCount, value: fmt(totals.transferredCount) },
            ] as { label: string; value: string; color?: string }[]).map((kpi, i) => (
              <div
                key={kpi.label}
                className={`flex flex-1 items-center justify-center gap-1.5 py-3 ${i < 5 ? "border-e border-gray-100" : ""}`}
              >
                <span className="text-[10px] font-medium text-gray-400">{kpi.label}</span>
                <span className={`font-mono text-[14px] font-bold tabular-nums ${kpi.color || "text-gray-700"}`}>
                  {kpi.value}
                </span>
              </div>
            ))}
          </div>
          {/* Rate bar */}
          <div className="h-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all duration-700 ${pctBg(totals.paidPercentage)}`}
              style={{ width: `${Math.min(100, totals.paidPercentage)}%` }}
            />
          </div>
        </div>
      </section>
      </GroupRevealSection>

      {/* ── Alerts ── */}
      {(() => {
        const alerts: Array<{ type: "danger" | "warning"; branch: string; message: string }> = [];
        for (const b of overview.branches) {
          if (b.paidPercentage < 50)
            alerts.push({ type: "danger", branch: b.branchName, message: locale === "ar" ? `نسبة التحصيل منخفضة جداً — ${b.paidPercentage.toFixed(1)}% فقط` : `Very low collection rate — ${b.paidPercentage.toFixed(1)}%` });
          else if (b.paidPercentage < 70)
            alerts.push({ type: "warning", branch: b.branchName, message: locale === "ar" ? `نسبة التحصيل تحت الهدف — ${b.paidPercentage.toFixed(1)}%` : `Collection below target — ${b.paidPercentage.toFixed(1)}%` });
          if (b.totalExpenses > b.totalPaid * 0.5)
            alerts.push({ type: "warning", branch: b.branchName, message: locale === "ar" ? `المصروفات تتجاوز 50% من المحصّل` : `Expenses exceed 50% of collected` });
        }
        if (alerts.length === 0) return null;
        return (
          <GroupRevealSection delay={50}>
          <section id="sec-alerts">
            <div className="mb-3">
              <h2 className="text-sm font-bold text-gray-700">{locale === "ar" ? "التنبيهات" : "Alerts"}</h2>
              <p className="text-xs text-gray-400">{alerts.length} {locale === "ar" ? "تنبيه يتطلب الانتباه" : "alerts require attention"}</p>
            </div>
            <div className="flex flex-col gap-2">
              {alerts.map((a, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 border-s-[3px] ${
                    a.type === "danger"
                      ? "bg-red-50 border-red-500"
                      : "bg-amber-50 border-amber-500"
                  }`}
                >
                  <span className="text-base">{a.type === "danger" ? "⚠" : "⚡"}</span>
                  <span className="text-[13px] font-bold text-gray-900">{a.branch}</span>
                  <span className={`text-[12px] font-medium ${a.type === "danger" ? "text-red-600" : "text-amber-600"}`}>
                    {a.message}
                  </span>
                </div>
              ))}
            </div>
          </section>
          </GroupRevealSection>
        );
      })()}

      {/* ── Export Bar ── */}
      <GroupExportBar />

      {/* ── Branch Table ── */}
      <GroupRevealSection delay={100}>
      <section id="sec-branches">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700">{copy.branchSection}</h2>
          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-500">
            {fmt(overview.branches.length)} {copy.totalBranches}
          </span>
        </div>
        <BranchTableClient
          locale={locale}
          branches={overview.branches}
          schoolId={targetSchoolId}
        />
      </section>
      </GroupRevealSection>

      {/* ── Monthly Collection Trend ── */}
      {overview.branches.length > 1 && overview.branches[0].monthLabels.length > 0 && (() => {
        const monthLabels = overview.branches[0].monthLabels;
        const hasData = overview.branches.some(b => b.monthlyPayments.some(v => v > 0));
        if (!hasData) return null;

        const branchColors = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626", "#0891b2", "#db2777"];
        const W = 900, H = 280, padT = 20, padB = 44, padL = 60, padR = 20;
        const chartW = W - padL - padR;
        const chartH = H - padT - padB;
        const n = monthLabels.length;

        const allValues = overview.branches.flatMap(b => b.monthlyPayments);
        const maxVal = Math.max(...allValues, 1);

        function xPos(i: number) { return padL + (i / Math.max(n - 1, 1)) * chartW; }
        function yPos(v: number) { return padT + chartH - (v / maxVal) * chartH; }

        function smoothPath(data: number[]) {
          if (data.length < 2) return "";
          let d = `M${xPos(0)},${yPos(data[0])}`;
          for (let i = 1; i < data.length; i++) {
            const x0 = xPos(i - 1), y0 = yPos(data[i - 1]);
            const x1 = xPos(i), y1 = yPos(data[i]);
            const cpx = (x0 + x1) / 2;
            d += ` C${cpx},${y0} ${cpx},${y1} ${x1},${y1}`;
          }
          return d;
        }

        function areaPath(data: number[]) {
          const line = smoothPath(data);
          if (!line) return "";
          return line + ` L${xPos(data.length - 1)},${padT + chartH} L${xPos(0)},${padT + chartH} Z`;
        }

        const gridValues = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal];

        return (
          <GroupRevealSection delay={150}>
          <section id="sec-trend" className="overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-gray-900">{locale === "ar" ? "تطور التحصيل الشهري" : "Monthly Collection Trend"}</h2>
              <p className="text-xs text-gray-400">{locale === "ar" ? "المبالغ المحصّلة شهرياً لكل فرع" : "Monthly collected amounts per branch"}</p>
            </div>
            {/* Legend */}
            <div className="mb-4 flex flex-wrap gap-4">
              {overview.branches.map((b, bi) => {
                const color = branchColors[bi % branchColors.length];
                const lastVal = b.monthlyPayments[b.monthlyPayments.length - 1] ?? 0;
                return (
                  <div key={b.branchId ?? b.branchName} className="flex items-center gap-1.5">
                    <div className="h-0.5 w-4 rounded-full" style={{ background: color }} />
                    <span className="text-[11px] font-semibold text-gray-600">{b.branchName}</span>
                    <span className="font-mono text-[11px] font-bold" style={{ color }}>{fmtIQD(lastVal)}</span>
                  </div>
                );
              })}
            </div>
            <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
              <defs>
                {overview.branches.map((b, bi) => (
                  <linearGradient key={bi} id={`areaGradGroup${bi}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={branchColors[bi % branchColors.length]} stopOpacity="0.1" />
                    <stop offset="100%" stopColor={branchColors[bi % branchColors.length]} stopOpacity="0" />
                  </linearGradient>
                ))}
              </defs>
              {/* Grid lines */}
              {gridValues.map((v, gi) => (
                <g key={gi}>
                  <line x1={padL} x2={W - padR} y1={yPos(v)} y2={yPos(v)} stroke="#f3f4f6" strokeWidth={1} />
                  <text x={padL - 8} y={yPos(v) + 4} textAnchor="end" fontSize={9} fill="#9ca3af" fontFamily="monospace">
                    {v >= 1_000_000_000 ? `${(v/1_000_000_000).toFixed(1)}م` : v >= 1_000_000 ? `${(v/1_000_000).toFixed(0)}م` : v.toLocaleString("en-US")}
                  </text>
                </g>
              ))}
              {/* Month labels */}
              {monthLabels.map((m, i) => (
                <text key={i} x={xPos(i)} y={H - 10} textAnchor="middle" fontSize={10} fill="#9ca3af">{m}</text>
              ))}
              {/* Vertical grid */}
              {monthLabels.map((_, i) => (
                <line key={i} x1={xPos(i)} x2={xPos(i)} y1={padT} y2={padT + chartH} stroke="#f3f4f6" strokeWidth={0.5} strokeDasharray="4,4" />
              ))}
              {/* Lines */}
              {overview.branches.map((b, bi) => {
                const color = branchColors[bi % branchColors.length];
                const data = b.monthlyPayments;
                if (data.length < 2) return null;
                return (
                  <g key={b.branchId ?? b.branchName}>
                    <path d={areaPath(data)} fill={`url(#areaGradGroup${bi})`} />
                    <path d={smoothPath(data)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    {data.map((v, i) => (
                      <circle key={i} cx={xPos(i)} cy={yPos(v)} r={3} fill="white" stroke={color} strokeWidth={2} />
                    ))}
                  </g>
                );
              })}
            </svg>
          </section>
          </GroupRevealSection>
        );
      })()}

      {/* ── Analysis ── */}
      <GroupRevealSection delay={200}>
      <section id="sec-analysis">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-gray-700">{copy.analysisTitle}</h2>
          <p className="text-xs text-gray-400">{copy.analysisSubtitle}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Best Collection */}
          {overview.analysis.strongestCollectionBranch &&
            (() => {
              const b = overview.analysis.strongestCollectionBranch;
              return (
                <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-5">
                  <div className="absolute inset-x-0 top-0 h-[3px] bg-emerald-500" />
                  <div className="mb-3 inline-flex items-center rounded bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-600">
                    {copy.strongestCollection}
                  </div>
                  <div className="text-[15px] font-bold text-gray-900">{b.branchName}</div>
                  <div className="mt-1 font-mono text-[28px] font-black leading-none tabular-nums text-emerald-600">
                    {b.paidPercentage.toFixed(1)}%
                  </div>
                  <div className="mt-1 font-mono text-xs text-gray-400">
                    {fmtIQD(b.totalPaid)} محصّل
                  </div>
                </div>
              );
            })()}
          {/* Highest Remaining */}
          {overview.analysis.highestRemainingBranch &&
            (() => {
              const b = overview.analysis.highestRemainingBranch;
              return (
                <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-5">
                  <div className="absolute inset-x-0 top-0 h-[3px] bg-amber-500" />
                  <div className="mb-3 inline-flex items-center rounded bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-600">
                    {copy.highestRemaining}
                  </div>
                  <div className="text-[15px] font-bold text-gray-900">{b.branchName}</div>
                  <div className="mt-1 font-mono text-[28px] font-black leading-none tabular-nums text-amber-600">
                    {fmtIQD(b.totalRemaining)}
                  </div>
                  <div className="mt-1 font-mono text-xs text-gray-400">
                    {(100 - b.paidPercentage).toFixed(1)}% غير محصّل
                  </div>
                </div>
              );
            })()}
          {/* Highest Expenses */}
          {overview.analysis.highestExpenseBranch &&
            (() => {
              const b = overview.analysis.highestExpenseBranch;
              return (
                <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-5">
                  <div className="absolute inset-x-0 top-0 h-[3px] bg-red-500" />
                  <div className="mb-3 inline-flex items-center rounded bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600">
                    {copy.highestExpenses}
                  </div>
                  <div className="text-[15px] font-bold text-gray-900">{b.branchName}</div>
                  <div className="mt-1 font-mono text-[28px] font-black leading-none tabular-nums text-red-600">
                    {fmtIQD(b.totalExpenses)}
                  </div>
                  <div className="mt-1 font-mono text-xs text-gray-400">
                    {locale === "ar" ? "مصروفات" : "expenses"}
                  </div>
                </div>
              );
            })()}
        </div>
      </section>
      </GroupRevealSection>

      {/* ── Discount Analysis ── */}
      {overview.branches.length > 1 && (() => {
        const sorted = [...overview.branches].sort(
          (a, b) => (b.totalDiscount / b.totalFeesBeforeDiscount) - (a.totalDiscount / a.totalFeesBeforeDiscount)
        );
        const maxDiscount = Math.max(...overview.branches.map((b) => b.totalDiscount));
        return (
          <GroupRevealSection delay={250}>
          <section id="sec-discount" className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">{locale === "ar" ? "تحليل الخصومات" : "Discount Analysis"}</h2>
                <p className="text-xs text-gray-400">{locale === "ar" ? "نسبة ومبلغ الخصم لكل فرع من إجمالي الرسوم" : "Discount rate and amount per branch"}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {(locale === "ar"
                      ? ["الفرع", "الرسوم قبل الخصم", "مبلغ الخصم", "نسبة الخصم", "الرسوم بعد الخصم", ""]
                      : ["Branch", "Fees Before Discount", "Discount Amount", "Discount %", "Fees After Discount", ""]
                    ).map((h, i) => (
                      <th
                        key={i}
                        className={`px-4 py-2.5 text-[11px] font-semibold text-gray-400 border-b-2 border-gray-200 whitespace-nowrap ${i === 0 ? "text-start" : "text-end"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((b) => {
                    const pct = (b.totalDiscount / b.totalFeesBeforeDiscount) * 100;
                    const barW = maxDiscount > 0 ? (b.totalDiscount / maxDiscount) * 100 : 0;
                    return (
                      <tr key={b.branchId ?? b.branchName} className="transition-colors hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-[13px] font-bold text-gray-900 border-b border-gray-100">{b.branchName}</td>
                        <td className="px-4 py-2.5 text-end font-mono text-[13px] font-semibold tabular-nums text-gray-700 border-b border-gray-100">{fmtIQD(b.totalFeesBeforeDiscount)}</td>
                        <td className="px-4 py-2.5 text-end font-mono text-[13px] font-bold tabular-nums text-amber-600 border-b border-gray-100">{fmtIQD(b.totalDiscount)}</td>
                        <td className={`px-4 py-2.5 text-end font-mono text-[13px] font-bold tabular-nums border-b border-gray-100 ${pct > 10 ? "text-red-600" : "text-gray-700"}`}>
                          {pct.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2.5 text-end font-mono text-[13px] font-semibold tabular-nums text-gray-700 border-b border-gray-100">{fmtIQD(b.totalFeesAfterDiscount)}</td>
                        <td className="px-4 py-2.5 border-b border-gray-100 w-[15%]">
                          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${barW}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          </GroupRevealSection>
        );
      })()}

      {/* ── Financial Deep ── */}
      {overview.branches.length > 0 && (
        <GroupRevealSection delay={300}>
        <section id="sec-finance">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-gray-700">{locale === "ar" ? "التحليل المالي المتقدم" : "Advanced Financial Analysis"}</h2>
            <p className="text-xs text-gray-400">{locale === "ar" ? "كلفة الطالب وتفصيل المصروفات" : "Cost per student and expense breakdown"}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Cost per student */}
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                <div className="h-3.5 w-0.5 rounded-full bg-blue-600" />
                <span className="text-[13px] font-bold text-gray-800">{locale === "ar" ? "كلفة الطالب الواحد" : "Cost Per Student"}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {[...overview.branches]
                  .sort((a, b) => (b.totalExpenses / Math.max(b.studentsCount, 1)) - (a.totalExpenses / Math.max(a.studentsCount, 1)))
                  .map(b => {
                    const cost = b.studentsCount > 0 ? b.totalExpenses / b.studentsCount : 0;
                    return (
                      <div key={b.branchId ?? b.branchName} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-[12px] font-bold text-gray-900">{b.branchName}</span>
                        <span className="font-mono text-[13px] font-bold tabular-nums text-gray-800">
                          {Math.round(cost).toLocaleString("en-US")} <span className="text-[10px] text-gray-400">IQD</span>
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Expense breakdown (aggregated across all branches) */}
            {(() => {
              const combined = new Map<string, number>();
              for (const b of overview.branches) {
                for (const item of b.expenseBreakdown) {
                  combined.set(item.name, (combined.get(item.name) ?? 0) + item.amount);
                }
              }
              const sorted = Array.from(combined.entries()).sort((a, b) => b[1] - a[1]);
              const maxVal = sorted[0]?.[1] ?? 1;
              return (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                    <div className="h-3.5 w-0.5 rounded-full bg-amber-500" />
                    <span className="text-[13px] font-bold text-gray-800">{locale === "ar" ? "تفصيل المصروفات" : "Expense Breakdown"}</span>
                  </div>
                  {sorted.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[12px] text-gray-400">
                      {locale === "ar" ? "لا تتوفر بيانات تفصيلية" : "No breakdown data"}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {sorted.map(([name, amount]) => {
                        const totalExpenses = sorted.reduce((s, [, v]) => s + v, 0);
                        const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                        const barW = maxVal > 0 ? (amount / maxVal) * 100 : 0;
                        return (
                          <div key={name} className="grid items-center gap-2 px-4 py-2.5" style={{ gridTemplateColumns: "100px 1fr 80px 44px" }}>
                            <span className="text-[12px] font-semibold text-gray-700 truncate">{name}</span>
                            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                              <div className="h-full rounded-full bg-amber-400" style={{ width: `${barW}%` }} />
                            </div>
                            <span className="text-end font-mono text-[11px] font-bold tabular-nums text-gray-800">
                              {fmtIQD(amount)}
                            </span>
                            <span className="text-end font-mono text-[10px] text-gray-400">{pct.toFixed(0)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </section>
        </GroupRevealSection>
      )}

      {/* ── Teacher Analytics ── */}
      {overview.branches.length > 0 && (() => {
        const maxRatio = Math.max(...overview.branches.map(b => b.studentsCount / Math.max(b.teachersCount, 1)));
        return (
          <GroupRevealSection delay={350}>
          <section id="sec-teachers-analytics">
            <div className="mb-3">
              <h2 className="text-sm font-bold text-gray-700">{locale === "ar" ? "تحليل الكادر التعليمي" : "Teaching Staff"}</h2>
              <p className="text-xs text-gray-400">{locale === "ar" ? "نسبة المعلمين للطلاب لكل فرع" : "Teacher/student ratio per branch"}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Ratio card */}
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                  <div className="h-3.5 w-0.5 rounded-full bg-blue-600" />
                  <span className="text-[13px] font-bold text-gray-800">{locale === "ar" ? "نسبة المعلمين للطلاب" : "Teacher/Student Ratio"}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {overview.branches.map(b => {
                    const ratio = b.studentsCount / Math.max(b.teachersCount, 1);
                    const barW = maxRatio > 0 ? (ratio / maxRatio) * 100 : 0;
                    return (
                      <div key={b.branchId ?? b.branchName} className="grid items-center gap-2.5 px-4 py-2.5" style={{ gridTemplateColumns: "140px 1fr 70px 60px" }}>
                        <span className="text-[12px] font-bold text-gray-900 truncate">{b.branchName}</span>
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full ${ratio > 16 ? "bg-red-500" : "bg-blue-500"}`}
                            style={{ width: `${barW}%` }}
                          />
                        </div>
                        <span className={`text-end font-mono text-[12px] font-bold tabular-nums ${ratio > 16 ? "text-red-600" : "text-gray-800"}`}>
                          1:{ratio.toFixed(1)}
                        </span>
                        <span className="text-end text-[10px] text-gray-400">{b.teachersCount} {locale === "ar" ? "معلم" : "teachers"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Teacher list card */}
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                  <div className="h-3.5 w-0.5 rounded-full bg-amber-500" />
                  <span className="text-[13px] font-bold text-gray-800">{locale === "ar" ? "قائمة المعلمين" : "Teacher List"}</span>
                  <span className="ms-auto font-mono text-[11px] font-bold text-gray-400">{overview.branches.reduce((s, b) => s + b.teachersList.length, 0)} {locale === "ar" ? "معلم" : "teachers"}</span>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                  {overview.branches.flatMap(b =>
                    b.teachersList.map((t, i) => (
                      <div key={`${b.branchId}-${i}`} className="flex items-center justify-between px-4 py-2">
                        <div>
                          <div className="text-[12px] font-bold text-gray-900">{t.name}</div>
                          <div className="text-[10px] text-gray-400">{b.branchName}</div>
                        </div>
                        <span className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-600">
                          {t.subject}
                        </span>
                      </div>
                    ))
                  )}
                  {overview.branches.every(b => b.teachersList.length === 0) && (
                    <div className="px-4 py-6 text-center text-[12px] text-gray-400">
                      {locale === "ar" ? "لا تتوفر بيانات المعلمين" : "No teacher data available"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
          </GroupRevealSection>
        );
      })()}

      {/* ── Monthly Salaries ── */}
      {overview.branches.length > 0 && overview.branches[0].monthLabels.length > 0 && (() => {
        const monthLabels = overview.branches[0].monthLabels;
        // Check if any branch has non-zero salary data
        const hasSalaryData = overview.branches.some(b => b.monthlySalaries.some(v => v > 0));
        if (!hasSalaryData) return null;

        const monthTotals = monthLabels.map((_, mi) =>
          overview.branches.reduce((sum, b) => sum + (b.monthlySalaries[mi] ?? 0), 0)
        );
        const grandTotal = monthTotals.reduce((s, v) => s + v, 0);
        const grandAvg = monthLabels.length > 0 ? grandTotal / monthLabels.length : 0;

        return (
          <GroupRevealSection delay={400}>
          <section id="sec-salaries" className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">{locale === "ar" ? "الرواتب الشهرية" : "Monthly Salaries"}</h2>
                <p className="text-xs text-gray-400">{locale === "ar" ? "تفصيل رواتب كل فرع حسب الشهر" : "Branch salaries by month"}</p>
              </div>
              <div className="flex items-center gap-6 text-end">
                <div>
                  <div className="font-mono text-[18px] font-black tabular-nums text-gray-900">{fmtIQD(grandTotal)}</div>
                  <div className="text-[11px] text-gray-400">{locale === "ar" ? "إجمالي الرواتب" : "Total salaries"}</div>
                </div>
                <div>
                  <div className="font-mono text-[18px] font-black tabular-nums text-blue-600">{fmtIQD(grandAvg)}</div>
                  <div className="text-[11px] text-gray-400">{locale === "ar" ? "المعدل الشهري" : "Monthly avg"}</div>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="px-4 py-2.5 text-start text-[11px] font-semibold text-gray-400 border-b-2 border-gray-200 whitespace-nowrap min-w-[130px]">
                      {locale === "ar" ? "الفرع" : "Branch"}
                    </th>
                    {monthLabels.map((m, i) => (
                      <th key={i} className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-400 border-b-2 border-gray-200 whitespace-nowrap">
                        {m}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-center text-[11px] font-bold text-gray-500 border-b-2 border-gray-200 bg-gray-50">
                      {locale === "ar" ? "الإجمالي" : "Total"}
                    </th>
                    <th className="px-3 py-2.5 text-center text-[11px] font-bold text-gray-500 border-b-2 border-gray-200 bg-gray-50">
                      {locale === "ar" ? "المعدل" : "Avg"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {overview.branches.map(b => {
                    const salaries = b.monthlySalaries;
                    const total = salaries.reduce((s, v) => s + v, 0);
                    const avg = salaries.length > 0 ? total / salaries.length : 0;
                    const maxMonth = Math.max(...salaries);
                    const minMonth = salaries.find(v => v > 0) !== undefined ? Math.min(...salaries.filter(v => v > 0)) : 0;
                    return (
                      <tr key={b.branchId ?? b.branchName} className="transition-colors hover:bg-gray-50">
                        <td className="px-4 py-3 text-[14px] font-black text-gray-900 border-b border-gray-100">{b.branchName}</td>
                        {salaries.map((val, mi) => (
                          <td key={mi} className={`px-3 py-3 text-center font-mono text-[15px] font-bold tabular-nums border-b border-gray-100 ${
                            val > 0 && val === maxMonth ? "text-red-600" :
                            val > 0 && val === minMonth ? "text-emerald-600" :
                            "text-gray-800"
                          }`}>
                            {val > 0 ? fmtIQD(val) : <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center font-mono text-[15px] font-black text-gray-900 border-b border-gray-100 bg-gray-50">
                          {fmtIQD(total)}
                        </td>
                        <td className="px-3 py-3 text-center font-mono text-[14px] font-bold tabular-nums text-blue-600 border-b border-gray-100 bg-gray-50">
                          {fmtIQD(avg)}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr className="bg-blue-50/50">
                    <td className="px-4 py-3 text-[14px] font-black text-gray-900 border-b-0">{locale === "ar" ? "الإجمالي" : "Total"}</td>
                    {monthTotals.map((val, mi) => (
                      <td key={mi} className="px-3 py-3 text-center font-mono text-[15px] font-black tabular-nums text-gray-900 border-b-0">
                        {val > 0 ? fmtIQD(val) : <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center font-mono text-[16px] font-black text-gray-900 border-b-0 bg-blue-50/50">
                      {fmtIQD(grandTotal)}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-[15px] font-bold tabular-nums text-blue-600 border-b-0 bg-blue-50/50">
                      {fmtIQD(grandAvg)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          </GroupRevealSection>
        );
      })()}

      {/* ── Teachers Section ── */}
      {overview.branches.length > 0 && overview.branches.some(b => b.teachersList.length > 0) && (() => {
        const activeBranches = overview.branches.filter(b => b.teachersList.length > 0);
        return (
          <GroupRevealSection delay={450}>
          <section id="sec-teachers" className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-sm font-bold text-gray-900">{locale === "ar" ? "الأساتذة والمواد" : "Teachers & Subjects"}</h2>
              <p className="text-xs text-gray-400">{locale === "ar" ? "جدول المعلمين حسب المادة لكل فرع" : "Teachers by subject per branch"}</p>
            </div>
            {activeBranches.map((branch, bi) => (
              <div key={branch.branchId ?? branch.branchName}>
                {activeBranches.length > 1 && (
                  <div className={`flex items-center gap-3 px-6 py-3 ${bi > 0 ? "border-t border-gray-100" : ""} bg-gray-50`}>
                    <span className="text-[13px] font-bold text-gray-800">{branch.branchName}</span>
                    <span className="font-mono text-[11px] text-gray-400">{branch.teachersList.length} {locale === "ar" ? "معلم" : "teachers"}</span>
                    <span className="font-mono text-[11px] text-gray-400">·</span>
                    <span className="font-mono text-[11px] text-gray-400">{new Set(branch.teachersList.map(t => t.subject)).size} {locale === "ar" ? "مادة" : "subjects"}</span>
                  </div>
                )}
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="w-10 px-4 py-2.5 text-center text-[11px] font-semibold text-gray-400 border-b-2 border-gray-200">#</th>
                      <th className="px-4 py-2.5 text-start text-[11px] font-semibold text-gray-400 border-b-2 border-gray-200">{locale === "ar" ? "اسم الأستاذ" : "Teacher Name"}</th>
                      <th className="px-4 py-2.5 text-start text-[11px] font-semibold text-gray-400 border-b-2 border-gray-200">{locale === "ar" ? "المادة" : "Subject"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branch.teachersList.map((t, i) => (
                      <tr key={i} className="transition-colors hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-center font-mono text-[12px] text-gray-400 border-b border-gray-100">{i + 1}</td>
                        <td className="px-4 py-2.5 text-[13px] font-bold text-gray-900 border-b border-gray-100">{t.name}</td>
                        <td className="px-4 py-2.5 border-b border-gray-100">
                          <span className="inline-block rounded bg-blue-50 px-2.5 py-0.5 text-[12px] font-bold text-blue-600">{t.subject}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </section>
          </GroupRevealSection>
        );
      })()}

      {/* ── Summary ── */}
      <GroupRevealSection delay={500}>
      <section id="sec-summary" className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{copy.totalSection}</h2>
            <p className="text-xs text-gray-400">
              {fmt(overview.branches.length)} {copy.totalBranches} ·{" "}
              {fmt(totals.studentsCount)} {copy.students} ·{" "}
              {fmt(totalTeachers)} {locale === "ar" ? "معلم" : "teachers"}
            </p>
          </div>
          <div className="text-end">
            <div
              className={`font-mono text-3xl font-black tabular-nums leading-none ${pctColor(totals.paidPercentage)}`}
            >
              {fmt(totals.paidPercentage)}%
            </div>
            <div className="mt-0.5 text-[11px] text-gray-400">{copy.paidPercentage}</div>
          </div>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-3">
          <SummaryGroup
            title={locale === "ar" ? "الرسوم" : "Fees"}
            accentCls="border-t-blue-600"
            rows={[
              [copy.beforeDiscount, fmtIQD(totals.totalFeesBeforeDiscount)],
              [copy.afterDiscount, fmtIQD(totals.totalFeesAfterDiscount)],
              [copy.discount, fmtIQD(totals.totalDiscount)],
            ]}
          />
          <SummaryGroup
            title={locale === "ar" ? "التحصيل" : "Collection"}
            accentCls="border-t-emerald-600"
            rows={[
              [copy.paid, fmtIQD(totals.totalPaid), "text-emerald-600"],
              [copy.transferredPaid, fmtIQD(totals.transferredPaid)],
              [copy.paidWithTransferred, fmtIQD(totals.totalPaidWithTransferred)],
              [
                copy.remaining,
                fmtIQD(totals.totalRemaining),
                totals.totalRemaining > 0 ? "text-red-600" : "text-emerald-600",
              ],
            ]}
          />
          <SummaryGroup
            title={locale === "ar" ? "المالية" : "Finance"}
            accentCls="border-t-amber-600"
            rows={[
              [copy.expenses, fmtIQD(totals.totalExpenses)],
              [copy.income, fmtIQD(totals.totalIncomes)],
              [copy.net, fmtIQD(net), net >= 0 ? "text-emerald-600" : "text-red-600"],
              [
                copy.netWithIncome,
                fmtIQD(netWithIncome),
                netWithIncome >= 0 ? "text-emerald-600" : "text-red-600",
              ],
            ]}
          />
        </div>
        {/* Exports */}
        <div className="flex flex-wrap gap-2 border-t border-gray-100 px-6 py-4">
          {(["excel", "word", "pdf", "csv"] as const).map((format) => (
            <a
              key={format}
              href={buildExportHref(format)}
              target={format !== "excel" && format !== "csv" ? "_blank" : undefined}
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded border border-gray-200 bg-gray-50 px-4 text-xs font-bold text-gray-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
            >
              {format.toUpperCase()}
            </a>
          ))}
        </div>
      </section>
      </GroupRevealSection>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between border-t border-gray-100 px-2 py-6">
        <span className="font-mono text-[11px] text-gray-400 tabular-nums">
          GROUP DASHBOARD v3.0 — CONFIDENTIAL
        </span>
        <span className="font-mono text-[11px] text-gray-400 tabular-nums">
          {formatUpdatedAt(locale)}
        </span>
      </div>

      {/* ── Comparison Chart ── */}
      {overview.branches.length > 1 && (
        <GroupRevealSection delay={550}>
        <section id="sec-chart" className="overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <SchoolManagerComparisonChart
            points={chartPoints}
            totals={overview.totals}
          />
        </section>
        </GroupRevealSection>
      )}

    </div>
  );
}
