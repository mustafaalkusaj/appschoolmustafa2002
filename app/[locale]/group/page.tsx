import dynamicImport from "next/dynamic";
import { redirect } from "next/navigation";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { localizeAppPath } from "@/lib/locale-routing";
import { resolveSchoolManagerOverview, type SchoolManagerBranchSummary } from "@/lib/school-manager/overview";
import { BudgetSummary } from "./_components/BudgetSummary";

const SchoolManagerComparisonChart = dynamicImport(
  () => import("./_components/SchoolManagerComparisonChart").then((mod) => mod.SchoolManagerComparisonChart),
  {
    loading: () => (
      <div className="h-[400px] w-full animate-pulse rounded-lg bg-[var(--surface-muted)]" />
    ),
  }
);

export const dynamic = "force-dynamic";

const COPY = {
  ar: {
    title: "صفحة المدير على مستوى المدرسة",
    subtitle: "عرض مركزي دقيق للفروع بدون قائمة جانبية، وبنفس المعادلات المالية المعتمدة داخل النظام.",
    formulaIntro: "المعادلات المعتمدة في هذه الصفحة:",
    formulaBefore: "إجمالي الرسوم قبل التخفيض = مجموع total_fee لكل الطلاب غير المحذوفين في الفرع.",
    formulaAfter: "إجمالي الرسوم بعد التخفيض = إجمالي الرسوم قبل التخفيض - التخفيض.",
    formulaRemaining: "المبلغ المتبقي = مجموع remaining_fee كما هو مخزن على الطلاب داخل الفرع.",
    formulaPaid: "المبلغ المدفوع = مجموع paid_fee داخل الفرع.",
    formulaExpenses: "إجمالي المصروفات = مجموع expense.amount على نفس الفرع.",
    branchSection: "ملخص كل فرع",
    totalSection: "إجمالي المدرسة",
    analysisTitle: "تحليل بياني",
    analysisSubtitle: "ملخص سريع لأهم القراءات التنفيذية على مستوى المدرسة.",
    beforeDiscount: "إجمالي الرسوم قبل التخفيض",
    afterDiscount: "إجمالي الرسوم بعد التخفيض",
    discount: "التخفيض",
    remaining: "المبلغ المتبقي",
    paid: "المبلغ المدفوع",
    expenses: "إجمالي المصروفات",
    students: "عدد الطلاب",
    paidPercentage: "نسبة السداد",
    excel: "Excel",
    word: "Word",
    pdf: "PDF",
    strongestCollection: "أفضل فرع في التحصيل",
    highestRemaining: "أعلى فرع في المتبقي",
    highestExpenses: "أعلى فرع في المصروفات",
    noBranches: "لا توجد فروع نشطة مرتبطة بهذه المدرسة حاليًا.",
    generatedAt: "آخر تحديث",
    schoolTotalLabel: "إجمالي المدرسة",
    unassigned: "سجلات غير مرتبطة بفرع",
  },
  en: {
    title: "School-Level Manager Page",
    subtitle: "A precise school-wide branch view without a sidebar, using the same financial formulas as the system.",
    formulaIntro: "Applied formulas:",
    formulaBefore: "Fees before discount = sum of total_fee for all non-deleted students in the branch.",
    formulaAfter: "Fees after discount = fees before discount - discount.",
    formulaRemaining: "Remaining amount = sum of student remaining_fee in the branch.",
    formulaPaid: "Paid amount = sum of student paid_fee in the branch.",
    formulaExpenses: "Total expenses = sum of expense.amount in the same branch.",
    branchSection: "Branch Summary",
    totalSection: "School Totals",
    analysisTitle: "Analytical Summary",
    analysisSubtitle: "Fast executive reading of the strongest and weakest financial points.",
    beforeDiscount: "Fees Before Discount",
    afterDiscount: "Fees After Discount",
    discount: "Discount",
    remaining: "Remaining Amount",
    paid: "Paid Amount",
    expenses: "Total Expenses",
    students: "Students Count",
    paidPercentage: "Collection Rate",
    excel: "Excel",
    word: "Word",
    pdf: "PDF",
    strongestCollection: "Strongest Collection Branch",
    highestRemaining: "Highest Outstanding Branch",
    highestExpenses: "Highest Expense Branch",
    noBranches: "There are no active branches linked to this school yet.",
    generatedAt: "Updated",
    schoolTotalLabel: "School Total",
    unassigned: "Unassigned records",
  },
} as const;

type Locale = keyof typeof COPY;

function formatCurrency(value: number, _locale: Locale) {
  return `${value.toLocaleString("en-US")} IQD`;
}

function formatNumber(value: number, _locale: Locale) {
  return value.toLocaleString("en-US");
}

function formatUpdatedAt(locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-IQ" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

function buildExportHref(format: "excel" | "word" | "pdf", branchId?: string | null) {
  const params = new URLSearchParams({ format });
  if (branchId) {
    params.set("branchId", branchId);
  }
  return `/api/web/group/export?${params.toString()}`;
}

function MetricTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] border-l-2 border-l-[var(--accent)] bg-[var(--surface-muted)] px-4 py-4 text-center">
      <div className="text-xs font-black leading-6 text-[var(--text-secondary)]">{label}</div>
      <div className="mt-2 text-xl font-black text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function ExportButtons({
  locale,
  branchId,
}: {
  locale: Locale;
  branchId?: string | null;
}) {
  const copy = COPY[locale];
  const disabled = !branchId && branchId !== undefined;
  const baseClassName =
    "inline-flex md:min-w-[94px] items-center justify-center rounded-[18px] border px-4 py-2 text-sm font-black transition";

  if (disabled) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        {[copy.excel, copy.word, copy.pdf].map((label) => (
          <span
            key={label}
            className={`${baseClassName} cursor-not-allowed border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-tertiary)] opacity-60`}
          >
            {label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <a
        href={buildExportHref("excel", branchId)}
        className={`${baseClassName} border-[#16a34a1f] bg-[#16a34a14] text-[#166534] hover:bg-[#16a34a22]`}
      >
        {copy.excel}
      </a>
      <a
        href={buildExportHref("word", branchId)}
        target="_blank"
        rel="noreferrer"
        className={`${baseClassName} border-[#2563eb1f] bg-[#2563eb14] text-[#1d4ed8] hover:bg-[#2563eb22]`}
      >
        {copy.word}
      </a>
      <a
        href={buildExportHref("pdf", branchId)}
        target="_blank"
        rel="noreferrer"
        className={`${baseClassName} border-[#7c3aed1f] bg-[#7c3aed14] text-[#6d28d9] hover:bg-[#7c3aed22]`}
      >
        {copy.pdf}
      </a>
    </div>
  );
}

function BranchCard({
  locale,
  branch,
}: {
  locale: Locale;
  branch: SchoolManagerBranchSummary;
}) {
  const copy = COPY[locale];
  const hasData = branch.studentsCount > 0 || branch.totalExpenses > 0 || branch.totalPaid > 0;

  return (
    <section className="overflow-hidden rounded-[34px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <div className="border-t-4 border-t-blue-500 px-5 pt-5 pb-4 text-center">
        <h2 className="text-xl font-black text-[var(--text-primary)]">{branch.branchName}</h2>
      </div>
      <div className="p-5 pt-0">
        {!hasData && (
          <div className="mb-4 rounded-[18px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--info)_10%,transparent)] px-4 py-3 text-center text-sm text-[var(--text-secondary)]">
            {locale === "ar"
              ? "لا توجد معاملات مالية بعد، لكن الفرع نشط وسيظهر في التقارير."
              : "No transactions yet, but the branch is active and will appear in reports."}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricTile label={copy.beforeDiscount} value={formatCurrency(branch.totalFeesBeforeDiscount, locale)} />
          <MetricTile label={copy.afterDiscount} value={formatCurrency(branch.totalFeesAfterDiscount, locale)} />
          <MetricTile label={copy.remaining} value={formatCurrency(branch.totalRemaining, locale)} />
          <MetricTile label={copy.discount} value={formatCurrency(branch.totalDiscount, locale)} />
          <MetricTile label={copy.paid} value={formatCurrency(branch.totalPaid, locale)} />
          <MetricTile label={copy.expenses} value={formatCurrency(branch.totalExpenses, locale)} />
        </div>

        <div className="mx-auto mt-3 max-w-[280px]">
          <MetricTile label={copy.students} value={formatNumber(branch.studentsCount, locale)} />
        </div>
        <div className="mx-auto mt-3 max-w-[280px]">
          <MetricTile label={copy.paidPercentage} value={`${formatNumber(branch.paidPercentage, locale)}%`} />
        </div>

        <div className="mt-5 border-t border-[var(--border)] pt-4">
          <ExportButtons locale={locale} branchId={branch.branchId} />
        </div>
      </div>
    </section>
  );
}

function AnalysisItem({
  title,
  branch,
  value,
  locale,
}: {
  title: string;
  branch: SchoolManagerBranchSummary | null;
  value: string;
  locale: Locale;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-5 py-5">
      <div className="text-xs font-black leading-6 text-[var(--text-secondary)]">{title}</div>
      <div className="mt-2 text-xl font-black text-[var(--text-primary)]">
        {branch?.branchName || COPY[locale].unassigned}
      </div>
      <div className="mt-2 text-sm font-bold text-[var(--text-secondary)]">{value}</div>
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
    if (context.status === 401) {
      redirect(localizeAppPath("/login", locale));
    }
    redirect(localizeAppPath("/access-denied", locale));
  }

  if (context.value.scopeLevel !== "group_admin") {
    redirect(localizeAppPath("/access-denied", locale));
  }

  const { actorSupabase, targetSchoolId } = context.value;

  const [{ data: school, error: schoolError }, overview] = await Promise.all([
    actorSupabase
      .from("schools")
      .select("id, name")
      .eq("id", targetSchoolId)
      .maybeSingle(),
    resolveSchoolManagerOverview(actorSupabase, targetSchoolId),
  ]);

  if (schoolError || !school?.id) {
    redirect(localizeAppPath("/access-denied", locale));
  }

  const chartPoints = overview.branches.map((branch) => ({
    branchName: branch.branchName,
    totalFeesAfterDiscount: branch.totalFeesAfterDiscount,
    totalPaid: branch.totalPaid,
    totalRemaining: branch.totalRemaining,
    totalExpenses: branch.totalExpenses,
  }));

  return (
    <div className="space-y-8 pb-10">
      <section className="rounded-[36px] border border-[var(--border)] bg-[var(--surface)] px-6 py-8 text-center shadow-[var(--shadow-sm)] sm:px-10">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
          {school.name}
        </p>
        <h1 className="mt-4 text-3xl font-black text-[var(--text-primary)] sm:text-5xl">
          {copy.title}
        </h1>
        <p className="mx-auto mt-4 max-w-4xl text-sm leading-8 text-[var(--text-secondary)] sm:text-base">
          {copy.subtitle}
        </p>
        <div className="mt-5 text-xs font-bold text-[var(--text-tertiary)]">
          {copy.generatedAt}: {formatUpdatedAt(locale)}
        </div>
      </section>

      <section className="space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-black text-[var(--text-primary)]">{copy.branchSection}</h2>
        </div>

        {overview.branches.length === 0 ? (
          <div className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-[var(--text-secondary)] shadow-[var(--shadow-sm)]">
            {copy.noBranches}
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-3">
            {overview.branches.map((branch) => (
              <BranchCard key={`${branch.branchId ?? "unassigned"}-${branch.branchName}`} locale={locale} branch={branch} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[34px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
        <div className="text-center">
          <h2 className="text-2xl font-black text-[var(--text-primary)]">{copy.totalSection}</h2>
        </div>

        <div className="mx-auto mt-6 max-w-5xl">
          <div className="grid gap-4 md:grid-cols-2">
            <MetricTile label={copy.beforeDiscount} value={formatCurrency(overview.totals.totalFeesBeforeDiscount, locale)} />
            <MetricTile label={copy.afterDiscount} value={formatCurrency(overview.totals.totalFeesAfterDiscount, locale)} />
            <MetricTile label={copy.remaining} value={formatCurrency(overview.totals.totalRemaining, locale)} />
            <MetricTile label={copy.discount} value={formatCurrency(overview.totals.totalDiscount, locale)} />
            <MetricTile label={copy.paid} value={formatCurrency(overview.totals.totalPaid, locale)} />
            <MetricTile label={copy.expenses} value={formatCurrency(overview.totals.totalExpenses, locale)} />
          </div>

          <div className="mx-auto mt-4 max-w-[340px]">
            <MetricTile label={copy.students} value={formatNumber(overview.totals.studentsCount, locale)} />
          </div>
          <div className="mx-auto mt-4 max-w-[340px]">
            <MetricTile label={copy.paidPercentage} value={`${formatNumber(overview.totals.paidPercentage, locale)}%`} />
          </div>

          <div className="mt-6">
            <ExportButtons locale={locale} />
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
        <div className="mb-5">
          <h2 className="text-2xl font-black text-[var(--text-primary)]">{copy.analysisTitle}</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{copy.analysisSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <AnalysisItem
            locale={locale}
            title={copy.strongestCollection}
            branch={overview.analysis.strongestCollectionBranch}
            value={
              overview.analysis.strongestCollectionBranch
                ? `${formatNumber(overview.analysis.strongestCollectionBranch.paidPercentage, locale)}%`
                : "—"
            }
          />
          <AnalysisItem
            locale={locale}
            title={copy.highestRemaining}
            branch={overview.analysis.highestRemainingBranch}
            value={
              overview.analysis.highestRemainingBranch
                ? formatCurrency(overview.analysis.highestRemainingBranch.totalRemaining, locale)
                : "—"
            }
          />
          <AnalysisItem
            locale={locale}
            title={copy.highestExpenses}
            branch={overview.analysis.highestExpenseBranch}
            value={
              overview.analysis.highestExpenseBranch
                ? formatCurrency(overview.analysis.highestExpenseBranch.totalExpenses, locale)
                : "—"
            }
          />
        </div>
      </section>

      <BudgetSummary locale={locale} />

      <SchoolManagerComparisonChart points={chartPoints} totals={overview.totals} />

      <div className="text-center text-xs font-bold text-[var(--text-tertiary)]">
        {copy.schoolTotalLabel}: {school.name}
      </div>
    </div>
  );
}
