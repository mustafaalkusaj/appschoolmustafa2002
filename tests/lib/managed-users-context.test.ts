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
});
