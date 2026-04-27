import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  createRouteSupabaseClient: vi.fn(),
  resolveWebUserProfileWithStatus: vi.fn(),
  enforceRateLimit: vi.fn(),
  buildAuthRateLimitIdentifier: vi.fn(() => "127.0.0.1:rate-limit-hash"),
  normalizeRateLimitEmail: vi.fn((email: string) => email.trim().toLowerCase()),
  hasRBACSecret: vi.fn(() => true),
  signRBACSession: vi.fn(async () => "signed-cookie"),
  buildRBACSessionPayload: vi.fn((input) => ({
    ...input,
    iat: 1,
    exp: 2,
    version: 1 as const,
  })),
  getRBACCookieOptions: vi.fn(() => ({
    httpOnly: true,
    sameSite: "lax" as const,
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 8,
  })),
  getExpiredRBACCookieOptions: vi.fn(() => ({
    httpOnly: true,
    sameSite: "lax" as const,
    secure: false,
    path: "/",
    maxAge: 0,
  })),
  logRouteError: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: mockState.enforceRateLimit,
  buildAuthRateLimitIdentifier: mockState.buildAuthRateLimitIdentifier,
  normalizeRateLimitEmail: mockState.normalizeRateLimitEmail,
}));

vi.mock("@/lib/rbac-session", () => ({
  RBAC_COOKIE_NAME: "school_rbac",
  buildRBACSessionPayload: mockState.buildRBACSessionPayload,
  getExpiredRBACCookieOptions: mockState.getExpiredRBACCookieOptions,
  getRBACCookieOptions: mockState.getRBACCookieOptions,
  hasRBACSecret: mockState.hasRBACSecret,
  signRBACSession: mockState.signRBACSession,
}));

vi.mock("@/lib/supabase-server", () => ({
  createRouteSupabaseClient: mockState.createRouteSupabaseClient,
}));

vi.mock("@/lib/authorization/snapshot", () => ({
  resolveWebUserProfileWithStatus: mockState.resolveWebUserProfileWithStatus,
}));

vi.mock("@/lib/route-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/route-utils")>("@/lib/route-utils");
  return {
    ...actual,
    logRouteError: mockState.logRouteError,
  };
});

type QueryResult = {
  data: unknown;
  error: unknown;
};

function createQueryBuilder(result: QueryResult) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
  };

  return builder;
}

function createSupabaseClientMock(input: {
  signInResult: QueryResult;
}) {
  return {
    auth: {
      signInWithPassword: vi.fn(async () => input.signInResult),
      signOut: vi.fn(async () => ({ error: null })),
    },
    from: vi.fn(() => createQueryBuilder({ data: null, error: null })),
  };
}

function createLoginRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function importRoute() {
  return import("@/app/api/auth/login/route");
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockState.enforceRateLimit.mockReturnValue(null);
    mockState.buildAuthRateLimitIdentifier.mockReturnValue("127.0.0.1:rate-limit-hash");
    mockState.normalizeRateLimitEmail.mockImplementation((email: string) => email.trim().toLowerCase());
    mockState.hasRBACSecret.mockReturnValue(true);
    mockState.signRBACSession.mockResolvedValue("signed-cookie");
    mockState.resolveWebUserProfileWithStatus.mockResolvedValue({
      status: "profile_missing",
    });
  });

  it("rejects invalid payloads before hitting Supabase", async () => {
    const { POST } = await importRoute();

    const response = await POST(
      createLoginRequest({
        email: "invalid-email",
        password: "123",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.fieldErrors.email).toBeTruthy();
    expect(payload.error.fieldErrors.password).toBeTruthy();
    expect(mockState.createRouteSupabaseClient).not.toHaveBeenCalled();
  });

  it("returns the rate-limit response when too many attempts are made", async () => {
    mockState.enforceRateLimit.mockReturnValue(
      NextResponse.json(
        {
          error: "too_many_attempts",
          message: "محاولات كثيرة، حاول لاحقاً",
        },
        { status: 429 },
      ),
    );

    const { POST } = await importRoute();
    const response = await POST(
      createLoginRequest({
        email: "User@example.com",
        password: "12345678",
      }),
    );

    expect(response.status).toBe(429);
    expect(mockState.createRouteSupabaseClient).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "too_many_attempts",
      message: "محاولات كثيرة، حاول لاحقاً",
    });
  });

  it("clears the RBAC cookie for inactive accounts", async () => {
    const supabase = createSupabaseClientMock({
      signInResult: {
        data: {
          user: {
            id: "auth-user-1",
            user_metadata: {},
          },
        },
        error: null,
      },
    });
    mockState.resolveWebUserProfileWithStatus.mockResolvedValue({
      status: "resolved",
      profile: {
        id: "auth-user-1",
        full_name: "Inactive Admin",
        email: "inactive@example.com",
        role: "admin",
        is_active: false,
        school_id: "11111111-1111-4111-8111-111111111111",
        custom_permissions: [],
        permissions: [],
        phone: null,
        school: null,
        subscription: null,
        branch_id: null,
        allowed_branch_ids: [],
        allowed_pages: ["dashboard"],
        is_single_page_user: false,
        default_path: "/dashboard",
        scope_level: "group_admin",
        permissions_version: 1,
      },
      snapshot: {
        userId: "auth-user-1",
        role: "admin",
        roleCodes: ["admin"],
        permissions: [],
        schoolId: "11111111-1111-4111-8111-111111111111",
        branchId: null,
        allowedBranchIds: [],
        scopeLevel: "group_admin",
        allowedPages: ["dashboard"],
        allowedModule: "dashboard",
        allowedModules: ["dashboard"],
        isSinglePageUser: false,
        defaultPath: "/dashboard",
        userActive: false,
        hierarchyLevel: null,
        permissionsVersion: 1,
        groupId: null,
        schoolActive: true,
        subscriptionStatus: null,
        subscriptionEnd: null,
      },
    });
    mockState.createRouteSupabaseClient.mockResolvedValue(supabase);

    const { POST } = await importRoute();
    const response = await POST(
      createLoginRequest({
        email: "inactive@example.com",
        password: "12345678",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe("login_failed");
    expect(payload.code).toBe("AUTH_LOGIN_PROFILE_INACTIVE");
    expect(payload.reason).toBe("inactive_account");
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(response.headers.get("set-cookie")).toContain("school_rbac=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("returns the normalized profile and signed RBAC cookie on success", async () => {
    const schoolId = "11111111-1111-4111-8111-111111111111";
    const supabase = createSupabaseClientMock({
      signInResult: {
        data: {
          user: {
            id: "auth-user-1",
            user_metadata: {
              avatar_url: "https://cdn.example.com/avatar.png",
            },
          },
        },
        error: null,
      },
    });
    mockState.resolveWebUserProfileWithStatus.mockResolvedValue({
      status: "resolved",
      profile: {
        id: "auth-user-1",
        full_name: "Test Admin",
        email: "user@example.com",
        role: "admin",
        is_active: true,
        school_id: schoolId,
        custom_permissions: ["view_students"],
        permissions: ["view_students"],
        phone: "123456",
        school: {
          id: schoolId,
          name: "Alpha School",
          is_active: true,
        },
        subscription: {
          id: "sub-1",
          school_id: schoolId,
          status: "active",
          end_date: "2026-12-31",
        },
        branch_id: null,
        allowed_branch_ids: [],
        allowed_pages: ["dashboard"],
        is_single_page_user: false,
        default_path: "/dashboard",
        scope_level: "group_admin",
        permissions_version: 1,
      },
      snapshot: {
        userId: "auth-user-1",
        role: "admin",
        roleCodes: ["admin"],
        permissions: ["view_students"],
        schoolId,
        branchId: null,
        allowedBranchIds: [],
        scopeLevel: "group_admin",
        allowedPages: ["dashboard"],
        allowedModule: "dashboard",
        allowedModules: ["dashboard"],
        isSinglePageUser: false,
        defaultPath: "/dashboard",
        userActive: true,
        hierarchyLevel: null,
        permissionsVersion: 1,
        groupId: null,
        schoolActive: true,
        subscriptionStatus: "active",
        subscriptionEnd: "2026-12-31",
      },
    });
    mockState.createRouteSupabaseClient.mockResolvedValue(supabase);

    const { POST } = await importRoute();
    const response = await POST(
      createLoginRequest({
        email: "User@example.com",
        password: "12345678",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.profile).toMatchObject({
      id: "auth-user-1",
      email: "user@example.com",
      role: "admin",
      school_id: schoolId,
    });
    expect(payload.profile.school).toMatchObject({
      id: schoolId,
      name: "Alpha School",
    });
    expect(payload.profile.subscription).toMatchObject({
      status: "active",
    });
    expect(response.headers.get("set-cookie")).toContain("school_rbac=signed-cookie");
    expect(mockState.enforceRateLimit).toHaveBeenCalledWith(
      expect.any(NextRequest),
      {
        namespace: "auth-login",
        windowMs: 10 * 60_000,
        maxHits: 5,
        identifier: "127.0.0.1:rate-limit-hash",
        productionFailureMode: "memory-fallback",
        onRateLimited: {
          error: "too_many_attempts",
          message: "محاولات كثيرة، حاول لاحقاً",
        },
      },
    );
    expect(mockState.normalizeRateLimitEmail).toHaveBeenCalledWith("user@example.com");
    expect(mockState.buildAuthRateLimitIdentifier).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "user@example.com",
    );
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "12345678",
    });
    expect(mockState.signRBACSession).toHaveBeenCalledTimes(1);
  });

  it("returns 401 for invalid credentials without throwing 500", async () => {
    const supabase = createSupabaseClientMock({
      signInResult: {
        data: {
          user: null,
        },
        error: new Error("Invalid login credentials"),
      },
    });
    mockState.createRouteSupabaseClient.mockResolvedValue(supabase);

    const { POST } = await importRoute();
    const response = await POST(
      createLoginRequest({
        email: "user@example.com",
        password: "wrong-password",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      ok: false,
      error: "login_failed",
      code: "AUTH_LOGIN_INVALID_CREDENTIALS",
      reason: "invalid_credentials",
    });
    expect(JSON.stringify(payload)).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("returns 403 when the authenticated user has no web profile", async () => {
    const supabase = createSupabaseClientMock({
      signInResult: {
        data: {
          user: {
            id: "auth-user-2",
            user_metadata: {},
          },
        },
        error: null,
      },
    });
    mockState.createRouteSupabaseClient.mockResolvedValue(supabase);
    mockState.resolveWebUserProfileWithStatus.mockResolvedValue({
      status: "profile_missing",
    });

    const { POST } = await importRoute();
    const response = await POST(
      createLoginRequest({
        email: "user@example.com",
        password: "12345678",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      ok: false,
      error: "login_failed",
      code: "AUTH_LOGIN_PROFILE_MISSING",
      reason: "profile_missing",
    });
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("returns 403 when the authenticated user role is unknown", async () => {
    const supabase = createSupabaseClientMock({
      signInResult: {
        data: {
          user: {
            id: "auth-user-3",
            user_metadata: {},
          },
        },
        error: null,
      },
    });
    mockState.createRouteSupabaseClient.mockResolvedValue(supabase);
    mockState.resolveWebUserProfileWithStatus.mockResolvedValue({
      status: "unknown_role",
      role: "teacher",
    });

    const { POST } = await importRoute();
    const response = await POST(
      createLoginRequest({
        email: "user@example.com",
        password: "12345678",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      ok: false,
      error: "login_failed",
      code: "AUTH_LOGIN_UNKNOWN_ROLE",
      reason: "unknown_role",
    });
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("fails safely when RBAC session configuration is missing", async () => {
    mockState.hasRBACSecret.mockReturnValue(false);

    const { POST } = await importRoute();
    const response = await POST(
      createLoginRequest({
        email: "user@example.com",
        password: "12345678",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: "login_failed",
      code: "AUTH_LOGIN_SERVER_CONFIG",
      reason: "server_config",
    });
    expect(mockState.createRouteSupabaseClient).not.toHaveBeenCalled();
  });
});
