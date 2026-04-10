"use client";

import type { SchoolScopeState } from "@/hooks/useSchoolScope";

type SchoolScopeBannerProps = {
  scope: SchoolScopeState;
  className?: string;
  showSelector?: boolean;
};

type SchoolScopeEmptyStateProps = {
  scope?: SchoolScopeState;
  title?: string;
  description?: string;
};

export function SchoolScopeBanner({
  scope,
  className = "",
  showSelector = true,
}: SchoolScopeBannerProps) {
  if (!scope.isSuperAdminScope) return null;

  const stateTone = scope.hasInvalidSelection
    ? "border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]"
    : scope.selectedSchool
      ? "border-[var(--info)]/30 bg-[var(--info)]/10 text-[var(--info)]"
      : "border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--warning)]";

  return (
    <section
      className={`mb-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow-lg)] backdrop-blur-xl ${className}`.trim()}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-[var(--text-muted)]">سياق المدرسة</div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {scope.scopeLoading
              ? "جارٍ تحميل المدارس المتاحة..."
              : scope.selectedSchool?.name || "اختر مدرسة قبل متابعة البيانات"}
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            يعتمد عرض بيانات المدير العام في هذه الصفحة على المدرسة المحددة في الرابط `?school=`.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:min-w-[280px] sm:flex-row sm:items-center sm:justify-end">
          {showSelector ? (
            <select
              aria-label="اختيار المدرسة"
              className="min-h-11 rounded-[var(--button-radius)] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"
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
          ) : null}
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
        <div className="mt-3 rounded-[var(--button-radius)] border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-xs font-medium text-[var(--danger)]">
          المدرسة المحددة في الرابط غير موجودة ضمن المدارس المتاحة. اختر مدرسة صحيحة لإعادة تحميل الصفحة.
        </div>
      ) : null}
    </section>
  );
}

export function SchoolScopeEmptyState({
  scope,
  title = "البيانات",
  description = "لن يتم تحميل أي بيانات قبل تحديد المدرسة المطلوبة لهذا القسم.",
}: SchoolScopeEmptyStateProps) {
  if (!scope) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center shadow-[var(--shadow-lg)] backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-lg text-white shadow-[var(--shadow-md)]">
          مد
        </div>
        <h2 className="mb-2 text-lg font-bold text-[var(--text-primary)]">{`اختر مدرسة لعرض ${title}`}</h2>
        <p className="mx-auto max-w-2xl text-sm leading-7 text-[var(--text-muted)]">{description}</p>
      </div>
    );
  }

  if (!scope.isSuperAdminScope || !scope.shouldBlockContent) return null;

  const heading = scope.hasInvalidSelection
    ? `تعذر تحديد مدرسة ${title}`
    : `اختر مدرسة لعرض ${title}`;

  const detail = scope.hasInvalidSelection
    ? "المعرف الموجود في الرابط غير صالح أو لم يعد متاحاً. اختر مدرسة أخرى من القائمة أعلاه."
    : description;

  return (
    <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center shadow-[var(--shadow-lg)] backdrop-blur-xl">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-lg text-white shadow-[var(--shadow-md)]">
        {scope.hasInvalidSelection ? "!" : "مد"}
      </div>
      <h2 className="mb-2 text-lg font-bold text-[var(--text-primary)]">{heading}</h2>
      <p className="mx-auto max-w-2xl text-sm leading-7 text-[var(--text-muted)]">{detail}</p>
    </div>
  );
}
