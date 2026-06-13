import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const cookiesMock = vi.fn();
const verifyRBACSessionMock = vi.fn();
const createRouteSupabaseClientMock = vi.fn();
const getRouteAuthenticatedUserMock = vi.fn();
const resolveWebUserProfileMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/rbac-session", () => ({
  RBAC_COOKIE_NAME: "rbac-session",
  verifyRBACSession: verifyRBACSessionMock,
}));

vi.mock("@/lib/supabase-server", () => ({
  createRouteSupabaseClient: createRouteSupabaseClientMock,
  getRouteAuthenticatedUser: getRouteAuthenticatedUserMock,
}));

vi.mock("@/lib/authorization/snapshot", () => ({
  resolveWebUserProfile: resolveWebUserProfileMock,
}));

describe("resolveSchoolScopedActorContext", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    cookiesMock.mockResolvedValue({
      get: (name: string) => (name === "rbac-session" ? { value: "signed-rbac-token" } : undefined),
    });
    createRouteSupabaseClientMock.mockResolvedValue({});
    getRouteAuthenticatedUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  it("keeps using the RBAC cookie even when Authorization is present", async () => {
    verifyRBACSessionMock.mockResolvedValue({
      userId: "user-1",
      role: "admin",
      schoolId: "11111111-1111-1111-1111-111111111111",
      branchId: "22222222-2222-2222-2222-222222222222",
      allowedBranchIds: ["22222222-2222-2222-2222-222222222222"],
      userActive: true,
      schoolActive: true,
      subscriptionStatus: "active",
      subscriptionEnd: "2027-12-31",
      scopeLevel: "group_admin",
      isSinglePageUser: false,
      permissionsVersion: 7,
    });

    const { resolveSchoolScopedActorContext } = await import("@/lib/managed-users/context");
    const result = await resolveSchoolScopedActorContext(
      "11111111-1111-1111-1111-111111111111",
      {
        allowedRoles: ["admin"],
        roleDeniedMessage: "denied",
      },
      "Bearer access-token",
    );

    expect(verifyRBACSessionMock).toHaveBeenCalledWith("signed-rbac-token");
    expect(resolveWebUserProfileMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: true,
      value: {
        actorUserId: "user-1",
        actorRole: "admin",
        targetSchoolId: "11111111-1111-1111-1111-111111111111",
        actorBranchId: "22222222-2222-2222-2222-222222222222",
        permissionsVersion: 7,
      },
    });
  });

  it("falls back to resolveWebUserProfile when the cookie belongs to another user", async () => {
    verifyRBACSessionMock.mockResolvedValue({
      userId: "other-user",
      role: "admin",
      schoolId: "11111111-1111-1111-1111-111111111111",
      userActive: true,
      schoolActive: true,
      subscriptionStatus: "active",
      subscriptionEnd: "2027-12-31",
    });

    resolveWebUserProfileMock.mockResolvedValue({
      profile: { id: "user-1" },
      snapshot: {
        userId: "user-1",
        role: "admin",
        roleCodes: ["admin"],
        permissions: [],
        schoolId: "11111111-1111-1111-1111-111111111111",
        branchId: null,
        allowedBranchIds: [],
        scopeLevel: "group_admin",
        allowedPages: [],
        allowedModule: null,
        allowedModules: [],
        isSinglePageUser: false,
        defaultPath: "/dashboard",
        userActive: true,
        hierarchyLevel: null,
        permissionsVersion: 3,
        groupId: null,
        schoolActive: true,
        subscriptionStatus: "active",
        subscriptionEnd: "2027-12-31",
      },
    });

    const { resolveSchoolScopedActorContext } = await import("@/lib/managed-users/context");
    const result = await resolveSchoolScopedActorContext(
      "11111111-1111-1111-1111-111111111111",
      {
        allowedRoles: ["admin"],
        roleDeniedMessage: "denied",
      },
      "Bearer access-token",
    );

    expect(resolveWebUserProfileMock).toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: true,
      value: {
        actorUserId: "user-1",
        actorRole: "admin",
        targetSchoolId: "11111111-1111-1111-1111-111111111111",
        permissionsVersion: 3,
      },
    });
  });

  it("rejects admin user attempting to access different school", async () => {
    verifyRBACSessionMock.mockResolvedValue({
      userId: "user-1",
      role: "admin",
      schoolId: "11111111-1111-1111-1111-111111111111", // User's school
      branchId: null,
      allowedBranchIds: [],
      userActive: true,
      schoolActive: true,
      subscriptionStatus: "active",
      subscriptionEnd: "2027-12-31",
      scopeLevel: "group_admin",
      isSinglePageUser: false,
      permissionsVersion: 1,
    });

    const { resolveSchoolScopedActorContext } = await import("@/lib/managed-users/context");
    const result = await resolveSchoolScopedActorContext(
      "99999999-9999-9999-9999-999999999999", // Different school
      {
        allowedRoles: ["admin"],
        roleDeniedMessage: "denied",
      },
    );

    expect(result).toMatchObject({
      ok: false,
      status: 403,
      message: expect.stringContaining("خارج مدرسة حسابك"), // Cross-school message
    });
  });

  it("allows admin to access own school when explicitly passed", async () => {
    verifyRBACSessionMock.mockResolvedValue({
      userId: "user-1",
      role: "admin",
      schoolId: "11111111-1111-1111-1111-111111111111",
      branchId: null,
      allowedBranchIds: ["22222222-2222-2222-2222-222222222222"],
      userActive: true,
      schoolActive: true,
      subscriptionStatus: "active",
      subscriptionEnd: "2027-12-31",
      scopeLevel: "group_admin",
      isSinglePageUser: false,
      permissionsVersion: 1,
    });

    const { resolveSchoolScopedActorContext } = await import("@/lib/managed-users/context");
    const result = await resolveSchoolScopedActorContext(
      "11111111-1111-1111-1111-111111111111", // Same school
      {
        allowedRoles: ["admin"],
        roleDeniedMessage: "denied",
      },
    );

    expect(result).toMatchObject({
      ok: true,
      value: {
        targetSchoolId: "11111111-1111-1111-1111-111111111111",
        actorRole: "admin",
      },
    });
  });

  it("rejects request when user school is inactive", async () => {
    verifyRBACSessionMock.mockResolvedValue({
      userId: "user-1",
      role: "admin",
      schoolId: "11111111-1111-1111-1111-111111111111",
      branchId: null,
      allowedBranchIds: [],
      userActive: true,
      schoolActive: false, // School inactive
      subscriptionStatus: "active",
      subscriptionEnd: "2027-12-31",
      scopeLevel: "group_admin",
      isSinglePageUser: false,
      permissionsVersion: 1,
    });

    const { resolveSchoolScopedActorContext } = await import("@/lib/managed-users/context");
    const result = await resolveSchoolScopedActorContext(
      "11111111-1111-1111-1111-111111111111",
      {
        allowedRoles: ["admin"],
        roleDeniedMessage: "denied",
      },
    );

    expect(result).toMatchObject({
      ok: false,
      status: 403,
      message: expect.stringContaining("غير مفعلة"),
    });
  });
});

describe("resolveSchoolScopedActorContext — branch coverage", () => {
  const rbac = (over: Record<string, unknown> = {}) => ({
    userId: "user-1", role: "admin", schoolId: "s1", branchId: "b1", allowedBranchIds: ["b1"],
    userActive: true, schoolActive: true, subscriptionStatus: "active", subscriptionEnd: "2027-12-31",
    scopeLevel: "branch_user", isSinglePageUser: false, permissionsVersion: 1, ...over,
  });
  const OPT = { allowedRoles: ["admin", "super_admin"] as never, roleDeniedMessage: "denied" };
  const call = async (school: string | null, opt = OPT) => {
    const { resolveSchoolScopedActorContext } = await import("@/lib/managed-users/context");
    return resolveSchoolScopedActorContext(school, opt as never);
  };
  beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks();
    cookiesMock.mockResolvedValue({ get: (n: string) => (n === "rbac-session" ? { value: "tok" } : undefined) });
    createRouteSupabaseClientMock.mockResolvedValue({});
    getRouteAuthenticatedUserMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    verifyRBACSessionMock.mockResolvedValue(rbac());
  });

  it("401 when unauthenticated", async () => {
    getRouteAuthenticatedUserMock.mockResolvedValue({ data: { user: null }, error: null });
    expect(await call("s1")).toMatchObject({ ok: false, status: 401 });
  });
  it("403 when rbac role unknown", async () => {
    verifyRBACSessionMock.mockResolvedValue(rbac({ role: "unknown_xyz" }));
    expect(await call("s1")).toMatchObject({ ok: false, status: 403 });
  });
  it("403 when role not allowed", async () => {
    verifyRBACSessionMock.mockResolvedValue(rbac({ role: "employee" }));
    expect(await call("s1", { allowedRoles: ["super_admin"] as never, roleDeniedMessage: "no" })).toMatchObject({ ok: false, status: 403, message: "no" });
  });
  it("403 when user inactive", async () => {
    verifyRBACSessionMock.mockResolvedValue(rbac({ userActive: false }));
    expect(await call("s1")).toMatchObject({ ok: false, status: 403 });
  });
  it("403 when non-super admin has no school", async () => {
    verifyRBACSessionMock.mockResolvedValue(rbac({ schoolId: null }));
    expect(await call(null)).toMatchObject({ ok: false, status: 403 });
  });
  it("400 when super_admin supplies no school", async () => {
    verifyRBACSessionMock.mockResolvedValue(rbac({ role: "super_admin", schoolId: null }));
    expect(await call(null)).toMatchObject({ ok: false, status: 400 });
  });
  it("403 when subscription suspended", async () => {
    verifyRBACSessionMock.mockResolvedValue(rbac({ subscriptionStatus: "suspended" }));
    expect(await call("s1")).toMatchObject({ ok: false, status: 403 });
  });
  it("403 when subscription expired by date", async () => {
    verifyRBACSessionMock.mockResolvedValue(rbac({ subscriptionStatus: "active", subscriptionEnd: "2000-01-01" }));
    expect(await call("s1")).toMatchObject({ ok: false, status: 403 });
  });
  it("ok for super_admin targeting another school", async () => {
    verifyRBACSessionMock.mockResolvedValue(rbac({ role: "super_admin" }));
    const r = await call("OTHER");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.targetSchoolId).toBe("OTHER");
  });

  it("profile path: 403 when no profile", async () => {
    verifyRBACSessionMock.mockResolvedValue(null);
    resolveWebUserProfileMock.mockResolvedValue(null);
    expect(await call("s1")).toMatchObject({ ok: false, status: 403 });
  });
  it("profile path: 403 when role not allowed", async () => {
    verifyRBACSessionMock.mockResolvedValue(null);
    resolveWebUserProfileMock.mockResolvedValue({ snapshot: { role: "employee", userActive: true } });
    expect(await call("s1", { allowedRoles: ["super_admin"] as never, roleDeniedMessage: "x" })).toMatchObject({ ok: false, status: 403 });
  });
  const profSnap = (over: Record<string, unknown> = {}) => ({
    snapshot: { role: "admin", userActive: true, schoolId: "s1", schoolActive: true, subscriptionStatus: "active",
      subscriptionEnd: "2027-12-31", branchId: "b1", allowedBranchIds: ["b1"], scopeLevel: "branch_user",
      isSinglePageUser: false, permissionsVersion: 5, ...over },
  });
  it("profile path: 403 when non-super has no school", async () => {
    verifyRBACSessionMock.mockResolvedValue(null);
    resolveWebUserProfileMock.mockResolvedValue(profSnap({ schoolId: null }));
    expect(await call(null)).toMatchObject({ ok: false, status: 403 });
  });
  it("profile path: 403 when school inactive", async () => {
    verifyRBACSessionMock.mockResolvedValue(null);
    resolveWebUserProfileMock.mockResolvedValue(profSnap({ schoolActive: false }));
    expect(await call("s1")).toMatchObject({ ok: false, status: 403 });
  });
  it("profile path: 403 when subscription expired", async () => {
    verifyRBACSessionMock.mockResolvedValue(null);
    resolveWebUserProfileMock.mockResolvedValue(profSnap({ subscriptionStatus: "expired" }));
    expect(await call("s1")).toMatchObject({ ok: false, status: 403 });
  });
  it("profile path: ok success with version", async () => {
    verifyRBACSessionMock.mockResolvedValue(null);
    resolveWebUserProfileMock.mockResolvedValue(profSnap());
    const r = await call("s1");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.permissionsVersion).toBe(5);
  });
});

describe("resolveManagedUsersActorContext", () => {
  beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks();
    cookiesMock.mockResolvedValue({ get: (n: string) => (n === "rbac-session" ? { value: "tok" } : undefined) });
    createRouteSupabaseClientMock.mockResolvedValue({});
    getRouteAuthenticatedUserMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });
  it("maps auth error through", async () => {
    getRouteAuthenticatedUserMock.mockResolvedValue({ data: { user: null }, error: null });
    const { resolveManagedUsersActorContext } = await import("@/lib/managed-users/context");
    expect(await resolveManagedUsersActorContext("s1")).toMatchObject({ ok: false, status: 401 });
  });
  it("returns managed context on success", async () => {
    verifyRBACSessionMock.mockResolvedValue({
      userId: "user-1", role: "admin", schoolId: "s1", branchId: "b1", allowedBranchIds: ["b1"],
      userActive: true, schoolActive: true, subscriptionStatus: "active", subscriptionEnd: "2027-12-31",
      scopeLevel: "branch_user", isSinglePageUser: false, permissionsVersion: 1,
    });
    const { resolveManagedUsersActorContext } = await import("@/lib/managed-users/context");
    const r = await resolveManagedUsersActorContext(null);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toMatchObject({ actorUserId: "user-1", actorRole: "admin", targetSchoolId: "s1" });
  });
});
