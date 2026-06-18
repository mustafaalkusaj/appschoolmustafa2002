export const ROLES = ["super_admin", "admin", "employee", "parent"] as const;

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
  "manage_schedule",
  "send_notifications",
  "view_notifications",
  "manage_announcements",
  "view_teacher_attendance",
  "take_teacher_attendance",
  "edit_teacher_attendance",
  "export_teacher_attendance",
  "manage_attendance_settings",
  "view_grades",
  "enter_grades",
  "confirm_grades",
  "lock_grades",
  "manage_grade_schemes",
  "export_grades",
  "view_grade_analytics",
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
  parent: "parent",
  guardian: "parent",
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
    "manage_schedule",
    "send_notifications",
    "view_notifications",
    "manage_announcements",
    "view_teacher_attendance",
    "take_teacher_attendance",
    "edit_teacher_attendance",
    "export_teacher_attendance",
    "manage_attendance_settings",
    "view_grades",
    "enter_grades",
    "confirm_grades",
    "lock_grades",
    "manage_grade_schemes",
    "export_grades",
    "view_grade_analytics",
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
    "manage_schedule",
    "view_teacher_attendance",
    "take_teacher_attendance",
    "view_grades",
    "enter_grades",
  ],
  parent: [
    "view_students",
    "view_attendance",
    "view_payments",
    "view_grades",
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
    title: "جدول الحصص",
    permissions: [{ key: "manage_schedule", label: "إدارة جدول الحصص" }],
  },
  {
    title: "مراقبة نشاط التطبيق",
    permissions: [
      { key: "view_teacher_activity", label: "عرض نشاط الأساتذة" },
      { key: "moderate_teacher_activity", label: "تعديل وحذف محتوى الأساتذة" },
    ],
  },
  {
    title: "حضور الأساتذة",
    permissions: [
      { key: "view_teacher_attendance", label: "عرض حضور الأساتذة" },
      { key: "take_teacher_attendance", label: "تسجيل حضور الأساتذة" },
      { key: "edit_teacher_attendance", label: "تعديل حضور الأساتذة" },
      { key: "export_teacher_attendance", label: "تصدير حضور الأساتذة" },
      { key: "manage_attendance_settings", label: "إعدادات الحضور" },
    ],
  },
  {
    title: "الإشعارات",
    permissions: [
      { key: "view_notifications", label: "عرض الإشعارات" },
      { key: "send_notifications", label: "إرسال الإشعارات" },
      { key: "manage_announcements", label: "إدارة الإعلانات" },
    ],
  },
  {
    title: "الدرجات والأعمال الأكاديمية",
    permissions: [
      { key: "view_grades", label: "عرض الدرجات" },
      { key: "enter_grades", label: "إدخال الدرجات" },
      { key: "confirm_grades", label: "تأكيد الدرجات" },
      { key: "lock_grades", label: "قفل الدرجات" },
      { key: "manage_grade_schemes", label: "إدارة توزيع الدرجات" },
      { key: "export_grades", label: "تصدير الدرجات" },
      { key: "view_grade_analytics", label: "تحليلات الدرجات" },
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

export const PUBLIC_PATHS = ["/login", "/forgot-password", "/access-denied", "/subscription-expired", "/upload"] as const;

export const ROUTE_ACCESS_RULES: RouteAccessRule[] = [
  {
    pathPrefix: "/parent",
    roles: ["parent"],
    readOnlyRoles: ["parent"],
    requiresActiveSchool: true,
  },
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
    pathPrefix: "/classes",
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
    pathPrefix: "/payroll",
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
    pathPrefix: "/notifications",
    roles: ["super_admin", "admin"],
    requiresActiveSchool: true,
  },
  {
    pathPrefix: "/attendance",
    roles: ["super_admin", "admin", "employee"],
    requiresActiveSchool: true,
  },
  {
    pathPrefix: "/teacher-attendance",
    roles: ["super_admin", "admin"],
    requiresActiveSchool: true,
  },
  {
    pathPrefix: "/teacher-activities",
    roles: ["super_admin", "admin"],
    requiresActiveSchool: true,
  },
  {
    pathPrefix: "/grades",
    roles: ["super_admin", "admin", "employee"],
    requiresActiveSchool: true,
  },
  {
    pathPrefix: "/schedule",
    roles: ["super_admin", "admin", "employee"],
    requiresActiveSchool: true,
  },
  {
    pathPrefix: "/calendar",
    roles: ["super_admin", "admin", "employee"],
    requiresActiveSchool: true,
  },
  {
    pathPrefix: "/exams",
    roles: ["super_admin", "admin", "employee"],
    requiresActiveSchool: true,
  },
  {
    pathPrefix: "/behavior",
    roles: ["super_admin", "admin", "employee"],
    requiresActiveSchool: true,
  },
  {
    pathPrefix: "/messaging",
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
  { pathPrefix: "/classes", permissions: ["view_students"] },
  { pathPrefix: "/teachers", permissions: ["view_teachers"] },
  { pathPrefix: "/attendance", permissions: ["view_attendance"] },
  { pathPrefix: "/payments", permissions: ["view_payments"] },
  { pathPrefix: "/expenses", permissions: ["view_expenses"] },
  { pathPrefix: "/incomes", permissions: ["view_incomes"] },
  { pathPrefix: "/salaries", permissions: ["view_salaries"] },
  { pathPrefix: "/payroll", permissions: ["manage_salaries"] },
  { pathPrefix: "/reports", permissions: ["view_reports"] },
  { pathPrefix: "/schools", permissions: ["manage_schools"] },
  { pathPrefix: "/subscriptions", permissions: ["manage_subscriptions"] },
  { pathPrefix: "/parent", permissions: ["view_students"] },
  { pathPrefix: "/super-admin", permissions: ["full_access"] },
  { pathPrefix: "/monitoring", permissions: ["view_monitoring", "view_teacher_activity"] },
  { pathPrefix: "/notifications", permissions: ["view_notifications"] },
  { pathPrefix: "/grades", permissions: ["view_grades"] },
  { pathPrefix: "/schedule", permissions: ["view_students"] },
  { pathPrefix: "/teacher-attendance", permissions: ["view_teacher_attendance"] },
];

export const DEFAULT_PATH_BY_ROLE: Record<UserRole, string> = {
  super_admin: "/super-admin",
  admin: "/dashboard",
  employee: "/dashboard",
  parent: "/parent",
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
    id: "classes",
    label: "الصفوف والشعب",
    href: "/classes",
    iconToken: "🏫",
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
    id: "teacher-attendance",
    label: "حضور الأساتذة",
    href: "/teacher-attendance",
    iconToken: "🧑‍🏫",
    roles: ["super_admin", "admin"],
    group: "academic",
  },
  {
    id: "schedule",
    label: "جدول الحصص",
    href: "/schedule",
    iconToken: "🗓️",
    roles: ["super_admin", "admin", "employee"],
    group: "academic",
  },
  {
    id: "calendar",
    label: "التقويم الذكي",
    href: "/calendar",
    iconToken: "📆",
    roles: ["super_admin", "admin", "employee"],
    group: "academic",
  },
  {
    id: "teacher-activities",
    label: "متابعة نشاط الأساتذة",
    href: "/teacher-activities",
    iconToken: "📊",
    roles: ["super_admin", "admin"],
    group: "academic",
  },
  {
    id: "grades",
    label: "درجات الطلاب",
    href: "/grades",
    iconToken: "🎓",
    roles: ["super_admin", "admin", "employee"],
    group: "academic",
  },
  {
    id: "exams",
    label: "الامتحانات",
    href: "/exams",
    iconToken: "📝",
    roles: ["super_admin", "admin", "employee"],
    group: "academic",
  },
  {
    id: "behavior",
    label: "سجل السلوك",
    href: "/behavior",
    iconToken: "📋",
    roles: ["super_admin", "admin", "employee"],
    group: "academic",
  },
  {
    id: "messaging",
    label: "الرسائل",
    href: "/messaging",
    iconToken: "💬",
    roles: ["super_admin", "admin", "employee"],
    group: "system",
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
    id: "notifications",
    label: "الإشعارات",
    href: "/notifications",
    iconToken: "📣",
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
    id: "roles-settings",
    label: "إدارة الأدوار",
    href: "/dashboard/settings/roles",
    iconToken: "🔑",
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
  {
    id: "parent-dashboard",
    label: "لوحة ولي الأمر",
    href: "/parent",
    iconToken: "👨‍👧",
    roles: ["parent"],
    group: "general",
  },
  {
    id: "parent-grades",
    label: "الدرجات",
    href: "/parent/grades",
    iconToken: "🎓",
    roles: ["parent"],
    group: "academic",
  },
  {
    id: "parent-attendance",
    label: "الحضور",
    href: "/parent/attendance",
    iconToken: "📋",
    roles: ["parent"],
    group: "academic",
  },
  {
    id: "parent-payments",
    label: "المدفوعات",
    href: "/parent/payments",
    iconToken: "💳",
    roles: ["parent"],
    group: "finance",
  },
  {
    id: "parent-behavior",
    label: "سجل السلوك",
    href: "/parent/behavior",
    iconToken: "📋",
    roles: ["parent"],
    group: "academic",
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
