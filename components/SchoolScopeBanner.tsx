"use client";

import type { SchoolScopeState } from "@/hooks/useSchoolScope";

type SchoolScopeBannerProps = {
  scope: SchoolScopeState;
  className?: string;
};

type SchoolScopeEmptyStateProps = {
  scope: SchoolScopeState;
  title: string;
  description?: string;
};

export function SchoolScopeBanner({ scope, className = "" }: SchoolScopeBannerProps) {
  if (!scope.isSuperAdminScope) return null;

  const stateTone = scope.hasInvalidSelection
    ? "border-rose-200/80 bg-rose-50/80 text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-200"
    : scope.selectedSchool
      ? "border-sky-200/80 bg-sky-50/80 text-sky-800 dark:border-sky-500/30 dark:bg-sky-950/35 dark:text-sky-100"
      : "border-amber-200/80 bg-amber-50/80 text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/35 dark:text-amber-100";

  return (
    <section
      className={`mb-4 rounded-[24px] border border-white/50 bg-white/75 px-4 py-4 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.32)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45 ${className}`.trim()}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">سياق المدرسة</div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {scope.scopeLoading
              ? "جارٍ تحميل المدارس المتاحة..."
              : scope.selectedSchool?.name || "اختر مدرسة قبل متابعة البيانات"}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            يعتمد عرض بيانات المدير العام في هذه الصفحة على المدرسة المحددة في الرابط `?school=`.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:min-w-[280px] sm:flex-row sm:items-center sm:justify-end">
          <select
            aria-label="اختيار المدرسة"
            className="min-h-11 rounded-[18px] border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-500/20"
            value={scope.selectedSchoolId ?? ""}
            onChange={(event) => scope.setSelectedSchoolId(event.target.value || null)}
            disabled={scope.scopeLoading}
          >
            <option value="">اختر مدرسة</option>
            {scope.schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>

          <span className={`inline-flex min-h-11 items-center justify-center rounded-full border px-3 py-2 text-xs font-semibold ${stateTone}`}>
            {scope.scopeLoading
              ? "تحميل..."
              : scope.hasInvalidSelection
                ? "معرف مدرسة غير صالح"
                : scope.selectedSchool
                  ? scope.selectedSchool.is_active
                    ? "مدرسة نشطة"
                    : "مدرسة موقوفة"
                  : "الاختيار مطلوب"}
          </span>
        </div>
      </div>

      {scope.hasInvalidSelection ? (
        <div className="mt-3 rounded-[18px] border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/35 dark:text-rose-200">
          المدرسة المحددة في الرابط غير موجودة ضمن المدارس المتاحة. اختر مدرسة صحيحة لإعادة تحميل الصفحة.
        </div>
      ) : null}
    </section>
  );
}

export function SchoolScopeEmptyState({
  scope,
  title,
  description = "لن يتم تحميل أي بيانات قبل تحديد المدرسة المطلوبة لهذا القسم.",
}: SchoolScopeEmptyStateProps) {
  if (!scope.isSuperAdminScope || !scope.shouldBlockContent) return null;

  const heading = scope.hasInvalidSelection
    ? `تعذر تحديد مدرسة ${title}`
    : `اختر مدرسة لعرض ${title}`;

  const detail = scope.hasInvalidSelection
    ? "المعرف الموجود في الرابط غير صالح أو لم يعد متاحاً. اختر مدرسة أخرى من القائمة أعلاه."
    : description;

  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center shadow-[0_24px_60px_-36px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/35">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-lg text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
        {scope.hasInvalidSelection ? "!" : "مد"}
      </div>
      <h2 className="mb-2 text-lg font-bold text-slate-900 dark:text-slate-100">{heading}</h2>
      <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}
