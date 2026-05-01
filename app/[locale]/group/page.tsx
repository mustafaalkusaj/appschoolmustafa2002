import dynamicImport from "next/dynamic";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { localizeAppPath } from "@/lib/locale-routing";
import { resolveSchoolManagerOverview, type SchoolManagerBranchSummary } from "@/lib/school-manager/overview";
import { BudgetSummary } from "./_components/BudgetSummary";

const SchoolManagerComparisonChart = dynamicImport(
  () => import("./_components/SchoolManagerComparisonChart").then((mod) => mod.SchoolManagerComparisonChart),
  {
    loading: () => (
      <div className="h-[440px] w-full animate-pulse rounded-2xl border shadow-sm" style={{ background: "var(--surface-strong)", borderColor: "var(--border)" }} />
    ),
  }
);

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";

// ─── Accent palette ────────────────────────────────────────────────────────────
const ACCENTS = [
  { top: "border-t-blue-500", iconBg: "bg-blue-50 text-blue-500", bar: "bg-blue-500", pctColor: "text-blue-600", initials: "bg-blue-600" },
  { top: "border-t-purple-500", iconBg: "bg-purple-50 text-purple-500", bar: "bg-purple-500", pctColor: "text-purple-600", initials: "bg-purple-600" },
  { top: "border-t-green-500", iconBg: "bg-green-50 text-green-500", bar: "bg-green-500", pctColor: "text-green-600", initials: "bg-green-600" },
  { top: "border-t-amber-500", iconBg: "bg-amber-50 text-amber-500", bar: "bg-amber-500", pctColor: "text-amber-600", initials: "bg-amber-600" },
  { top: "border-t-red-500", iconBg: "bg-red-50 text-red-500", bar: "bg-red-500", pctColor: "text-red-600", initials: "bg-red-600" },
  { top: "border-t-indigo-500", iconBg: "bg-indigo-50 text-indigo-500", bar: "bg-indigo-500", pctColor: "text-indigo-600", initials: "bg-indigo-600" },
  { top: "border-t-cyan-500", iconBg: "bg-cyan-50 text-cyan-500", bar: "bg-cyan-500", pctColor: "text-cyan-600", initials: "bg-cyan-600" },
  { top: "border-t-pink-500", iconBg: "bg-pink-50 text-pink-500", bar: "bg-pink-500", pctColor: "text-pink-600", initials: "bg-pink-600" },
  { top: "border-t-emerald-500", iconBg: "bg-emerald-50 text-emerald-500", bar: "bg-emerald-500", pctColor: "text-emerald-600", initials: "bg-emerald-600" },
  { top: "border-t-orange-500", iconBg: "bg-orange-50 text-orange-500", bar: "bg-orange-500", pctColor: "text-orange-600", initials: "bg-orange-600" },
  { top: "border-t-teal-500", iconBg: "bg-teal-50 text-teal-500", bar: "bg-teal-500", pctColor: "text-teal-600", initials: "bg-teal-600" },
  { top: "border-t-rose-500", iconBg: "bg-rose-50 text-rose-500", bar: "bg-rose-500", pctColor: "text-rose-600", initials: "bg-rose-600" },
];

function getAccent(index: number) {
  return ACCENTS[index % ACCENTS.length];
}

// ─── Format helpers ────────────────────────────────────────────────────────────
function fmt(v: number) {
  return v === 0 ? "IQD 0" : `IQD ${v.toLocaleString("en-US")}`;
}

function fmtN(v: number) {
  return v.toLocaleString("en-US");
}

function buildExportUrl(format: "excel" | "word" | "pdf", branchId?: string | null) {
  const params = new URLSearchParams({ format });
  if (branchId) params.set("branchId", branchId);
  return `/api/web/group/export?${params.toString()}`;
}

// ─── Section title ─────────────────────────────────────────────────────────────
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{title}</h2>
      <div className="w-5 h-5 flex items-center justify-center" style={{ color: "var(--text-tertiary)" }}>{icon}</div>
    </div>
  );
}

// ─── Export buttons ────────────────────────────────────────────────────────────
function ExportButtons({ branchId, disabled }: { branchId?: string | null; disabled?: boolean }) {
  if (disabled) {
    return (
      <div className="flex gap-2.5 flex-wrap">
        {["PDF", "Word", "Excel"].map((label) => (
          <span
            key={label}
            className="text-xs font-black px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-strong)", color: "var(--text-tertiary)" }}
          >
            {label}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="flex gap-2.5 flex-wrap">
      <a
        href={buildExportUrl("pdf", branchId)}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-black px-4 py-2 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition shadow-sm hover:shadow-md"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-strong)" }}
      >
        📄 PDF
      </a>
      <a
        href={buildExportUrl("word", branchId)}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-black px-4 py-2 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition shadow-sm hover:shadow-md"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-strong)" }}
      >
        📘 Word
      </a>
      <a
        href={buildExportUrl("excel", branchId)}
        className="text-xs font-black px-4 py-2 rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition shadow-sm hover:shadow-md"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-strong)" }}
      >
        📊 Excel
      </a>
    </div>
  );
}

// ─── Branch card ───────────────────────────────────────────────────────────────
function BranchCard({
  branch,
  index,
  labels,
}: {
  branch: SchoolManagerBranchSummary;
  index: number;
  labels: Record<string, string>;
}) {
  const accent = getAccent(index);
  const pct = Math.min(100, Math.max(0, branch.paidPercentage));
  const disabled = branch.branchId === null;

  return (
    <article
      className={`rounded-2xl border shadow-sm dark:shadow-slate-900/30 overflow-hidden border-t-4 ${accent.top} flex flex-col transition-colors`}
      style={{ background: "var(--surface-strong)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between gap-3">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black shrink-0 text-white ${accent.initials}`}
        >
          {branch.branchName.charAt(0).toUpperCase()}
        </div>
        <h3 className="text-base font-black text-right flex-1" style={{ color: "var(--text-primary)" }}>{branch.branchName}</h3>
      </div>

      <div className="border-t mx-6" style={{ borderColor: "var(--border)" }} />

      {/* Metrics grid */}
      <div className="px-6 py-5 grid grid-cols-2 gap-x-5 gap-y-5 flex-1">
        <div className="text-right">
          <p className="text-xs font-bold mb-1.5" style={{ color: "var(--text-tertiary)" }}>{labels.feesBeforeDiscount}</p>
          <p className="text-sm font-black" style={{ color: "var(--text-primary)" }}>{fmt(branch.totalFeesBeforeDiscount)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold mb-1.5" style={{ color: "var(--text-tertiary)" }}>{labels.feesAfterDiscount}</p>
          <p className="text-sm font-black" style={{ color: "var(--text-primary)" }}>{fmt(branch.totalFeesAfterDiscount)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold mb-1.5" style={{ color: "var(--text-tertiary)" }}>{labels.paid}</p>
          <p className="text-sm font-black text-green-600 dark:text-green-400">{fmt(branch.totalPaid)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold mb-1.5" style={{ color: "var(--text-tertiary)" }}>{labels.remaining}</p>
          <p className="text-sm font-black text-amber-600 dark:text-amber-400">{fmt(branch.totalRemaining)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold mb-1.5" style={{ color: "var(--text-tertiary)" }}>{labels.studentsCount}</p>
          <p className="text-sm font-black" style={{ color: "var(--text-primary)" }}>{fmtN(branch.studentsCount)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold mb-1.5" style={{ color: "var(--text-tertiary)" }}>{labels.expenses}</p>
          <p className="text-sm font-black text-red-600 dark:text-red-400">{fmt(branch.totalExpenses)}</p>
        </div>
        <div className="col-span-2 text-right">
          <p className="text-xs font-bold mb-1.5" style={{ color: "var(--text-tertiary)" }}>{labels.discount}</p>
          <p className="text-sm font-black" style={{ color: "var(--text-primary)" }}>{fmt(branch.totalDiscount)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-6 py-4 border-t" style={{ background: "var(--surface-strong)", borderColor: "var(--border)" }}>
        <div className="flex justify-between items-center mb-2">
          <p className={`text-sm font-black ${accent.pctColor}`}>{fmtN(pct)}%</p>
          <p className="text-xs font-bold" style={{ color: "var(--text-tertiary)" }}>{labels.paymentRate}</p>
        </div>
        <div className="h-3 rounded-full overflow-hidden shadow-sm" style={{ background: "var(--background)" }}>
          <div
            className={`h-full rounded-full ${accent.bar} transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Export buttons */}
      <div className="px-6 py-3.5 border-t border-gray-100 dark:border-slate-700">
        <ExportButtons branchId={branch.branchId} disabled={disabled} />
      </div>
    </article>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default async function GroupDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";

  setRequestLocale(locale);
  const t = await getTranslations("groupDashboard");

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

  const { actorSupabase, targetSchoolId, actorUserId } = context.value;

  const { data: school, error: schoolError } = await actorSupabase
    .from("schools")
    .select("id, name")
    .eq("id", targetSchoolId)
    .maybeSingle();

  if (schoolError || !school?.id) {
    redirect(localizeAppPath("/access-denied", locale));
  }

  let userName = "مدير النظام";
  try {
    const { data: profile } = await actorSupabase
      .from("user_profiles")
      .select("full_name")
      .eq("user_id", actorUserId)
      .maybeSingle();
    if (profile?.full_name) userName = profile.full_name;
  } catch {
    // fallback already set
  }

  let overview;
  let overviewError: string | null = null;

  try {
    overview = await resolveSchoolManagerOverview(actorSupabase, targetSchoolId);
  } catch (err) {
    overviewError = err instanceof Error ? err.message : "تعذر تحميل ملخص المدرسة.";
    overview = {
      branches: [],
      totals: {
        studentsCount: 0,
        totalFeesBeforeDiscount: 0,
        totalDiscount: 0,
        totalFeesAfterDiscount: 0,
        totalPaid: 0,
        totalRemaining: 0,
        totalExpenses: 0,
        paidPercentage: 0,
      },
      analysis: {
        strongestCollectionBranch: null,
        highestRemainingBranch: null,
        highestExpenseBranch: null,
      },
      warnings: overviewError ? [overviewError] : [],
    };
  }

  const chartPoints = overview.branches.map((b) => ({
    branchName: b.branchName,
    totalFeesAfterDiscount: b.totalFeesAfterDiscount,
    totalPaid: b.totalPaid,
    totalRemaining: b.totalRemaining,
    totalExpenses: b.totalExpenses,
  }));

  const totals = overview.totals;
  const paidPct = Math.min(100, Math.max(0, totals.paidPercentage));
  const userInitial = userName.charAt(0) || "م";
  const schoolInitial = school.name.charAt(0) || "م";

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="min-h-screen transition-colors duration-200" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-6 space-y-6 max-w-screen-2xl mx-auto">

        {/* Breadcrumb + page title */}
        <div>
          <p className="text-xs mb-2" style={{ color: "var(--text-tertiary)" }}>{t("breadcrumb")}</p>
          <h1 className="text-2xl sm:text-3xl font-black leading-tight" style={{ color: "var(--text-primary)" }}>{t("title")}</h1>
          <p className="text-sm mt-1.5" style={{ color: "var(--text-tertiary)" }}>{t("subtitle")}</p>
        </div>

        {/* Error / warnings */}
        {overviewError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 font-medium">
            {overviewError}
          </div>
        )}
        {overview.warnings
          .filter((w) => w !== overviewError)
          .map((w) => (
            <div
              key={w}
              className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-700 font-medium"
            >
              {w}
            </div>
          ))}

        {/* ── KPI cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { key: "totalStudents", label: t("kpis.totalStudents"), value: fmtN(totals.studentsCount) },
            { key: "totalPaid", label: t("kpis.totalPaid"), value: fmt(totals.totalPaid) },
            { key: "totalDiscounts", label: t("kpis.totalDiscounts"), value: fmt(totals.totalDiscount) },
            { key: "feesBeforeDiscount", label: t("kpis.feesBeforeDiscount"), value: fmt(totals.totalFeesBeforeDiscount) },
          ].map((metric) => (
            <div key={metric.key} className="rounded-2xl border shadow-sm p-6 transition-all hover:shadow-md" style={{ background: "var(--surface-strong)", borderColor: "var(--border)" }}>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
                  {metric.label}
                </p>
                <p className="mt-2.5 text-[clamp(1.75rem,3vw,2.5rem)] font-black leading-tight tracking-tight" style={{ color: "var(--text-primary)" }}>
                  {metric.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Branch summary ─────────────────────────────────────────────────── */}
        <section>
          <SectionTitle
            title={t("branches.title")}
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />

          {overview.branches.length === 0 ? (
            <div className="rounded-2xl border shadow-sm py-16 text-center" style={{ background: "var(--surface-strong)", borderColor: "var(--border)" }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--background)" }}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--text-tertiary)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-tertiary)" }}>{t("branches.noActive")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
              {overview.branches.map((branch, idx) => (
                <BranchCard
                  key={branch.branchId ?? `branch-${idx}`}
                  branch={branch}
                  index={idx}
                  labels={{
                    feesBeforeDiscount: t("kpis.feesBeforeDiscount"),
                    feesAfterDiscount: t("kpis.feesAfterDiscount"),
                    paid: t("kpis.paid"),
                    remaining: t("kpis.remaining"),
                    studentsCount: t("kpis.studentsCount"),
                    expenses: t("kpis.expenses"),
                    discount: t("kpis.discount"),
                    paymentRate: t("kpis.paymentRate"),
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── School totals ──────────────────────────────────────────────────── */}
        <section>
          <SectionTitle
            title={t("totals.title")}
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />

          <div className="rounded-2xl border shadow-sm p-6" style={{ background: "var(--surface-strong)", borderColor: "var(--border)" }}>
            {/* Metrics grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-6">
              <div className="text-right">
                <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>{t("kpis.feesBeforeDiscount")}</p>
                <p className="text-sm font-black truncate" style={{ color: "var(--text-primary)" }}>{fmt(totals.totalFeesBeforeDiscount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>{t("kpis.feesAfterDiscount")}</p>
                <p className="text-sm font-black truncate" style={{ color: "var(--text-primary)" }}>{fmt(totals.totalFeesAfterDiscount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>{t("kpis.discount")}</p>
                <p className="text-sm font-black truncate" style={{ color: "var(--text-primary)" }}>{fmt(totals.totalDiscount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>{t("kpis.remaining")}</p>
                <p className="text-sm font-black text-amber-600 dark:text-amber-400 truncate">{fmt(totals.totalRemaining)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>{t("kpis.paid")}</p>
                <p className="text-sm font-black text-green-600 dark:text-green-400 truncate">{fmt(totals.totalPaid)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>{t("kpis.expenses")}</p>
                <p className="text-sm font-black text-red-600 dark:text-red-400 truncate">{fmt(totals.totalExpenses)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>{t("kpis.studentsCount")}</p>
                <p className="text-sm font-black" style={{ color: "var(--text-primary)" }}>{fmtN(totals.studentsCount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>{t("kpis.paymentRate")}</p>
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-sm font-black text-green-600 dark:text-green-400">{fmtN(paidPct)}%</p>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-100 to-green-50 border border-green-200 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Export */}
            <div className="mt-6 pt-5 border-t" style={{ borderColor: "var(--border)" }}>
              <ExportButtons />
            </div>
          </div>
        </section>

        {/* ── Performance analysis ───────────────────────────────────────────── */}
        <section>
          <SectionTitle
            title={t("analysis.title")}
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
            {/* Best collection */}
            <div className="rounded-2xl border shadow-sm p-6" style={{ background: "var(--surface-strong)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-black uppercase tracking-wide text-green-600 dark:text-green-400">{t("analysis.bestCollection")}</p>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-green-50 border border-green-200 flex items-center justify-center text-xl">🏆</div>
              </div>
              <p className="text-base font-black leading-snug line-clamp-2" style={{ color: "var(--text-primary)" }}>
                {overview.analysis.strongestCollectionBranch?.branchName ?? (
                  <span className="font-semibold text-sm" style={{ color: "var(--text-tertiary)" }}>{t("analysis.noData")}</span>
                )}
              </p>
              {overview.analysis.strongestCollectionBranch && (
                <p className="mt-3 text-lg font-black text-green-600 dark:text-green-400">
                  {fmtN(overview.analysis.strongestCollectionBranch.paidPercentage)}%
                </p>
              )}
            </div>

            {/* Highest remaining */}
            <div className="rounded-2xl border shadow-sm p-6" style={{ background: "var(--surface-strong)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-black uppercase tracking-wide text-amber-600 dark:text-amber-400">{t("analysis.highestRemaining")}</p>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200 flex items-center justify-center text-xl">⚠️</div>
              </div>
              <p className="text-base font-black leading-snug line-clamp-2" style={{ color: "var(--text-primary)" }}>
                {overview.analysis.highestRemainingBranch?.branchName ?? (
                  <span className="font-semibold text-sm" style={{ color: "var(--text-tertiary)" }}>{t("analysis.noData")}</span>
                )}
              </p>
              {overview.analysis.highestRemainingBranch && (
                <p className="mt-3 text-sm font-black text-amber-600 dark:text-amber-400">
                  {fmt(overview.analysis.highestRemainingBranch.totalRemaining)}
                </p>
              )}
            </div>

            {/* Highest expenses */}
            <div className="rounded-2xl border shadow-sm p-6" style={{ background: "var(--surface-strong)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-black uppercase tracking-wide text-red-600 dark:text-red-400">{t("analysis.highestExpenses")}</p>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-100 to-red-50 border border-red-200 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <p className="text-base font-black leading-snug line-clamp-2" style={{ color: "var(--text-primary)" }}>
                {overview.analysis.highestExpenseBranch?.branchName ?? (
                  <span className="font-semibold text-sm" style={{ color: "var(--text-tertiary)" }}>{t("analysis.noExpenses")}</span>
                )}
              </p>
              {overview.analysis.highestExpenseBranch && (
                <p className="mt-3 text-sm font-black text-red-600 dark:text-red-400">
                  {fmt(overview.analysis.highestExpenseBranch.totalExpenses)}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Annual budget ──────────────────────────────────────────────────── */}
        <BudgetSummary />

        {/* ── Financial analysis chart ───────────────────────────────────────── */}
        {chartPoints.length > 0 && (
          <SchoolManagerComparisonChart points={chartPoints} totals={overview.totals} locale={locale} />
        )}
      </div>
    </div>
  );
}
