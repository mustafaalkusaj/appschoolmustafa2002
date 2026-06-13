/**
 * اختبارات شاملة لنظام Auth/RBAC
 * يغطي: rbac-session, auth, types/roles, perm-check
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// يجب mock هذا قبل أي import آخر لأن lib/env/server.ts يستورده
vi.mock("server-only", () => ({}));

// types/roles و perm-check لا يعتمدان على server-only — يمكن استيرادهم مباشرة
import {
  resolveKnownUserRole,
  normalizePermissions,
  hasPermissionInList,
  isRoleAllowedForPath,
  buildTemplatePermissions,
  ALL_PERMISSIONS,
} from "@/types/roles";

import {
  checkPermission,
  canReadPage,
  getDataScope,
  filterFields,
} from "@/lib/perm-check";

const TEST_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  RBAC_COOKIE_SECRET: "test-secret-at-least-32-chars-xxxx",
};

// ============================================================
// 1. RBAC Session (lib/rbac-session.ts)
// ============================================================

describe("RBAC Session - buildRBACSessionPayload", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, TEST_ENV);
  });

  const buildTestInput = (overrides: Record<string, unknown> = {}) => ({
    userId: "user-1",
    role: "admin" as const,
    permissions: ["view_students"] as any[],
    schoolId: "school-1",
    branchId: "branch-1",
    allowedBranchIds: ["branch-1"],
    userActive: true,
    schoolActive: true,
    subscriptionStatus: "active",
    subscriptionEnd: null,
    scopeLevel: "branch_user" as const,
    allowedModule: null,
    allowedModules: [],
    allowedPages: [],
    defaultPath: "/ar/dashboard",
    isSinglePageUser: false,
    hierarchyLevel: null,
    permissionsVersion: 1,
    groupId: null,
    ...overrides,
  });

  it("يجب أن تكون RBAC_SESSION_MAX_AGE تساوي 8 * 60 * 60 = 28800", async () => {
    const { RBAC_SESSION_MAX_AGE } = await import("@/lib/rbac-session");
    expect(RBAC_SESSION_MAX_AGE).toBe(28800);
  });

  it("يجب أن تحسب exp = iat + 28800", async () => {
    const { buildRBACSessionPayload, RBAC_SESSION_MAX_AGE } = await import("@/lib/rbac-session");

    const before = Math.floor(Date.now() / 1000);
    const payload = buildRBACSessionPayload(buildTestInput());
    const after = Math.floor(Date.now() / 1000);

    expect(payload.iat).toBeGreaterThanOrEqual(before);
    expect(payload.iat).toBeLessThanOrEqual(after);
    expect(payload.exp).toBe(payload.iat + RBAC_SESSION_MAX_AGE);
    expect(payload.exp - payload.iat).toBe(28800);
  });

  it("يجب أن يضع version=2 عندما لا توجد deepPermissions", async () => {
    const { buildRBACSessionPayload } = await import("@/lib/rbac-session");

    const payload = buildRBACSessionPayload(buildTestInput());

    expect(payload.version).toBe(2);
  });

  it("يجب أن يضع version=3 عندما توجد deepPermissions", async () => {
    const { buildRBACSessionPayload } = await import("@/lib/rbac-session");

    const payload = buildRBACSessionPayload(buildTestInput({
      deepPermissions: {
        students: {
          actions: { read: true, create: false },
          fields: {},
          special: {},
          data_scope: "all",
        },
      },
    }));

    expect(payload.version).toBe(3);
  });

  it("يجب أن يضغط الصلاحيات الافتراضية للدور إلى مصفوفة فارغة", async () => {
    const { buildTemplatePermissions } = await import("@/types/roles");
    const { buildRBACSessionPayload } = await import("@/lib/rbac-session");

    const defaultPerms = buildTemplatePermissions("admin");
    const payload = buildRBACSessionPayload(buildTestInput({ permissions: defaultPerms }));

    // الصلاحيات الافتراضية تُضغط إلى []
    expect(payload.permissions).toEqual([]);
  });

  it("يجب أن يحافظ على الصلاحيات المخصصة المختلفة عن الافتراضية", async () => {
    const { buildRBACSessionPayload } = await import("@/lib/rbac-session");

    const customPerms = ["view_students", "view_payments"];
    const payload = buildRBACSessionPayload(buildTestInput({ permissions: customPerms }));

    expect(payload.permissions).toEqual(["view_students", "view_payments"]);
  });
});

describe("RBAC Session - signRBACSession و verifyRBACSession", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, TEST_ENV);
  });

  it("يجب أن يوقّع الجلسة ويتحقق منها بنجاح", async () => {
    const { buildRBACSessionPayload, signRBACSession, verifyRBACSession } = await import("@/lib/rbac-session");

    const payload = buildRBACSessionPayload({
      userId: "user-sign-test",
      role: "employee",
      permissions: ["view_students"],
      schoolId: "school-1",
      branchId: null,
      allowedBranchIds: [],
      userActive: true,
      schoolActive: true,
      subscriptionStatus: "active",
      subscriptionEnd: null,
      scopeLevel: null,
      allowedModule: null,
      allowedModules: [],
      allowedPages: [],
      defaultPath: "/dashboard",
      isSinglePageUser: false,
      hierarchyLevel: null,
      permissionsVersion: 1,
      groupId: null,
    });

    const token = await signRBACSession(payload);
    expect(typeof token).toBe("string");
    expect(token!.length).toBeGreaterThan(0);

    const verified = await verifyRBACSession(token!);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe("user-sign-test");
    expect(verified?.role).toBe("employee");
  });

  it("يجب أن يرجع null عند التحقق من token فارغ أو undefined", async () => {
    const { verifyRBACSession } = await import("@/lib/rbac-session");

    expect(await verifyRBACSession(null)).toBeNull();
    expect(await verifyRBACSession(undefined)).toBeNull();
    expect(await verifyRBACSession("")).toBeNull();
  });

  it("يجب أن يرجع null عند التحقق من token مزيف", async () => {
    const { verifyRBACSession } = await import("@/lib/rbac-session");

    const result = await verifyRBACSession("invalid.token.here");
    expect(result).toBeNull();
  });

  it("يجب أن يستعيد الصلاحيات الافتراضية بعد التحقق من token مضغوط", async () => {
    const { buildTemplatePermissions } = await import("@/types/roles");
    const { buildRBACSessionPayload, signRBACSession, verifyRBACSession } = await import("@/lib/rbac-session");

    const defaultPerms = buildTemplatePermissions("super_admin");
    const payload = buildRBACSessionPayload({
      userId: "super-1",
      role: "super_admin",
      permissions: defaultPerms,
      schoolId: null,
      branchId: null,
      allowedBranchIds: [],
      userActive: true,
      schoolActive: true,
      subscriptionStatus: null,
      subscriptionEnd: null,
      scopeLevel: "super_admin",
      allowedModule: null,
      allowedModules: [],
      allowedPages: [],
      defaultPath: "/super-admin",
      isSinglePageUser: false,
      hierarchyLevel: null,
      permissionsVersion: 1,
      groupId: null,
    });

    // مضغوط إلى []
    expect(payload.permissions).toEqual([]);

    const token = await signRBACSession(payload);
    const verified = await verifyRBACSession(token!);

    // يجب استعادة الصلاحيات الافتراضية
    expect(verified?.permissions).toEqual(defaultPerms);
  });
});

// ============================================================
// 2. Auth functions (lib/auth.ts)
// ============================================================

describe("Auth - hasPermission", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, TEST_ENV);
  });

  it("يجب أن يرجع false عند تمرير null", async () => {
    const { hasPermission } = await import("@/lib/auth");
    expect(hasPermission(null, "view_students")).toBe(false);
  });

  it("يجب أن يرجع true عندما يملك المستخدم الصلاحية", async () => {
    const { hasPermission } = await import("@/lib/auth");

    const profile = {
      id: "u1",
      full_name: "Test User",
      email: "test@example.com",
      role: "admin" as const,
      permissions: ["view_students", "view_payments"] as const,
      school_id: "school-1",
      is_active: true,
    };

    expect(hasPermission(profile, "view_students")).toBe(true);
  });

  it("يجب أن يرجع false عندما لا يملك المستخدم الصلاحية", async () => {
    const { hasPermission } = await import("@/lib/auth");

    const profile = {
      id: "u1",
      full_name: "Test User",
      email: "test@example.com",
      role: "employee" as const,
      permissions: ["view_students"] as const,
      school_id: "school-1",
      is_active: true,
    };

    expect(hasPermission(profile, "delete_students")).toBe(false);
  });

  it("يجب أن يرجع true لدور super_admin عبر اسم الدور مباشرة", async () => {
    const { hasPermission } = await import("@/lib/auth");
    // super_admin لديه كل الصلاحيات في قالب الدور
    expect(hasPermission("super_admin", "manage_schools")).toBe(true);
    expect(hasPermission("super_admin", "delete_students")).toBe(true);
  });

  it("يجب أن يرجع true عندما تحتوي permissions على full_access", async () => {
    const { hasPermission } = await import("@/lib/auth");

    const profile = {
      id: "u1",
      full_name: "Test User",
      email: "test@example.com",
      role: "admin" as const,
      permissions: ["full_access"] as const,
      school_id: "school-1",
      is_active: true,
    };

    expect(hasPermission(profile, "delete_students")).toBe(true);
    expect(hasPermission(profile, "manage_schools")).toBe(true);
  });
});

describe("Auth - isSubscriptionExpired", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, TEST_ENV);
  });

  it("يجب أن يرجع false عند تمرير null", async () => {
    const { isSubscriptionExpired } = await import("@/lib/auth");
    expect(isSubscriptionExpired(null)).toBe(false);
  });

  it("يجب أن يرجع false عند تمرير undefined", async () => {
    const { isSubscriptionExpired } = await import("@/lib/auth");
    expect(isSubscriptionExpired(undefined)).toBe(false);
  });

  it("يجب أن يرجع true لتاريخ انتهاء في الماضي", async () => {
    const { isSubscriptionExpired } = await import("@/lib/auth");
    // تاريخ منتهٍ: 2020-01-01
    expect(isSubscriptionExpired("2020-01-01")).toBe(true);
  });

  it("يجب أن يرجع false لتاريخ انتهاء في المستقبل", async () => {
    const { isSubscriptionExpired } = await import("@/lib/auth");
    // تاريخ مستقبلي: 2030-12-31
    expect(isSubscriptionExpired("2030-12-31")).toBe(false);
  });

  // تاريخ غير صالح يُعامل كـ not expired (لا يُرمى خطأ)
  it("يجب أن يرجع false عند تمرير تاريخ غير صالح", async () => {
    const { isSubscriptionExpired } = await import("@/lib/auth");
    expect(isSubscriptionExpired("not-a-date")).toBe(false);
  });
});

describe("Auth - getAccessDecision", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, TEST_ENV);
  });

  it("يجب أن يرجع unauthenticated عند تمرير null", async () => {
    const { getAccessDecision } = await import("@/lib/auth");
    const decision = getAccessDecision(null, "/dashboard");
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("unauthenticated");
  });

  it("يجب أن يرجع inactive_user للمستخدم غير النشط", async () => {
    const { getAccessDecision } = await import("@/lib/auth");

    const profile = {
      id: "u1",
      full_name: "Inactive User",
      email: "inactive@example.com",
      role: "admin" as const,
      permissions: ["view_students", "view_payments"] as const,
      school_id: "school-1",
      is_active: false,
    };

    const decision = getAccessDecision(profile, "/dashboard");
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("inactive_user");
  });

  it("يجب أن يسمح لـ super_admin بالوصول إلى /super-admin", async () => {
    const { getAccessDecision } = await import("@/lib/auth");
    const { buildTemplatePermissions } = await import("@/types/roles");

    const profile = {
      id: "super-1",
      full_name: "Super Admin",
      email: "super@example.com",
      role: "super_admin" as const,
      permissions: buildTemplatePermissions("super_admin"),
      school_id: null,
      is_active: true,
    };

    const decision = getAccessDecision(profile, "/super-admin");
    expect(decision.allowed).toBe(true);
  });

  it("يجب أن يمنع employee من الوصول إلى /super-admin", async () => {
    const { getAccessDecision } = await import("@/lib/auth");

    const profile = {
      id: "emp-1",
      full_name: "Employee",
      email: "emp@example.com",
      role: "employee" as const,
      permissions: ["view_students"] as const,
      school_id: "school-1",
      is_active: true,
    };

    const decision = getAccessDecision(profile, "/super-admin");
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("forbidden");
  });
});

describe("Auth - getDefaultRouteForProfile", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, TEST_ENV);
  });

  it("يجب أن يرجع /super-admin لـ super_admin", async () => {
    const { getDefaultRouteForProfile } = await import("@/lib/auth");
    const { buildTemplatePermissions } = await import("@/types/roles");

    const profile = {
      id: "super-1",
      full_name: "Super Admin",
      email: "super@example.com",
      role: "super_admin" as const,
      permissions: buildTemplatePermissions("super_admin"),
      school_id: null,
      is_active: true,
    };

    expect(getDefaultRouteForProfile(profile)).toBe("/super-admin");
  });

  it("يجب أن يرجع /dashboard لـ admin", async () => {
    const { getDefaultRouteForProfile } = await import("@/lib/auth");

    const profile = {
      id: "admin-1",
      full_name: "School Admin",
      email: "admin@example.com",
      role: "admin" as const,
      permissions: ["view_students"] as const,
      school_id: "school-1",
      is_active: true,
    };

    expect(getDefaultRouteForProfile(profile)).toBe("/dashboard");
  });

  it("يجب أن يرجع /group لـ group_admin", async () => {
    const { getDefaultRouteForProfile } = await import("@/lib/auth");

    const profile = {
      id: "group-1",
      full_name: "Group Manager",
      email: "group@example.com",
      role: "admin" as const,
      permissions: ["view_students"] as const,
      school_id: "school-1",
      is_active: true,
      scope_level: "group_admin" as const,
    };

    expect(getDefaultRouteForProfile(profile)).toBe("/group");
  });

  it("يجب أن يرجع /branch-overview لـ branch_user", async () => {
    const { getDefaultRouteForProfile } = await import("@/lib/auth");

    const profile = {
      id: "branch-1",
      full_name: "Branch User",
      email: "branch@example.com",
      role: "admin" as const,
      permissions: ["view_students"] as const,
      school_id: "school-1",
      is_active: true,
      scope_level: "branch_user" as const,
    };

    expect(getDefaultRouteForProfile(profile)).toBe("/branch-overview");
  });

  it("يجب أن يستخدم default_path إذا كان محدداً ويبدأ بـ /", async () => {
    const { getDefaultRouteForProfile } = await import("@/lib/auth");

    const profile = {
      id: "custom-1",
      full_name: "Custom Path User",
      email: "custom@example.com",
      role: "admin" as const,
      permissions: ["view_students"] as const,
      school_id: "school-1",
      is_active: true,
      default_path: "/payments",
    };

    expect(getDefaultRouteForProfile(profile)).toBe("/payments");
  });

  it("يجب أن يرجع /dashboard عند تمرير null", async () => {
    const { getDefaultRouteForProfile } = await import("@/lib/auth");
    expect(getDefaultRouteForProfile(null)).toBe("/dashboard");
  });
});

// ============================================================
// 3. Roles (types/roles.ts)
// ============================================================

describe("Roles - resolveKnownUserRole", () => {
  it('يجب أن يحوّل "owner" إلى "super_admin"', () => {
    expect(resolveKnownUserRole("owner")).toBe("super_admin");
  });

  it('يجب أن يحوّل "manager" إلى "admin"', () => {
    expect(resolveKnownUserRole("manager")).toBe("admin");
  });

  it('يجب أن يحوّل "accountant" إلى "admin"', () => {
    expect(resolveKnownUserRole("accountant")).toBe("admin");
  });

  it('يجب أن يحوّل "super_admin" إلى "super_admin"', () => {
    expect(resolveKnownUserRole("super_admin")).toBe("super_admin");
  });

  it('يجب أن يحوّل "admin" إلى "admin"', () => {
    expect(resolveKnownUserRole("admin")).toBe("admin");
  });

  it('يجب أن يحوّل "employee" إلى "employee"', () => {
    expect(resolveKnownUserRole("employee")).toBe("employee");
  });

  it("يجب أن يرجع null لدور غير معروف", () => {
    expect(resolveKnownUserRole("unknown_role")).toBeNull();
    expect(resolveKnownUserRole("teacher")).toBeNull();
    expect(resolveKnownUserRole("student")).toBeNull();
  });

  it("يجب أن يرجع null لقيمة null", () => {
    expect(resolveKnownUserRole(null)).toBeNull();
  });

  it("يجب أن يرجع null لقيمة undefined", () => {
    expect(resolveKnownUserRole(undefined)).toBeNull();
  });

  it("يجب أن يعمل بغض النظر عن حالة الأحرف (case insensitive)", () => {
    expect(resolveKnownUserRole("OWNER")).toBe("super_admin");
    expect(resolveKnownUserRole("Manager")).toBe("admin");
    expect(resolveKnownUserRole("EMPLOYEE")).toBe("employee");
  });
});

describe("Roles - normalizePermissions", () => {
  it("يجب أن يرجع الصلاحيات الافتراضية للدور عند تمرير مصفوفة فارغة", () => {
    const result = normalizePermissions([], "admin");
    expect(result).toEqual(buildTemplatePermissions("admin"));
  });

  it("يجب أن يرجع الصلاحيات الافتراضية للدور عند تمرير قيمة غير مصفوفة", () => {
    const result = normalizePermissions(null, "employee");
    expect(result).toEqual(buildTemplatePermissions("employee"));
  });

  it('يجب أن يوسّع ["full_access"] إلى القائمة الكاملة', () => {
    const result = normalizePermissions(["full_access"], "employee");
    // يجب أن يحتوي على full_access ثم باقي الصلاحيات
    expect(result).toContain("full_access");
    expect(result.length).toBe(ALL_PERMISSIONS.length);
    // يحتوي على جميع الصلاحيات
    for (const perm of ALL_PERMISSIONS) {
      expect(result).toContain(perm);
    }
  });

  it("يجب أن يحتفظ بالصلاحيات الصالحة فقط ويتجاهل غير الصالحة", () => {
    const result = normalizePermissions(["view_students", "invalid_perm", "view_payments"], "admin");
    expect(result).toContain("view_students");
    expect(result).toContain("view_payments");
    expect(result).not.toContain("invalid_perm");
  });

  it("يجب أن يزيل الصلاحيات المكررة", () => {
    const result = normalizePermissions(
      ["view_students", "view_students", "view_payments"],
      "admin"
    );
    const countViewStudents = result.filter((p: string) => p === "view_students").length;
    expect(countViewStudents).toBe(1);
  });

  it("يجب أن يرجع الصلاحيات الافتراضية عند تمرير مصفوفة بصلاحيات غير صالحة كلها", () => {
    const result = normalizePermissions(["invalid1", "invalid2"], "admin");
    expect(result).toEqual(buildTemplatePermissions("admin"));
  });
});

describe("Roles - hasPermissionInList", () => {
  it("يجب أن يرجع true عند تطابق دقيق", () => {
    expect(hasPermissionInList(["view_students", "view_payments"], "view_students")).toBe(true);
  });

  it("يجب أن يرجع false عند عدم وجود الصلاحية", () => {
    expect(hasPermissionInList(["view_students"], "delete_students")).toBe(false);
  });

  it('يجب أن يرجع true لأي صلاحية عندما تحتوي القائمة على "full_access"', () => {
    expect(hasPermissionInList(["full_access"], "delete_students")).toBe(true);
    expect(hasPermissionInList(["full_access"], "manage_schools")).toBe(true);
    expect(hasPermissionInList(["full_access"], "view_grade_analytics")).toBe(true);
  });

  it("يجب أن يرجع false عند تمرير مصفوفة فارغة", () => {
    expect(hasPermissionInList([], "view_students")).toBe(false);
  });

  it("يجب أن يرجع false عند تمرير null", () => {
    expect(hasPermissionInList(null, "view_students")).toBe(false);
  });

  it("يجب أن يرجع false عند تمرير undefined", () => {
    expect(hasPermissionInList(undefined, "view_students")).toBe(false);
  });
});

describe("Roles - isRoleAllowedForPath", () => {
  it("يجب أن يسمح لـ super_admin بالوصول إلى /super-admin", () => {
    expect(isRoleAllowedForPath("super_admin", "/super-admin")).toBe(true);
  });

  it("يجب أن يمنع admin من /super-admin", () => {
    expect(isRoleAllowedForPath("admin", "/super-admin")).toBe(false);
  });

  it("يجب أن يسمح للجميع بـ /dashboard", () => {
    expect(isRoleAllowedForPath("super_admin", "/dashboard")).toBe(true);
    expect(isRoleAllowedForPath("admin", "/dashboard")).toBe(true);
    expect(isRoleAllowedForPath("employee", "/dashboard")).toBe(true);
  });

  it("يجب أن يمنع employee من /expenses", () => {
    expect(isRoleAllowedForPath("employee", "/expenses")).toBe(false);
  });

  it("يجب أن يسمح لـ admin و super_admin بـ /teachers", () => {
    expect(isRoleAllowedForPath("admin", "/teachers")).toBe(true);
    expect(isRoleAllowedForPath("super_admin", "/teachers")).toBe(true);
  });

  it("يجب أن يمنع employee من /teachers", () => {
    expect(isRoleAllowedForPath("employee", "/teachers")).toBe(false);
  });

  it("يجب أن يدعم مسارات locale مثل /ar/dashboard", () => {
    expect(isRoleAllowedForPath("admin", "/ar/dashboard")).toBe(true);
    expect(isRoleAllowedForPath("admin", "/en/students")).toBe(true);
  });
});

// ============================================================
// 4. Deep Permissions (lib/perm-check.ts)
// ============================================================

describe("Deep Permissions - checkPermission", () => {
  const mockMap = {
    students: {
      actions: { read: true, create: true, update: false, delete: false },
      fields: { view_phone: true, view_national_id: false },
      special: { export: true },
      data_scope: "all",
    },
    payments: {
      actions: { read: true, create: false },
      fields: {},
      special: {},
      data_scope: "own_class",
    },
  };

  it("يجب أن يرجع true للصلاحية المسموح بها في actions", () => {
    expect(checkPermission(mockMap, "students.read")).toBe(true);
    expect(checkPermission(mockMap, "students.create")).toBe(true);
  });

  it("يجب أن يرجع false للصلاحية الممنوعة في actions", () => {
    expect(checkPermission(mockMap, "students.delete")).toBe(false);
    expect(checkPermission(mockMap, "students.update")).toBe(false);
  });

  it("يجب أن يرجع true للحقل المسموح به في fields", () => {
    expect(checkPermission(mockMap, "students.view_phone")).toBe(true);
  });

  it("يجب أن يرجع false للحقل الممنوع في fields", () => {
    expect(checkPermission(mockMap, "students.view_national_id")).toBe(false);
  });

  it("يجب أن يرجع true للصلاحية المسموح بها في special", () => {
    expect(checkPermission(mockMap, "students.export")).toBe(true);
  });

  it("يجب أن يرجع false عند تمرير map بقيمة null", () => {
    expect(checkPermission(null, "students.read")).toBe(false);
  });

  it("يجب أن يرجع false عند تمرير map بقيمة undefined", () => {
    expect(checkPermission(undefined, "students.read")).toBe(false);
  });

  it("يجب أن يرجع false لصفحة غير موجودة في الـ map", () => {
    expect(checkPermission(mockMap, "grades.read")).toBe(false);
  });

  it("يجب أن يرجع false عند مفتاح بدون نقطة", () => {
    expect(checkPermission(mockMap, "students")).toBe(false);
  });
});

describe("Deep Permissions - canReadPage", () => {
  const mockMap = {
    students: {
      actions: { read: true },
      fields: {},
      special: {},
      data_scope: "all",
    },
    teachers: {
      actions: { read: false },
      fields: {},
      special: {},
      data_scope: null,
    },
  };

  it("يجب أن يرجع true عند وجود read=true", () => {
    expect(canReadPage(mockMap, "students")).toBe(true);
  });

  it("يجب أن يرجع false عند وجود read=false", () => {
    expect(canReadPage(mockMap, "teachers")).toBe(false);
  });

  it("يجب أن يرجع false لصفحة غير موجودة", () => {
    expect(canReadPage(mockMap, "payments")).toBe(false);
  });

  it("يجب أن يرجع false عند تمرير null", () => {
    expect(canReadPage(null, "students")).toBe(false);
  });
});

describe("Deep Permissions - getDataScope", () => {
  const mockMap = {
    students: {
      actions: { read: true },
      fields: {},
      special: {},
      data_scope: "all",
    },
    payments: {
      actions: { read: true },
      fields: {},
      special: {},
      data_scope: "own_class",
    },
    grades: {
      actions: { read: true },
      fields: {},
      special: {},
      data_scope: null,
    },
  };

  it('يجب أن يرجع "all" لـ students', () => {
    expect(getDataScope(mockMap, "students")).toBe("all");
  });

  it('يجب أن يرجع "own_class" لـ payments', () => {
    expect(getDataScope(mockMap, "payments")).toBe("own_class");
  });

  it("يجب أن يرجع null لصفحة بـ data_scope=null", () => {
    expect(getDataScope(mockMap, "grades")).toBeNull();
  });

  it("يجب أن يرجع null لصفحة غير موجودة", () => {
    expect(getDataScope(mockMap, "unknown_page")).toBeNull();
  });

  it("يجب أن يرجع null عند تمرير map بقيمة null", () => {
    expect(getDataScope(null, "students")).toBeNull();
  });

  it("يجب أن يرجع null عند تمرير map بقيمة undefined", () => {
    expect(getDataScope(undefined, "students")).toBeNull();
  });
});

describe("Deep Permissions - filterFields", () => {
  const mockMap = {
    students: {
      actions: { read: true },
      fields: { view_phone: true, view_national_id: false },
      special: {},
      data_scope: "all",
    },
  };

  it("يجب أن يحذف الحقول غير المسموح بها", () => {
    const data = {
      name: "أحمد",
      phone: "07701234567",
      national_id: "12345",
    };

    const fieldMap = {
      phone: "view_phone",
      national_id: "view_national_id",
    };

    const result = filterFields(data, mockMap, "students", fieldMap);

    expect(result.name).toBe("أحمد");
    expect(result.phone).toBe("07701234567");
    expect(result.national_id).toBeUndefined();
  });

  it("يجب أن يحذف جميع الحقول عند تمرير map بقيمة null", () => {
    const data = { name: "أحمد", phone: "07701234567" };
    const fieldMap = { phone: "view_phone" };

    const result = filterFields(data, null, "students", fieldMap);
    expect(result.phone).toBeUndefined();
    expect(result.name).toBe("أحمد");
  });
});
