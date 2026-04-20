import {
  filterAllowedPageCodes,
  getPathForPageCode,
  type PageCode,
} from "@/lib/authorization/page-access";
import {
  isRoleAllowedForPath,
  type Permission,
  type UserRole,
} from "@/types/roles";

export type EditableScopeLevel =
  | "super_admin"
  | "group_admin"
  | "branch_user"
  | "restricted";

export type PageAccessGrant = {
  page_code: PageCode;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_export: boolean;
};

export type ScopedUserConfig = {
  schoolId: string | null;
  branchId: string | null;
  defaultBranchId: string | null;
  scopeLevel: EditableScopeLevel;
  isSinglePageUser: boolean;
  allowedPages: PageCode[];
  allowedModule: string | null;
  pageAccessGrants: PageAccessGrant[];
};

export class ScopedUserConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScopedUserConfigError";
  }
}

const FOCUSED_FORBIDDEN_PAGES = new Set<PageCode>([
  "dashboard",
  "group",
  "super-admin",
  "schools",
  "subscriptions",
]);

function hasPermission(permissions: Permission[], permission: Permission) {
  return permissions.includes("full_access") || permissions.includes(permission);
}

function buildGrantForPage(pageCode: PageCode, permissions: Permission[]): PageAccessGrant {
  const allowAll = permissions.includes("full_access");

  switch (pageCode) {
    case "students":
      return {
        page_code: pageCode,
        can_view: true,
        can_create: allowAll || hasPermission(permissions, "add_students"),
        can_update: allowAll || hasPermission(permissions, "edit_students"),
        can_delete: allowAll || hasPermission(permissions, "delete_students"),
        can_approve: false,
        can_export: allowAll,
      };
    case "payments":
      return {
        page_code: pageCode,
        can_view: true,
        can_create: allowAll || hasPermission(permissions, "add_payments"),
        can_update: allowAll || hasPermission(permissions, "add_payments"),
        can_delete: allowAll || hasPermission(permissions, "delete_payments"),
        can_approve: false,
        can_export: allowAll,
      };
    case "attendance":
      return {
        page_code: pageCode,
        can_view: allowAll || hasPermission(permissions, "view_attendance"),
        can_create: allowAll || hasPermission(permissions, "take_attendance"),
        can_update: allowAll || hasPermission(permissions, "edit_attendance"),
        can_delete: false,
        can_approve: false,
        can_export: allowAll || hasPermission(permissions, "export_attendance"),
      };
    case "teachers":
      return {
        page_code: pageCode,
        can_view: allowAll || hasPermission(permissions, "view_teachers"),
        can_create: allowAll || hasPermission(permissions, "manage_teachers"),
        can_update: allowAll || hasPermission(permissions, "manage_teachers"),
        can_delete: allowAll || hasPermission(permissions, "manage_teachers"),
        can_approve: false,
        can_export: allowAll,
      };
    case "expenses":
      return {
        page_code: pageCode,
        can_view: allowAll || hasPermission(permissions, "view_expenses"),
        can_create: allowAll || hasPermission(permissions, "add_expenses"),
        can_update: allowAll || hasPermission(permissions, "add_expenses"),
        can_delete: allowAll || hasPermission(permissions, "delete_expenses"),
        can_approve: false,
        can_export: allowAll,
      };
    case "salaries":
      return {
        page_code: pageCode,
        can_view: true,
        can_create: allowAll || hasPermission(permissions, "manage_salaries"),
        can_update: allowAll || hasPermission(permissions, "manage_salaries"),
        can_delete: allowAll || hasPermission(permissions, "manage_salaries"),
        can_approve: allowAll || hasPermission(permissions, "manage_salaries"),
        can_export: allowAll || hasPermission(permissions, "manage_salaries"),
      };
    case "reports":
      return {
        page_code: pageCode,
        can_view: allowAll || hasPermission(permissions, "view_reports"),
        can_create: false,
        can_update: false,
        can_delete: false,
        can_approve: false,
        can_export: allowAll || hasPermission(permissions, "export_reports"),
      };
    case "monitoring":
      return {
        page_code: pageCode,
        can_view: true,
        can_create: false,
        can_update: allowAll || hasPermission(permissions, "moderate_teacher_activity"),
        can_delete: allowAll || hasPermission(permissions, "moderate_teacher_activity"),
        can_approve: false,
        can_export: allowAll,
      };
    case "fee-notifications":
      return {
        page_code: pageCode,
        can_view: true,
        can_create: allowAll || hasPermission(permissions, "send_fee_notifications"),
        can_update: allowAll || hasPermission(permissions, "send_fee_notifications"),
        can_delete: false,
        can_approve: false,
        can_export: allowAll,
      };
    default:
      return {
        page_code: pageCode,
        can_view: true,
        can_create: allowAll,
        can_update: allowAll,
        can_delete: allowAll,
        can_approve: allowAll,
        can_export: allowAll,
      };
  }
}

export function resolveScopedUserConfig(input: {
  role: UserRole;
  schoolId: string | null;
  branchId?: string | null;
  scopeLevel?: string | null;
  isSinglePageUser?: boolean;
  allowedPages?: Iterable<string | null | undefined>;
  permissions: Permission[];
}): ScopedUserConfig {
  const normalizedPages = filterAllowedPageCodes(input.allowedPages ?? []);

  if (input.role === "super_admin") {
    return {
      schoolId: null,
      branchId: null,
      defaultBranchId: null,
      scopeLevel: "super_admin",
      isSinglePageUser: false,
      allowedPages: [],
      allowedModule: null,
      pageAccessGrants: [],
    };
  }

  if (!input.schoolId) {
    throw new ScopedUserConfigError("ربط المدرسة مطلوب لهذا المستخدم.");
  }

  const requestedScope = (input.scopeLevel || "").trim().toLowerCase();
  const scopeLevel: EditableScopeLevel =
    requestedScope === "branch_user" || (requestedScope === "restricted" && Boolean(input.branchId))
      ? "branch_user"
      : requestedScope === "super_admin"
        ? "super_admin"
        : "group_admin";

  const branchId = scopeLevel === "branch_user" ? (input.branchId ?? null) : null;
  if (scopeLevel === "branch_user" && !branchId) {
    throw new ScopedUserConfigError("يجب اختيار الفرع للمستخدمين على مستوى الفرع.");
  }

  if (requestedScope === "restricted" && normalizedPages.length === 0) {
    throw new ScopedUserConfigError("يجب اختيار صفحة واحدة على الأقل عند استخدام النمط المقيّد القديم.");
  }

  if (normalizedPages.length > 0) {
    const invalidPages = normalizedPages.filter((pageCode) => {
      if (FOCUSED_FORBIDDEN_PAGES.has(pageCode)) {
        return true;
      }

      const pagePath = getPathForPageCode(pageCode);
      return !pagePath || !isRoleAllowedForPath(input.role, pagePath);
    });

    if (invalidPages.length > 0) {
      throw new ScopedUserConfigError("بعض الصفحات المحددة غير متاحة لهذا الدور أو لا تصلح كمجال مقيّد.");
    }
  }

  const allowedPages = normalizedPages;
  const isSinglePageUser = allowedPages.length === 1;

  return {
    schoolId: input.schoolId,
    branchId,
    defaultBranchId: branchId,
    scopeLevel,
    isSinglePageUser,
    allowedPages,
    allowedModule: allowedPages[0] ?? null,
    pageAccessGrants: allowedPages.map((pageCode) => buildGrantForPage(pageCode, input.permissions)),
  };
}
