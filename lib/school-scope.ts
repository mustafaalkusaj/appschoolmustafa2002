import { localizeAppPath, stripLocaleFromPath, type AppLocale } from "@/lib/locale-routing";

export const SUPER_ADMIN_SCHOOL_QUERY_PARAM = "school";
export const SCHOOL_SCOPE_CHANGE_EVENT = "school-scope-change";

const SUPER_ADMIN_SCHOOL_SCOPED_PATHS = new Set([
  "/dashboard",
  "/students",
  "/payments",
  "/attendance",
  "/expenses",
  "/reports",
  "/salaries",
]);

export function isSuperAdminSchoolScopedPath(pathname: string): boolean {
  return SUPER_ADMIN_SCHOOL_SCOPED_PATHS.has(stripLocaleFromPath(pathname));
}

export function buildPathWithSchoolScope(pathname: string, schoolId: string | null | undefined): string {
  if (!schoolId || !isSuperAdminSchoolScopedPath(pathname)) {
    return pathname;
  }

  const [basePath, search = ""] = pathname.split("?", 2);
  const params = new URLSearchParams(search);
  params.set(SUPER_ADMIN_SCHOOL_QUERY_PARAM, schoolId);
  const nextSearch = params.toString();

  return nextSearch ? `${basePath}?${nextSearch}` : basePath;
}

export function buildLocalizedScopedPath(
  pathname: string,
  locale: AppLocale | string,
  schoolId: string | null | undefined,
): string {
  return buildPathWithSchoolScope(localizeAppPath(pathname, locale), schoolId);
}

export function readSchoolScopeFromWindow(): string | null {
  if (typeof window === "undefined") return null;

  const value = new URLSearchParams(window.location.search).get(SUPER_ADMIN_SCHOOL_QUERY_PARAM);
  return value?.trim() || null;
}
