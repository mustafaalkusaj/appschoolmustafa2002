import { redirect } from "next/navigation";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { localizeAppPath } from "@/lib/locale-routing";
import { resolveSchoolManagerOverview, type SchoolManagerBranchSummary } from "@/lib/school-manager/overview";
import { SchoolManagerComparisonChart } from "./_components/SchoolManagerComparisonChart";

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

type MetricColor = "blue" | "green" | "amber" | "purple" | "red" | "default";

const GRADIENT_BARS = [
  "bg-gradient-to-r from-blue-500 to-indigo-500",
  "bg-gradient-to-r from-emerald-500 to-teal-500",
  "bg-gradient-to-r from-violet-500 to-purple-500",
  "bg-gradient-to-r from-orange-500 to-amber-500",
] as const;

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

const COLOR_CLASSES: Record<MetricColor, string> = {
  blue: "border-l-[3px] border-l-blue-500 bg-blue-500/5",
  green: "border-l-[3px] border-l-emerald-500 bg-emerald-500/5",
  amber: "border-l-[3px] border-l-amber-500 bg-amber-500/5",
  purple: "border-l-[3px] border-l-purple-500 bg-purple-500/5",
  red: "border-l-[3px] border-l-red-500 bg-red-500/5",
  default: "border-l-2 border-l-[var(--accent)] bg-[var(--surface-muted)]",
};

function MetricTile({
  label,
  value,
  color = "default",
  accent,
}: {
  label: string;
  value: string;
  color?: MetricColor;
  accent?: string;
}) {
  return (
    <div
      className={`rounded-[24px] border border-[var(--border)] px-4 py-4 text-center ${COLOR_CLASSES[color]}`}
    >
      <div className="flex items-center justify-center gap-1.5 text-xs font-black leading-6 text-[var(--text-secondary)]">
        {accent && (
          <span
            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
          />
        )}
        {label}
      </div>
      <div
        className="mt-2 text-xl font-black"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
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
  const disabled = false;
  const baseClassName =
    "inline-flex min-w-[94px] items-center justify-center rounded-[14px] border px-5 py-2.5 text-sm font-black shadow-sm transition";

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
        className={`${baseClassName} border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700`}
      >
        {copy.excel}
      </a>
      <a
        href={buildExportHref("word", branchId)}
        target="_blank"
        rel="noreferrer"
        className={`${baseClassName} border-blue-600 bg-blue-600 text-white hover:bg-blue-700`}
      >
        {copy.word}
      </a>
      <a
        href={buildExportHref("pdf", branchId)}
        target="_blank"
        rel="noreferrer"
        className={`${baseClassName} border-red-500 bg-red-500 text-white hover:bg-red-600`}
      >
        {copy.pdf}
      </a>
    </div>
  );
}

function BranchCard({
  locale,
  branch,
  index,
}: {
  locale: Locale;
  branch: SchoolManagerBranchSummary;
  index: number;
}) {
  const copy = COPY[locale];
  const gradientBar = GRADIENT_BARS[Math.min(index, GRADIENT_BARS.length - 1)];

  const paidPctColor: MetricColor =
    branch.paidPercentage >= 70 ? "green" : branch.paidPercentage >= 40 ? "amber" : "red";

  return (
    <section className="overflow-hidden rounded-[34px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <div className={`h-1.5 w-full ${gradientBar}`} />
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-5 text-center">
        <h2 className="text-xl font-black text-white">{branch.branchName}</h2>
      </div>
      <div className="p-5">

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricTile label={copy.beforeDiscount} value={formatCurrency(branch.totalFeesBeforeDiscount, locale)} color="blue" />
          <MetricTile label={copy.afterDiscount} value={formatCurrency(branch.totalFeesAfterDiscount, locale)} color="blue" accent="#3b82f6" />
          <MetricTile label={copy.remaining} value={formatCurrency(branch.totalRemaining, locale)} color="amber" accent="#f59e0b" />
          <MetricTile label={copy.discount} value={formatCurrency(branch.totalDiscount, locale)} color="purple" accent="#8b5cf6" />
          <MetricTile label={copy.paid} value={formatCurrency(branch.totalPaid, locale)} color="green" accent="#10b981" />
          <MetricTile label={copy.expenses} value={formatCurrency(branch.totalExpenses, locale)} color="red" accent="#ef4444" />
        </div>

        <div className="mx-auto mt-3 max-w-[280px]">
          <MetricTile label={copy.students} value={formatNumber(branch.studentsCount, locale)} color="default" accent="#6366f1" />
        </div>
        <div className="mx-auto mt-3 max-w-[280px]">
          <MetricTile label={copy.paidPercentage} value={`${formatNumber(branch.paidPercentage, locale)}%`} color={paidPctColor} accent="#14b8a6" />
        </div>

        <div className="mt-5 border-t border-[var(--border)] pt-4">
          <ExportButtons locale={locale} branchId={branch.branchId ?? "__unassigned__"} />
        </div>
      </div>
    </section>
  );
}

const ANALYSIS_BORDER: Record<string, string> = {
  green: "border-l-[3px] border-l-emerald-500",
  amber: "border-l-[3px] border-l-amber-500",
  red: "border-l-[3px] border-l-red-500",
};

function AnalysisItem({
  title,
  branch,
  value,
  locale,
  color,
}: {
  title: string;
  branch: SchoolManagerBranchSummary | null;
  value: string;
  locale: Locale;
  color: "green" | "amber" | "red";
}) {
  return (
    <div
      className={`rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-5 py-5 ${ANALYSIS_BORDER[color]}`}
    >
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

  const totalsPaidPctColor: MetricColor =
    overview.totals.paidPercentage >= 70
      ? "green"
      : overview.totals.paidPercentage >= 40
        ? "amber"
        : "red";

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
            {overview.branches.map((branch, index) => (
              <BranchCard key={`${branch.branchId ?? "unassigned"}-${branch.branchName}`} locale={locale} branch={branch} index={index} />
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
            <MetricTile label={copy.beforeDiscount} value={formatCurrency(overview.totals.totalFeesBeforeDiscount, locale)} color="blue" />
            <MetricTile label={copy.afterDiscount} value={formatCurrency(overview.totals.totalFeesAfterDiscount, locale)} color="blue" accent="#3b82f6" />
            <MetricTile label={copy.remaining} value={formatCurrency(overview.totals.totalRemaining, locale)} color="amber" accent="#f59e0b" />
            <MetricTile label={copy.discount} value={formatCurrency(overview.totals.totalDiscount, locale)} color="purple" accent="#8b5cf6" />
            <MetricTile label={copy.paid} value={formatCurrency(overview.totals.totalPaid, locale)} color="green" accent="#10b981" />
            <MetricTile label={copy.expenses} value={formatCurrency(overview.totals.totalExpenses, locale)} color="red" accent="#ef4444" />
          </div>

          <div className="mx-auto mt-4 max-w-[340px]">
            <MetricTile label={copy.students} value={formatNumber(overview.totals.studentsCount, locale)} color="default" accent="#6366f1" />
          </div>
          <div className="mx-auto mt-4 max-w-[340px]">
            <MetricTile label={copy.paidPercentage} value={`${formatNumber(overview.totals.paidPercentage, locale)}%`} color={totalsPaidPctColor} accent="#14b8a6" />
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
            color="green"
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
            color="amber"
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
            color="red"
          />
        </div>
      </section>

      <SchoolManagerComparisonChart points={chartPoints} totals={overview.totals} />

      <div className="text-center text-xs font-bold text-[var(--text-tertiary)]">
        {copy.schoolTotalLabel}: {school.name}
      </div>
    </div>
  );
}
