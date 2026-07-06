export const ROLES = ["super_admin", "admin", "employee"] as const;

export type UserRole = (typeof ROLES)[number];

export const ALL_PERMISSIONS = [
  "view_students",
  "add_students",
  "edit_students",
  "delete_students",
  "view_teachers",
  "manage_teachers",
  "view_attendance",
  "take_attendance",
  "edit_attendance",
  "export_attendance",
  "view_payments",
  "add_payments",
  "delete_payments",
  "view_expenses",
  "add_expenses",
  "delete_expenses",
  "view_incomes",
  "add_incomes",
  "delete_incomes",
  "view_salaries",
  "manage_salaries",
  "view_reports",
  "export_reports",
  "manage_schools",
  "manage_subscriptions",
  "view_audit_logs",
  "manage_branches",
  "view_monitoring",
  "view_teacher_activity",
  "moderate_teacher_activity",
  "view_fee_notifications",
  "send_fee_notifications",
  "manage_schedule",
  "full_access",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

const LEGACY_ROLE_MAP: Record<string, UserRole> = {
  super_admin: "super_admin",
  owner: "super_admin",
  admin: "admin",
  manager: "admin",
  accountant: "admin",
  employee: "employee",
};

export function resolveKnownUserRole(role: string | null | undefined): UserRole | null {
  const value = (role || "").toLowerCase();
  return LEGACY_ROLE_MAP[value] ?? null;
}

export function normalizeUserRole(role: string | null | undefined): UserRole {
  return resolveKnownUserRole(role) ?? "employee";
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [...ALL_PERMISSIONS],
  admin: [
    "view_students",
    "add_students",
    "edit_students",
    "delete_students",
    "view_teachers",
    "manage_teachers",
    "view_attendance",
    "take_attendance",
    "edit_attendance",
    "export_attendance",
    "view_payments",
    "add_payments",
    "delete_payments",
    "view_expenses",
    "add_expenses",
    "delete_expenses",
    "view_incomes",
    "add_incomes",
    "delete_incomes",
    "view_salaries",
    "manage_salaries",
    "view_reports",
    "export_reports",
    "manage_branches",
    "view_monitoring",
    "view_teacher_activity",
    "moderate_teacher_activity",
    "view_fee_notifications",
    "send_fee_notifications",
  ],
  employee: [
    "view_students",
    "add_students",
    "edit_students",
    "view_attendance",
    "take_attendance",
    "edit_attendance",
    "view_payments",
    "add_payments",
  ],
};

export const PERMISSION_GROUPS: Array<{
  title: string;
  permissions: Array<{ key: Permission; label: string }>;
}> = [
  {
    title: "الطلاب",
    permissions: [
      { key: "view_students", label: "عرض الطلاب" },
      { key: "add_students", label: "إضافة الطلاب" },
      { key: "edit_students", label: "تعديل الطلاب" },
      { key: "delete_students", label: "حذف الطلاب" },
    ],
  },
  {
    title: "الأساتذة",
    permissions: [
      { key: "view_teachers", label: "عرض الأساتذة" },
      { key: "manage_teachers", label: "إدارة الأساتذة" },
    ],
  },
  {
    title: "الحضور",
    permissions: [
      { key: "view_attendance", label: "عرض الحضور" },
      { key: "take_attendance", label: "تسجيل الحضور" },
      { key: "edit_attendance", label: "تعديل الحضور" },
      { key: "export_attendance", label: "تصدير الحضور" },
    ],
  },
  {
    title: "الحسابات",
    permissions: [
      { key: "view_payments", label: "عرض الحسابات" },
      { key: "add_payments", label: "إضافة الحسابات" },
      { key: "delete_payments", label: "حذف الحسابات" },
    ],
  },
  {
    title: "المصروفات",
    permissions: [
      { key: "view_expenses", label: "عرض المصروفات" },
      { key: "add_expenses", label: "إضافة المصروفات" },
      { key: "delete_expenses", label: "حذف المصروفات" },
    ],
  },
  {
    title: "الإيرادات",
    permissions: [
      { key: "view_incomes", label: "عرض الإيرادات" },
      { key: "add_incomes", label: "إضافة الإيرادات" },
      { key: "delete_incomes", label: "حذف الإيرادات" },
    ],
  },
  {
    title: "الرواتب",
    permissions: [
      { key: "view_salaries", label: "عرض الرواتب" },
      { key: "manage_salaries", label: "إدارة الرواتب" },
    ],
  },
  {
    title: "المدرسة والمنشأة",
    permissions: [{ key: "manage_branches", label: "إدارة الفروع" }],
  },
  {
    title: "التقارير",
    permissions: [
      { key: "view_reports", label: "عرض التقارير" },
      { key: "export_reports", label: "تصدير التقارير" },
    ],
  },
  {
    title: "مراقبة نشاط التطبيق",
    permissions: [
      { key: "view_teacher_activity", label: "عرض نشاط الأساتذة" },
      { key: "moderate_teacher_activity", label: "تعديل وحذف محتوى الأساتذة" },
      { key: "view_fee_notifications", label: "عرض سجل تنبيهات الأقساط" },
      { key: "send_fee_notifications", label: "إرسال تنبيهات الأقساط" },
    ],
  },
  {
    title: "الإدارة العليا",
    permissions: [
      { key: "manage_schools", label: "إدارة المدارس المشتركة" },
      { key: "manage_subscriptions", label: "إدارة الاشتراكات" },
      { key: "view_audit_logs", label: "عرض سجل العمليات" },
      { key: "view_monitoring", label: "مراقبة صحة النظام" },
      { key: "full_access", label: "صلاحية كاملة (Super Admin)" },
    ],
  },
];

export function buildTemplatePermissions(role: UserRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function resolveEffectivePermissions(
  customPermissions: unknown,
  basePermissions: unknown,
  role: UserRole,
): Permission[] {
  if (Array.isArray(customPermissions) && customPermissions.length > 0) {
    return normalizePermissions(customPermissions, role);
  }
  return normalizePermissions(basePermissions, role);
}

export function normalizePermissions(input: unknown, role: UserRole): Permission[] {
  if (!Array.isArray(input) || input.length === 0) {
    return buildTemplatePermissions(role);
  }

  const allowed = new Set<Permission>(ALL_PERMISSIONS);
  const normalized = input
    .filter((item): item is string => typeof item === "string")
    .filter((item): item is Permission => allowed.has(item as Permission));

  if (normalized.length === 0) {
    return buildTemplatePermissions(role);
  }

  const unique = Array.from(new Set(normalized));
  if (unique.includes("full_access")) {
    return ["full_access", ...ALL_PERMISSIONS.filter((item) => item !== "full_access")];
  }

  return unique;
}

export function hasPermissionInList(
  permissions: Permission[] | null | undefined,
  permission: Permission,
): boolean {
  if (!permissions || permissions.length === 0) return false;
  return permissions.includes("full_access") || permissions.includes(permission);
}

export function hasAnyPermission(
  permissions: Permission[] | null | undefined,
  required: Permission[],
): boolean {
  if (!permissions || permissions.length === 0) return false;
  if (permissions.includes("full_access")) return true;
  return required.some((permission) => permissions.includes(permission));
}

export function hasAllPermissions(
  permissions: Permission[] | null | undefined,
  required: Permission[],
): boolean {
  if (!permissions || permissions.length === 0) return false;
  if (permissions.includes("full_access")) return true;
  return required.every((permission) => permissions.includes(permission));
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return hasPermissionInList(ROLE_PERMISSIONS[role], permission);
}

export interface RouteAccessRule {
  pathPrefix: string;
  roles: UserRole[];
  readOnlyRoles?: UserRole[];
  requiresActiveSchool?: boolean;
}

export interface RoutePermissionRule {
  pathPrefix: string;
  permissions: Permission[];
  requireAll?: boolean;
}

export const PUBLIC_PATHS = ["/login", "/forgot-password", "/access-denied", "/subscription-expired"] as const;

export const ROUTE_ACCESS_RULES: RouteAccessRule[] = [
  { pathPrefix: "/branch-overview", roles: ["admin", "employee"], requiresActiveSchool: true },
  { pathPrefix: "/group", roles: ["admin"], requiresActiveSchool: true },
  { pathPrefix: "/super-admin", roles: ["super_admin"], requiresActiveSchool: false },
  { pathPrefix: "/schools", roles: ["super_admin"], requiresActiveSchool: false },
  { pathPrefix: "/subscriptions", roles: ["super_admin"], requiresActiveSchool: false },
  {
    pathPrefix: "/dashboard",
    roles: ["super_admin", "admin", "employee"],
    requiresActiveSchool: true,
  },
  {
    pathPrefix: "/students",
    roles: ["super_admin", "admin", "employee"],
    requiresActiveSchool: true,
  },
  {
    pathPrefix: "/teachers",
    roles: ["super_admin", "admin"],
    requiresActiveSchool: true,
  },
  {
    pathPrefix: "/payments",
    roles: ["super_admin", "admin", "employee"],
    requiresActiveSchool: true,
  },
  {
    pathPrefix: "/expenses",
    roles: ["super_admin", "admin"],
    requiresActiveSchool: true,
  },
  {
    pathPrefix: "/incomes",
    roles: ["super_admin", "admin"],
    requiresActiveSchool: true,
  },
  {
    pathPrefix: "/salaries",
    roles: ["super_admin", "admin"],
    requiresActiveSchool: true,
  },
  {
    pathPrefix: "/reports",
    roles: ["super_admin", "admin"],
    requiresActiveSchool: true,
  },
  {
    pathPrefix: "/monitoring",
    roles: ["super_admin", "admin"],
    requiresActiveSchool: true,
  },
  {
    pathPrefix: "/fee-notifications",
    roles: ["super_admin", "admin"],
    requiresActiveSchool: true,
  },
  {
    pathPrefix: "/attendance",
    roles: ["super_admin", "admin", "employee"],
    requiresActiveSchool: true,
  },
  {
    pathPrefix: "/",
    roles: ["super_admin", "admin", "employee"],
    requiresActiveSchool: true,
  },
];

export const ROUTE_PERMISSION_RULES: RoutePermissionRule[] = [
  { pathPrefix: "/students", permissions: ["view_students"] },
  { pathPrefix: "/teachers", permissions: ["view_teachers"] },
  { pathPrefix: "/attendance", permissions: ["view_attendance"] },
  { pathPrefix: "/payments", permissions: ["view_payments"] },
  { pathPrefix: "/expenses", permissions: ["view_expenses"] },
  { pathPrefix: "/incomes", permissions: ["view_incomes"] },
  { pathPrefix: "/salaries", permissions: ["view_salaries"] },
  { pathPrefix: "/reports", permissions: ["view_reports"] },
  { pathPrefix: "/schools", permissions: ["manage_schools"] },
  { pathPrefix: "/subscriptions", permissions: ["manage_subscriptions"] },
  { pathPrefix: "/super-admin", permissions: ["full_access"] },
  { pathPrefix: "/monitoring", permissions: ["view_monitoring", "view_teacher_activity"] },
  { pathPrefix: "/fee-notifications", permissions: ["view_fee_notifications"] },
];

export const DEFAULT_PATH_BY_ROLE: Record<UserRole, string> = {
  super_admin: "/super-admin",
  admin: "/dashboard",
  employee: "/dashboard",
};

export interface SidebarItem {
  id: string;
  label: string;
  href: string;
  iconToken: string;
  roles: UserRole[];
  group: "general" | "academic" | "finance" | "system" | "admin";
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: "dashboard",
    label: "لوحة التحكم",
    href: "/dashboard",
    iconToken: "📊",
    roles: ["super_admin", "admin", "employee"],
    group: "general",
  },
  {
    id: "students",
    label: "الطلاب",
    href: "/students",
    iconToken: "👥",
    roles: ["super_admin", "admin", "employee"],
    group: "academic",
  },
  {
    id: "teachers",
    label: "الأساتذة",
    href: "/teachers",
    iconToken: "👨‍🏫",
    roles: ["super_admin", "admin"],
    group: "academic",
  },
  {
    id: "attendance",
    label: "الحضور",
    href: "/attendance",
    iconToken: "📋",
    roles: ["super_admin", "admin", "employee"],
    group: "academic",
  },
  {
    id: "payments",
    label: "الحسابات",
    href: "/payments",
    iconToken: "💳",
    roles: ["super_admin", "admin", "employee"],
    group: "finance",
  },
  {
    id: "expenses",
    label: "المصروفات",
    href: "/expenses",
    iconToken: "💸",
    roles: ["super_admin", "admin"],
    group: "finance",
  },
  {
    id: "incomes",
    label: "الإيرادات",
    href: "/incomes",
    iconToken: "💰",
    roles: ["super_admin", "admin"],
    group: "finance",
  },
  {
    id: "salaries",
    label: "الرواتب",
    href: "/salaries",
    iconToken: "💼",
    roles: ["super_admin", "admin"],
    group: "finance",
  },
  {
    id: "monitoring",
    label: "مراقبة الأساتذة",
    href: "/monitoring",
    iconToken: "🛰️",
    roles: ["super_admin", "admin"],
    group: "system",
  },
  {
    id: "fee-notifications",
    label: "تنبيهات الأقساط",
    href: "/fee-notifications",
    iconToken: "🔔",
    roles: ["super_admin", "admin"],
    group: "system",
  },
  {
    id: "reports",
    label: "التقارير",
    href: "/reports",
    iconToken: "📄",
    roles: ["super_admin", "admin"],
    group: "system",
  },
  {
    id: "super-admin",
    label: "الإدارة العامة",
    href: "/super-admin",
    iconToken: "👑",
    roles: ["super_admin"],
    group: "admin",
  },
  {
    id: "schools",
    label: "المدارس",
    href: "/schools",
    iconToken: "🏫",
    roles: ["super_admin"],
    group: "admin",
  },
  {
    id: "subscriptions",
    label: "الاشتراكات",
    href: "/subscriptions",
    iconToken: "🧾",
    roles: ["super_admin"],
    group: "admin",
  },
  {
    id: "branch-overview",
    label: "لوحة الفرع",
    href: "/branch-overview",
    iconToken: "📊",
    roles: ["admin", "employee"],
    group: "general",
  },
];

const LOCALE_SEGMENTS = new Set(["ar", "en"]);

export function normalizePath(pathname: string): string {
  if (!pathname) return "/";

  let normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  const parts = normalized.split("/").filter(Boolean);
  if (parts.length > 0 && LOCALE_SEGMENTS.has(parts[0])) {
    const stripped = parts.slice(1).join("/");
    return stripped ? `/${stripped}` : "/";
  }

  return normalized;
}

export function isPathMatch(pathname: string, pathPrefix: string): boolean {
  const p = normalizePath(pathname);
  const prefix = normalizePath(pathPrefix);
  if (prefix === "/") return p === "/";
  return p === prefix || p.startsWith(`${prefix}/`);
}

export function getMatchingRouteRule(pathname: string): RouteAccessRule | null {
  const p = normalizePath(pathname);
  const sorted = [...ROUTE_ACCESS_RULES].sort((a, b) => b.pathPrefix.length - a.pathPrefix.length);
  return sorted.find((rule) => isPathMatch(p, rule.pathPrefix)) ?? null;
}

export function getMatchingPermissionRule(pathname: string): RoutePermissionRule | null {
  const p = normalizePath(pathname);
  const sorted = [...ROUTE_PERMISSION_RULES].sort((a, b) => b.pathPrefix.length - a.pathPrefix.length);
  return sorted.find((rule) => isPathMatch(p, rule.pathPrefix)) ?? null;
}

export function isRoleAllowedForPath(role: UserRole, pathname: string): boolean {
  const rule = getMatchingRouteRule(pathname);
  if (!rule) return false;
  return rule.roles.includes(role);
}

export function isPathReadOnlyForRole(role: UserRole, pathname: string): boolean {
  const rule = getMatchingRouteRule(pathname);
  if (!rule?.readOnlyRoles) return false;
  return rule.readOnlyRoles.includes(role);
}

export function getSidebarItemsForRole(role?: UserRole | null) {
  if (!role) return [];
  return SIDEBAR_ITEMS.filter((item) => item.roles.includes(role));
}
