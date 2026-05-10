import { redirect } from "next/navigation";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { localizeAppPath } from "@/lib/locale-routing";
import { resolveSchoolManagerOverview, type SchoolManagerBranchSummary } from "@/lib/school-manager/overview";
import { SchoolManagerComparisonChart } from "./_components/SchoolManagerComparisonChart";
import { RefreshButton } from "./_components/RefreshButton";

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
    collectionRate: "Collection Rate",
    totalBranches: "branches",
  },
} as const;

type Locale = keyof typeof COPY;

function fmt(value: number) {
  return value.toLocaleString("en-US");
}

function fmtCurrency(value: number) {
  return `${fmt(value)} IQD`;
}

function formatUpdatedAt(locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-IQ" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

function buildExportHref(format: "excel" | "word" | "pdf" | "csv", branchId?: string | null) {
  const params = new URLSearchParams({ format });
  if (branchId) params.set("branchId", branchId);
  return `/api/web/group/export?${params.toString()}`;
}

function pctColor(pct: number) {
  if (pct >= 75) return "text-[var(--success)]";
  if (pct >= 40) return "text-[var(--warning)]";
  return "text-[var(--danger)]";
}

function CollectionBar({ percentage }: { percentage: number }) {
  const pct = Math.min(100, Math.max(0, percentage));
  const barColor =
    pct >= 75
      ? "bg-[var(--success)]"
      : pct >= 40
        ? "bg-[var(--warning)]"
        : "bg-[var(--danger)]";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
      <div
        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function BranchCard({ locale, branch }: { locale: Locale; branch: SchoolManagerBranchSummary }) {
  const copy = COPY[locale];
  const pct = branch.paidPercentage;
  const net = branch.totalPaid - branch.totalExpenses;
  const netWithIncome = branch.totalPaid + branch.totalIncomes - branch.totalExpenses;

  const stats = [
    { label: copy.afterDiscount, value: fmtCurrency(branch.totalFeesAfterDiscount), cls: "text-[var(--text-primary)]" },
    { label: copy.paid,          value: fmtCurrency(branch.totalPaid),              cls: "text-[var(--success)]" },
    { label: copy.remaining,     value: fmtCurrency(branch.totalRemaining),         cls: branch.totalRemaining > 0 ? "text-[var(--danger)]" : "text-[var(--success)]" },
    { label: copy.expenses,      value: fmtCurrency(branch.totalExpenses),          cls: "text-[var(--warning)]" },
    { label: copy.income,        value: fmtCurrency(branch.totalIncomes),           cls: "text-[#20B96B]" },
    { label: copy.net,           value: fmtCurrency(net),                           cls: net >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]" },
    { label: copy.netWithIncome, value: fmtCurrency(netWithIncome),                 cls: netWithIncome >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]" },
    { label: copy.discount,      value: fmtCurrency(branch.totalDiscount),          cls: "text-[var(--info)]" },
  ];

  return (
    <section className="group flex flex-col overflow-hidden rounded-[28px] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] transition-all hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5">
      {/* Accent top bar */}
      <div className="h-1 w-full bg-[var(--primary)]" />

      {/* Header */}
      <div className="px-6 pt-5 pb-4 bg-[var(--primary-soft)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black text-[var(--text-primary)] leading-tight">{branch.branchName}</h2>
            <p className="mt-1 text-sm font-bold text-[var(--text-muted)]">
              {fmt(branch.studentsCount)} {copy.students}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className={`text-3xl font-black tabular-nums ${pctColor(pct)}`}>
              {fmt(pct)}%
            </div>
            {branch.branchId && (
              <a
                href={`/${locale}/branches/${branch.branchId}/students`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)] transition"
                title={copy.viewStudents}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            )}
          </div>
        </div>
        <div className="mt-4">
          <CollectionBar percentage={pct} />
        </div>
      </div>

      {/* Stats */}
      <div className="flex-1 px-6 py-4 space-y-2">
        {stats.map(({ label, value, cls }) => (
          <div key={label} className="flex items-center justify-between rounded-xl bg-[var(--surface-muted)] px-4 py-2.5 border border-[var(--border)]">
            <span className="text-xs font-bold text-[var(--text-muted)]">{label}</span>
            <span className={`text-sm font-black tabular-nums ${cls}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Export */}
      <div className="border-t border-[var(--card-border)] px-6 py-4">
        <div className="flex items-center gap-2">
          {([
            { format: "excel" as const, label: "Excel" },
            { format: "word"  as const, label: "Word" },
            { format: "pdf"   as const, label: "PDF" },
            { format: "csv"   as const, label: "CSV" },
          ]).map(({ format, label }) => (
            <a
              key={format}
              href={buildExportHref(format, branch.branchId)}
              target={format !== "excel" && format !== "csv" ? "_blank" : undefined}
              rel="noreferrer"
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] py-2 text-center text-xs font-black text-[var(--text-secondary)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent}`}>
      <div className="text-xs font-black uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-2 text-2xl font-black tabular-nums">{value}</div>
    </div>
  );
}

export default async function GroupDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "en" ? "en" : "ar";
  const copy = COPY[locale];

  const context = await resolveSchoolScopedActorContext(
    null,
    {
      allowedRoles: ["admin"],
      roleDeniedMessage:
        locale === "ar"
          ? "هذه الصفحة مخصصة لمدير المدرسة على مستوى المدرسة فقط."
          : "This page is reserved for school-level managers only.",
    },
  );

  if (!context.ok) {
    if (context.status === 401) redirect(localizeAppPath("/login", locale));
    redirect(localizeAppPath("/access-denied", locale));
  }

  if (context.value.scopeLevel !== "group_admin") {
    redirect(localizeAppPath("/access-denied", locale));
  }

  const { actorSupabase, targetSchoolId } = context.value;

  const [{ data: school, error: schoolError }, overview] = await Promise.all([
    actorSupabase.from("schools").select("id, name").eq("id", targetSchoolId).maybeSingle(),
    resolveSchoolManagerOverview(actorSupabase, targetSchoolId),
  ]);

  if (schoolError || !school?.id) redirect(localizeAppPath("/access-denied", locale));

  const totals = overview.totals;
  const net = totals.totalPaid - totals.totalExpenses;
  const netWithIncome = totals.totalPaid + totals.totalIncomes - totals.totalExpenses;

  const chartPoints = overview.branches.map((branch) => ({
    branchName: branch.branchName,
    totalFeesAfterDiscount: branch.totalFeesAfterDiscount,
    totalPaid: branch.totalPaid,
    totalRemaining: branch.totalRemaining,
    totalExpenses: branch.totalExpenses,
    totalIncomes: branch.totalIncomes,
  }));

  return (
    <div className="space-y-8 pb-12">

      {/* ── Hero Header — uses CSS vars, adapts light/dark ── */}
      <section className="relative overflow-hidden rounded-[36px] bg-[var(--primary)] px-8 py-10 shadow-[0_16px_60px_-12px_rgba(var(--primary-rgb),0.5)]">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -start-16 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-16 -end-16 h-64 w-64 rounded-full bg-black/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-white/90">
            {school.name}
          </div>
          <h1 className="text-3xl font-black text-white sm:text-5xl">{copy.title}</h1>
          <p className="mt-3 max-w-lg text-sm leading-7 text-white/70">{copy.subtitle}</p>

          {/* KPI strip */}
          <div className="mt-8 grid w-full max-w-4xl gap-3 sm:grid-cols-5">
            {[
              { label: copy.paid,         value: fmtCurrency(totals.totalPaid) },
              { label: copy.remaining,    value: fmtCurrency(totals.totalRemaining) },
              { label: copy.expenses,     value: fmtCurrency(totals.totalExpenses) },
              { label: copy.income,       value: fmtCurrency(totals.totalIncomes) },
              { label: copy.collectionRate, value: `${fmt(totals.paidPercentage)}%` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-sm">
                <div className="text-[10px] font-black uppercase tracking-wider text-white/50">{label}</div>
                <div className="mt-1.5 text-lg font-black tabular-nums text-white">{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-4 text-xs font-bold text-white/50">
            <span>{copy.generatedAt}: {formatUpdatedAt(locale)}</span>
            <RefreshButton locale={locale} />
          </div>
        </div>
      </section>

      {/* ── Branch Cards ── */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-[var(--text-primary)]">{copy.branchSection}</h2>
          <span className="rounded-full bg-[var(--surface-muted)] border border-[var(--border)] px-3 py-1 text-xs font-black text-[var(--text-muted)]">
            {fmt(overview.branches.length)} {copy.totalBranches}
          </span>
        </div>

        {overview.branches.length === 0 ? (
          <div className="rounded-[32px] border border-[var(--card-border)] bg-[var(--card-bg)] p-10 text-center text-[var(--text-secondary)]">
            {copy.noBranches}
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-3">
            {overview.branches.map((branch) => (
              <BranchCard
                key={`${branch.branchId ?? "unassigned"}-${branch.branchName}`}
                locale={locale}
                branch={branch}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── School Totals ── */}
      <section className="rounded-[32px] border border-[var(--card-border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-[var(--text-primary)]">{copy.totalSection}</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {fmt(overview.branches.length)} {copy.totalBranches} · {fmt(totals.studentsCount)} {copy.students}
            </p>
          </div>
          <div className={`text-4xl font-black tabular-nums ${pctColor(totals.paidPercentage)}`}>
            {fmt(totals.paidPercentage)}%
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label={copy.afterDiscount} value={fmtCurrency(totals.totalFeesAfterDiscount)}
            accent="border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-primary)]" />
          <KpiCard label={copy.paid} value={fmtCurrency(totals.totalPaid)}
            accent="border-[var(--border)] bg-[var(--success-soft)] text-[var(--success)]" />
          <KpiCard label={copy.remaining} value={fmtCurrency(totals.totalRemaining)}
            accent={totals.totalRemaining > 0
              ? "border-[var(--border)] bg-[var(--danger-soft)] text-[var(--danger)]"
              : "border-[var(--border)] bg-[var(--success-soft)] text-[var(--success)]"} />
          <KpiCard label={copy.expenses} value={fmtCurrency(totals.totalExpenses)}
            accent="border-[var(--border)] bg-[var(--warning-soft)] text-[var(--warning)]" />
          <KpiCard label={copy.income} value={fmtCurrency(totals.totalIncomes)}
            accent="border-[var(--border)] bg-[var(--success-soft)] text-[#20B96B]" />
          <KpiCard label={copy.net} value={fmtCurrency(net)}
            accent={net >= 0
              ? "border-[var(--border)] bg-[var(--success-soft)] text-[var(--success)]"
              : "border-[var(--border)] bg-[var(--danger-soft)] text-[var(--danger)]"} />
          <KpiCard label={copy.netWithIncome} value={fmtCurrency(netWithIncome)}
            accent={netWithIncome >= 0
              ? "border-[var(--border)] bg-[var(--success-soft)] text-[var(--success)]"
              : "border-[var(--border)] bg-[var(--danger-soft)] text-[var(--danger)]"} />
          <KpiCard label={copy.discount} value={fmtCurrency(totals.totalDiscount)}
            accent="border-[var(--border)] bg-[var(--info-soft)] text-[var(--info)]" />
        </div>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-[var(--card-border)] pt-6">
          {([
            { format: "excel" as const, label: "Excel" },
            { format: "word"  as const, label: "Word" },
            { format: "pdf"   as const, label: "PDF" },
            { format: "csv"   as const, label: "CSV" },
          ]).map(({ format, label }) => (
            <a
              key={format}
              href={buildExportHref(format)}
              target={format !== "excel" && format !== "csv" ? "_blank" : undefined}
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-5 text-sm font-black text-[var(--text-secondary)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
            >
              {label}
            </a>
          ))}
        </div>
      </section>

      {/* ── Analysis ── */}
      <section className="rounded-[32px] border border-[var(--card-border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]">
        <div className="mb-6">
          <h2 className="text-xl font-black text-[var(--text-primary)]">{copy.analysisTitle}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{copy.analysisSubtitle}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Best Collection */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--success-soft)] p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--success)]/15 text-[var(--success)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
            <div className="text-xs font-black uppercase tracking-wide text-[var(--success)]">{copy.strongestCollection}</div>
            <div className="mt-2 text-lg font-black text-[var(--text-primary)]">
              {overview.analysis.strongestCollectionBranch?.branchName || "—"}
            </div>
            <div className="mt-1 text-2xl font-black text-[var(--success)]">
              {overview.analysis.strongestCollectionBranch
                ? `${fmt(overview.analysis.strongestCollectionBranch.paidPercentage)}%`
                : "—"}
            </div>
          </div>

          {/* Highest Remaining */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--warning-soft)] p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--warning)]/15 text-[var(--warning)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div className="text-xs font-black uppercase tracking-wide text-[var(--warning)]">{copy.highestRemaining}</div>
            <div className="mt-2 text-lg font-black text-[var(--text-primary)]">
              {overview.analysis.highestRemainingBranch?.branchName || "—"}
            </div>
            <div className="mt-1 text-base font-black text-[var(--warning)]">
              {overview.analysis.highestRemainingBranch
                ? fmtCurrency(overview.analysis.highestRemainingBranch.totalRemaining)
                : "—"}
            </div>
          </div>

          {/* Highest Expenses */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--danger-soft)] p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--danger)]/15 text-[var(--danger)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
              </svg>
            </div>
            <div className="text-xs font-black uppercase tracking-wide text-[var(--danger)]">{copy.highestExpenses}</div>
            <div className="mt-2 text-lg font-black text-[var(--text-primary)]">
              {overview.analysis.highestExpenseBranch?.branchName || "—"}
            </div>
            <div className="mt-1 text-base font-black text-[var(--danger)]">
              {overview.analysis.highestExpenseBranch
                ? fmtCurrency(overview.analysis.highestExpenseBranch.totalExpenses)
                : "—"}
            </div>
          </div>
        </div>
      </section>

      {/* ── Chart ── */}
      <SchoolManagerComparisonChart points={chartPoints} totals={overview.totals} />
    </div>
  );
}
