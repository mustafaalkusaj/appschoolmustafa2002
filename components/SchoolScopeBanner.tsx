"use client";

import type { SchoolScopeState } from "@/hooks/useSchoolScope";
import { translateLegacyText } from "@/lib/legacy-locale";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as "ar" | "en";
  const copy = locale === "en"
    ? {
        heading: "School context",
        loading: "Loading available schools...",
        selectSchool: "Select a school to continue",
        description: "Super admin data on this page is scoped to the school selected in the `?school=` query.",
        selectAria: "Select school",
        selectOption: "Select school",
        statusLoading: "Loading...",
        invalidId: "Invalid school id",
        active: "Active school",
        inactive: "Paused school",
        selectionRequired: "Selection required",
        invalidDetail: "The school selected in the URL is not available anymore. Choose a valid school to reload the page.",
      }
    : {
        heading: "سياق المدرسة",
        loading: "جارٍ تحميل المدارس المتاحة...",
        selectSchool: "اختر مدرسة قبل متابعة البيانات",
        description: "يعتمد عرض بيانات المدير العام في هذه الصفحة على المدرسة المحددة في الرابط `?school=`.",
        selectAria: "اختيار المدرسة",
        selectOption: "اختر مدرسة",
        statusLoading: "تحميل...",
        invalidId: "معرف مدرسة غير صالح",
        active: "مدرسة نشطة",
        inactive: "مدرسة موقوفة",
        selectionRequired: "الاختيار مطلوب",
        invalidDetail: "المدرسة المحددة في الرابط غير موجودة ضمن المدارس المتاحة. اختر مدرسة صحيحة لإعادة تحميل الصفحة.",
      };

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
          <div className="text-xs font-semibold text-[var(--text-muted)]">{copy.heading}</div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {scope.scopeLoading
              ? copy.loading
              : scope.selectedSchool?.name || copy.selectSchool}
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {copy.description}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:min-w-[280px] sm:flex-row sm:items-center sm:justify-end">
          {showSelector ? (
            <select
              aria-label={copy.selectAria}
              className="min-h-11 rounded-[var(--button-radius)] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"
              value={scope.selectedSchoolId ?? ""}
              onChange={(event) => scope.setSelectedSchoolId(event.target.value || null)}
              disabled={scope.scopeLoading}
            >
              <option value="">{copy.selectOption}</option>
              {scope.schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          ) : null}
          <span className={`inline-flex min-h-11 items-center justify-center rounded-full border px-3 py-2 text-xs font-semibold ${stateTone}`}>
            {scope.scopeLoading
              ? copy.statusLoading
              : scope.hasInvalidSelection
                ? copy.invalidId
                : scope.selectedSchool
                  ? scope.selectedSchool.is_active
                    ? copy.active
                    : copy.inactive
                  : copy.selectionRequired}
          </span>
        </div>
      </div>

      {scope.hasInvalidSelection ? (
        <div className="mt-3 rounded-[var(--button-radius)] border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-xs font-medium text-[var(--danger)]">
          {copy.invalidDetail}
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
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as "ar" | "en";
  const copy = locale === "en"
    ? {
        fallbackTitle: "data",
        fallbackDescription: "No data will load until a school is selected for this section.",
        headingPrefix: "Select a school to view",
        invalidPrefix: "Could not resolve school for",
        invalidDescription: "The school id in the URL is invalid or no longer available. Select another school from the list above.",
        badge: "SC",
      }
    : {
        fallbackTitle: "البيانات",
        fallbackDescription: "لن يتم تحميل أي بيانات قبل تحديد المدرسة المطلوبة لهذا القسم.",
        headingPrefix: "اختر مدرسة لعرض",
        invalidPrefix: "تعذر تحديد مدرسة",
        invalidDescription: "المعرف الموجود في الرابط غير صالح أو لم يعد متاحاً. اختر مدرسة أخرى من القائمة أعلاه.",
        badge: "مد",
      };
  const resolvedTitle = translateLegacyText(title || copy.fallbackTitle, locale);
  const resolvedDescription = translateLegacyText(description || copy.fallbackDescription, locale);

  if (!scope) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center shadow-[var(--shadow-lg)] backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-lg text-white shadow-[var(--shadow-md)]">
          {copy.badge}
        </div>
        <h2 className="mb-2 text-lg font-bold text-[var(--text-primary)]">{`${copy.headingPrefix} ${resolvedTitle}`}</h2>
        <p className="mx-auto max-w-2xl text-sm leading-7 text-[var(--text-muted)]">{resolvedDescription}</p>
      </div>
    );
  }

  if (!scope.isSuperAdminScope || !scope.shouldBlockContent) return null;

  const heading = scope.hasInvalidSelection
    ? `${copy.invalidPrefix} ${resolvedTitle}`
    : `${copy.headingPrefix} ${resolvedTitle}`;

  const detail = scope.hasInvalidSelection
    ? copy.invalidDescription
    : resolvedDescription;

  return (
    <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center shadow-[var(--shadow-lg)] backdrop-blur-xl">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-lg text-white shadow-[var(--shadow-md)]">
        {scope.hasInvalidSelection ? "!" : copy.badge}
      </div>
      <h2 className="mb-2 text-lg font-bold text-[var(--text-primary)]">{heading}</h2>
      <p className="mx-auto max-w-2xl text-sm leading-7 text-[var(--text-muted)]">{detail}</p>
    </div>
  );
}
