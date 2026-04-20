import { normalizePath } from "@/types/roles";

export const PAGE_PATHS = {
  dashboard: "/dashboard",
  students: "/students",
  teachers: "/teachers",
  attendance: "/attendance",
  payments: "/payments",
  expenses: "/expenses",
  salaries: "/salaries",
  reports: "/reports",
  monitoring: "/monitoring",
  "fee-notifications": "/fee-notifications",
  group: "/group",
  schools: "/schools",
  subscriptions: "/subscriptions",
  "super-admin": "/super-admin",
} as const;

export type PageCode = keyof typeof PAGE_PATHS;

const PAGE_ALIASES: Record<string, PageCode> = {
  account: "payments",
  accounts: "payments",
  attendance_records: "attendance",
  fee_notifications: "fee-notifications",
  payments: "payments",
  reports: "reports",
  salaries: "salaries",
  schools: "schools",
  student: "students",
  students: "students",
  subscriptions: "subscriptions",
  super_admin: "super-admin",
  teachers: "teachers",
  group: "group",
  dashboard: "dashboard",
  expenses: "expenses",
  monitoring: "monitoring",
  attendance: "attendance",
};

const SORTED_PAGE_ENTRIES = Object.entries(PAGE_PATHS).sort(
  (left, right) => right[1].length - left[1].length,
);

const API_PATH_REWRITES: Array<[prefix: string, pagePath: string]> = [
  ["/api/web/dashboard", "/dashboard"],
  ["/api/dashboard", "/dashboard"],
  ["/api/web/students", "/students"],
  ["/api/students", "/students"],
  ["/api/web/payments", "/payments"],
  ["/api/web/expenses", "/expenses"],
  ["/api/web/attendance", "/attendance"],
  ["/api/web/salaries", "/salaries"],
  ["/api/web/reports", "/reports"],
  ["/api/web/fee-notifications", "/fee-notifications"],
  ["/api/web/monitoring", "/monitoring"],
  ["/api/branches", "/dashboard"],
  ["/api/users", "/super-admin"],
];

function normalizePageToken(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

export function normalizePageCode(value: string | null | undefined): PageCode | null {
  if (!value) return null;

  const normalized = normalizePageToken(value);
  if (normalized in PAGE_PATHS) {
    return normalized as PageCode;
  }

  return PAGE_ALIASES[normalized] ?? null;
}

export function filterAllowedPageCodes(values: Iterable<string | null | undefined>) {
  const unique = new Set<PageCode>();

  for (const value of Array.from(values)) {
    const normalized = normalizePageCode(value);
    if (normalized) {
      unique.add(normalized);
    }
  }

  return Array.from(unique);
}

export function getPathForPageCode(value: string | null | undefined) {
  const normalized = normalizePageCode(value);
  if (!normalized) return null;
  return PAGE_PATHS[normalized];
}

export function resolvePageCodeFromPath(pathname: string): PageCode | null {
  const normalized = normalizePath(pathname);

  for (const [pageCode, pagePath] of SORTED_PAGE_ENTRIES) {
    const normalizedPagePath = normalizePath(pagePath);
    if (
      normalized === normalizedPagePath ||
      normalized.startsWith(`${normalizedPagePath}/`)
    ) {
      return pageCode as PageCode;
    }
  }

  return null;
}

export function resolvePageCodeFromApiPath(pathname: string): PageCode | null {
  const normalized = normalizePath(pathname);

  for (const [apiPrefix, pagePath] of API_PATH_REWRITES) {
    const normalizedPrefix = normalizePath(apiPrefix);
    if (
      normalized === normalizedPrefix ||
      normalized.startsWith(`${normalizedPrefix}/`)
    ) {
      return resolvePageCodeFromPath(pagePath);
    }
  }

  return null;
}

export function isPagePathAllowed(
  pathname: string,
  allowedPageCodes: string[] | null | undefined,
) {
  if (!allowedPageCodes || allowedPageCodes.length === 0) {
    return false;
  }

  const pageCode = resolvePageCodeFromPath(pathname);
  if (!pageCode) {
    return false;
  }

  return filterAllowedPageCodes(allowedPageCodes).includes(pageCode);
}
