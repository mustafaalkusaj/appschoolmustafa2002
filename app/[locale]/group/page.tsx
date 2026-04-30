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
      <div className="h-[440px] w-full animate-pulse rounded-2xl bg-white border border-gray-100 shadow-sm" />
    ),
  }
);

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";

// ─── Accent palette ────────────────────────────────────────────────────────────
const ACCENTS = [
  { top: "border-t-blue-500", iconBg: "bg-blue-50 text-blue-500", bar: "bg-blue-500", pctColor: "text-blue-600" },
  { top: "border-t-purple-500", iconBg: "bg-purple-50 text-purple-500", bar: "bg-purple-500", pctColor: "text-purple-600" },
  { top: "border-t-green-500", iconBg: "bg-green-50 text-green-500", bar: "bg-green-500", pctColor: "text-green-600" },
  { top: "border-t-amber-500", iconBg: "bg-amber-50 text-amber-500", bar: "bg-amber-500", pctColor: "text-amber-600" },
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
      <h2 className="text-lg font-black text-gray-800">{title}</h2>
      <div className="w-5 h-5 text-gray-400 flex items-center justify-center">{icon}</div>
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
        className="text-xs font-black px-4 py-2 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-400 transition shadow-sm hover:shadow-md"
      >
        📄 PDF
      </a>
      <a
        href={buildExportUrl("word", branchId)}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-black px-4 py-2 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition shadow-sm hover:shadow-md"
      >
        📘 Word
      </a>
      <a
        href={buildExportUrl("excel", branchId)}
        className="text-xs font-black px-4 py-2 rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-400 transition shadow-sm hover:shadow-md"
      >
        📊 Excel
      </a>
    </div>
  );
}

// ─── Branch card ───────────────────────────────────────────────────────────────
function BranchCard({ branch, index }: { branch: SchoolManagerBranchSummary; index: number }) {
  const accent = getAccent(index);
  const pct = Math.min(100, Math.max(0, branch.paidPercentage));
  const disabled = branch.branchId === null;

  return (
    <article
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden border-t-4 ${accent.top} flex flex-col`}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between gap-3">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${accent.iconBg}`}
        >
          🎓
        </div>
        <h3 className="text-base font-black text-gray-900 text-right flex-1">{branch.branchName}</h3>
      </div>

      <div className="border-t border-gray-50 mx-6" />

      {/* Metrics grid */}
      <div className="px-6 py-5 grid grid-cols-2 gap-x-5 gap-y-5 flex-1">
        <div className="text-right">
          <p className="text-xs font-bold text-gray-500 mb-1.5">الرسوم قبل الخصم</p>
          <p className="text-sm font-black text-gray-900">{fmt(branch.totalFeesBeforeDiscount)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-500 mb-1.5">الرسوم بعد الخصم</p>
          <p className="text-sm font-black text-gray-900">{fmt(branch.totalFeesAfterDiscount)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-500 mb-1.5">المدفوع</p>
          <p className="text-sm font-black text-green-600">{fmt(branch.totalPaid)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-500 mb-1.5">المتبقي</p>
          <p className="text-sm font-black text-amber-600">{fmt(branch.totalRemaining)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-500 mb-1.5">عدد الطلاب</p>
          <p className="text-sm font-black text-gray-900">{fmtN(branch.studentsCount)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-500 mb-1.5">المصروفات</p>
          <p className="text-sm font-black text-red-600">{fmt(branch.totalExpenses)}</p>
        </div>
        <div className="col-span-2 text-right">
          <p className="text-xs font-bold text-gray-500 mb-1.5">الخصم</p>
          <p className="text-sm font-black text-gray-900">{fmt(branch.totalDiscount)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <p className={`text-sm font-black ${accent.pctColor}`}>{fmtN(pct)}%</p>
          <p className="text-xs font-bold text-gray-500">نسبة السداد</p>
        </div>
        <div className="h-3 rounded-full bg-gray-200 overflow-hidden shadow-sm">
          <div
            className={`h-full rounded-full ${accent.bar} transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Export buttons */}
      <div className="px-6 py-3.5 border-t border-gray-100">
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
    <div dir="rtl" className="bg-[#F8FAFC] min-h-screen">
      {/* ── Top header bar ─────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="px-6 py-3.5 flex items-center justify-between">
          {/* Left side: icons + user */}
          <div className="flex items-center gap-2.5">
            {/* Notification */}
            <button className="w-9 h-9 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            {/* Settings */}
            <button className="w-9 h-9 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            {/* Calendar */}
            <button className="w-9 h-9 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <div className="w-px h-7 bg-gray-200 mx-1" />
            {/* User info */}
            <div className="flex items-center gap-2.5">
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900 leading-tight">{userName}</p>
                <p className="text-[11px] text-gray-400 leading-tight">مدير المجموعة</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm shadow-blue-200">
                {userInitial}
              </div>
            </div>
          </div>

          {/* Right side: school info */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-black text-gray-900 text-[15px] leading-tight">{school.name}</p>
              <p className="text-[11px] text-gray-400 leading-tight">النظام المالي</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black text-xl shrink-0 shadow-md shadow-blue-200">
              {schoolInitial}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="px-6 py-6 space-y-6 max-w-screen-2xl mx-auto">

        {/* Breadcrumb + page title */}
        <div>
          <p className="text-xs text-gray-400 mb-2">الرئيسية &gt; المجموعة</p>
          <h1 className="text-3xl font-black text-gray-900 leading-tight">اللوحة المالية للمجموعة</h1>
          <p className="text-sm text-gray-500 mt-1.5">نظرة شاملة على الأداء المالي لجميع فروع المدرسة</p>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {/* Students */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-amber-600 mb-2 uppercase tracking-wide">إجمالي الطلاب</p>
              <p className="text-3xl font-black text-gray-900">{fmtN(totals.studentsCount)}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
              <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>

          {/* Total paid */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-green-600 mb-2 uppercase tracking-wide">إجمالي المدفوع</p>
              <p className="text-xl font-black text-gray-900 truncate">{fmt(totals.totalPaid)}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center shrink-0 border border-green-100">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Discounts */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wide">إجمالي الخصومات</p>
              <p className="text-xl font-black text-gray-900 truncate">{fmt(totals.totalDiscount)}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
          </div>

          {/* Fees before discount */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-purple-600 mb-2 uppercase tracking-wide">الرسوم قبل الخصم</p>
              <p className="text-xl font-black text-gray-900 truncate">{fmt(totals.totalFeesBeforeDiscount)}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center shrink-0 border border-purple-100">
              <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
        </div>

        {/* ── Branch summary ─────────────────────────────────────────────────── */}
        <section>
          <SectionTitle
            title="ملخص الفروع"
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />

          {overview.branches.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-400">لا توجد فروع نشطة لهذه المدرسة</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {overview.branches.map((branch, idx) => (
                <BranchCard
                  key={branch.branchId ?? `branch-${idx}`}
                  branch={branch}
                  index={idx}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── School totals ──────────────────────────────────────────────────── */}
        <section>
          <SectionTitle
            title="إجمالي المدرسة"
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {/* Metrics grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-6">
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">الرسوم قبل الخصم</p>
                <p className="text-sm font-black text-gray-900 truncate">{fmt(totals.totalFeesBeforeDiscount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">الرسوم بعد الخصم</p>
                <p className="text-sm font-black text-gray-900 truncate">{fmt(totals.totalFeesAfterDiscount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">الخصومات</p>
                <p className="text-sm font-black text-gray-900 truncate">{fmt(totals.totalDiscount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">المتبقي</p>
                <p className="text-sm font-black text-amber-600 truncate">{fmt(totals.totalRemaining)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">المدفوع</p>
                <p className="text-sm font-black text-green-600 truncate">{fmt(totals.totalPaid)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">المصروفات</p>
                <p className="text-sm font-black text-red-600 truncate">{fmt(totals.totalExpenses)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">عدد الطلاب</p>
                <p className="text-sm font-black text-gray-900">{fmtN(totals.studentsCount)}</p>
              </div>
              {/* نسبة السداد */}
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">نسبة السداد</p>
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-sm font-black text-green-600">{fmtN(paidPct)}%</p>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-100 to-green-50 border border-green-200 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Export */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <ExportButtons />
            </div>
          </div>
        </section>

        {/* ── Performance analysis ───────────────────────────────────────────── */}
        <section>
          <SectionTitle
            title="تحليل الأداء"
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Best collection */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-black uppercase tracking-wide text-green-600">أفضل تحصيل</p>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-green-50 border border-green-200 flex items-center justify-center text-xl">🏆</div>
              </div>
              <p className="text-base font-black text-gray-900 leading-snug line-clamp-2">
                {overview.analysis.strongestCollectionBranch?.branchName ?? (
                  <span className="text-gray-300 font-semibold text-sm">لا توجد بيانات</span>
                )}
              </p>
              {overview.analysis.strongestCollectionBranch && (
                <p className="mt-3 text-lg font-black text-green-600">
                  {fmtN(overview.analysis.strongestCollectionBranch.paidPercentage)}%
                </p>
              )}
            </div>

            {/* Highest remaining */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-black uppercase tracking-wide text-amber-600">أعلى متبقي</p>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200 flex items-center justify-center text-xl">⚠️</div>
              </div>
              <p className="text-base font-black text-gray-900 leading-snug line-clamp-2">
                {overview.analysis.highestRemainingBranch?.branchName ?? (
                  <span className="text-gray-300 font-semibold text-sm">لا توجد بيانات</span>
                )}
              </p>
              {overview.analysis.highestRemainingBranch && (
                <p className="mt-3 text-sm font-black text-amber-600">
                  {fmt(overview.analysis.highestRemainingBranch.totalRemaining)}
                </p>
              )}
            </div>

            {/* Highest expenses */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-black uppercase tracking-wide text-red-600">أعلى مصروفات</p>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-100 to-red-50 border border-red-200 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <p className="text-base font-black text-gray-900 leading-snug line-clamp-2">
                {overview.analysis.highestExpenseBranch?.branchName ?? (
                  <span className="text-gray-300 font-semibold text-sm">لا توجد مصروفات</span>
                )}
              </p>
              {overview.analysis.highestExpenseBranch && (
                <p className="mt-3 text-sm font-black text-red-600">
                  {fmt(overview.analysis.highestExpenseBranch.totalExpenses)}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Annual budget ──────────────────────────────────────────────────── */}
        <BudgetSummary locale={locale} />

        {/* ── Financial analysis chart ───────────────────────────────────────── */}
        {chartPoints.length > 0 && (
          <SchoolManagerComparisonChart points={chartPoints} totals={overview.totals} />
        )}
      </div>
    </div>
  );
}
