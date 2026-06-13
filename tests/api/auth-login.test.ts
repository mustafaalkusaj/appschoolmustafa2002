/**
 * Integration tests for POST /api/auth/login
 *
 * Covers: schema validation (400), wrong credentials (401),
 * inactive account (403), missing profile (403), RBAC config error (500),
 * and the happy-path 200 with signed cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock state — must be declared before any vi.mock() calls
// ---------------------------------------------------------------------------
const mockState = vi.hoisted(() => ({
  createRouteSupabaseClient: vi.fn(),
  resolveWebUserProfileWithStatus: vi.fn(),
  enforceRateLimit: vi.fn(),
  buildAuthRateLimitIdentifier: vi.fn(() => "127.0.0.1:test-hash"),
  normalizeRateLimitEmail: vi.fn((email: string) => email.trim().toLowerCase()),
  hasRBACSecret: vi.fn(() => true),
  signRBACSession: vi.fn(async () => "mock-signed-cookie"),
  buildRBACSessionPayload: vi.fn((input) => ({
    ...input,
    iat: 1000,
    exp: 29800,
    version: 2 as const,
  })),
  getRBACCookieOptions: vi.fn(() => ({
    httpOnly: true,
    sameSite: "lax" as const,
    secure: false,
    path: "/",
    maxAge: 28800,
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

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
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
  return { ...actual, logRouteError: mockState.logRouteError };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeSupabase(signInResult: { data: unknown; error: unknown }) {
  return {
    auth: {
      signInWithPassword: vi.fn(async () => signInResult),
      signOut: vi.fn(async () => ({ error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    })),
  };
}

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_SCHOOL_ID = "11111111-1111-4111-8111-111111111111";

const RESOLVED_ACTIVE_PROFILE = {
  status: "resolved",
  profile: {
    id: "user-uuid-1",
    full_name: "Test Admin",
    email: "admin@school.com",
    role: "admin",
    is_active: true,
    school_id: VALID_SCHOOL_ID,
    custom_permissions: [],
    permissions: [],
    phone: null,
    school: { id: VALID_SCHOOL_ID, name: "Test School", is_active: true },
    subscription: { id: "sub-1", school_id: VALID_SCHOOL_ID, status: "active", end_date: "2027-01-01" },
    branch_id: null,
    allowed_branch_ids: [],
    allowed_pages: ["dashboard"],
    is_single_page_user: false,
    default_path: "/dashboard",
    scope_level: "group_admin",
    permissions_version: 1,
  },
  snapshot: {
    userId: "user-uuid-1",
    role: "admin",
    permissions: [],
    schoolId: VALID_SCHOOL_ID,
    branchId: null,
    allowedBranchIds: [],
    scopeLevel: "group_admin" as const,
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
    subscriptionEnd: "2027-01-01",
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Safe defaults
    mockState.enforceRateLimit.mockReturnValue(null);
    mockState.hasRBACSecret.mockReturnValue(true);
    mockState.signRBACSession.mockResolvedValue("mock-signed-cookie");
    mockState.buildAuthRateLimitIdentifier.mockReturnValue("127.0.0.1:test-hash");
    mockState.normalizeRateLimitEmail.mockImplementation((e: string) => e.trim().toLowerCase());
    mockState.resolveWebUserProfileWithStatus.mockResolvedValue({ status: "profile_missing" });
  });

  // ── Schema validation (400) ─────────────────────────────────────────────

  it("returns 400 for invalid email format", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeRequest({ email: "not-an-email", password: "password123" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.fieldErrors?.email).toBeTruthy();
    expect(mockState.createRouteSupabaseClient).not.toHaveBeenCalled();
  });

  it("returns 400 for password shorter than 8 characters", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeRequest({ email: "user@example.com", password: "short" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.fieldErrors?.password).toBeTruthy();
    expect(mockState.createRouteSupabaseClient).not.toHaveBeenCalled();
  });

  it("returns 400 when both email and password are invalid", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeRequest({ email: "bad", password: "123" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.fieldErrors?.email).toBeTruthy();
    expect(body.error.fieldErrors?.password).toBeTruthy();
  });

  it("returns 400 for completely empty body", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
  });

  // ── Wrong credentials (401) ─────────────────────────────────────────────

  it("returns 401 when Supabase returns a sign-in error", async () => {
    const supabase = makeSupabase({
      data: { user: null },
      error: new Error("Invalid login credentials"),
    });
    mockState.createRouteSupabaseClient.mockResolvedValue(supabase);

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeRequest({ email: "wrong@example.com", password: "wrongpass1" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toMatchObject({
      ok: false,
      error: "login_failed",
      code: "AUTH_LOGIN_INVALID_CREDENTIALS",
      reason: "invalid_credentials",
    });
  });

  it("returns 401 when Supabase returns no user despite no error", async () => {
    const supabase = makeSupabase({ data: { user: null }, error: null });
    mockState.createRouteSupabaseClient.mockResolvedValue(supabase);

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeRequest({ email: "ghost@example.com", password: "password99" }));

    expect(res.status).toBe(401);
  });

  // ── Inactive account (403) ──────────────────────────────────────────────

  it("returns 403 and sets Max-Age=0 cookie for inactive account", async () => {
    const supabase = makeSupabase({
      data: { user: { id: "user-uuid-inactive", user_metadata: {} } },
      error: null,
    });
    mockState.createRouteSupabaseClient.mockResolvedValue(supabase);
    mockState.resolveWebUserProfileWithStatus.mockResolvedValue({
      ...RESOLVED_ACTIVE_PROFILE,
      profile: { ...RESOLVED_ACTIVE_PROFILE.profile, is_active: false },
      snapshot: { ...RESOLVED_ACTIVE_PROFILE.snapshot, userActive: false },
    });

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeRequest({ email: "inactive@example.com", password: "password99" }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toMatchObject({
      ok: false,
      error: "login_failed",
      code: "AUTH_LOGIN_PROFILE_INACTIVE",
      reason: "inactive_account",
    });
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  // ── Missing profile (403) ────────────────────────────────────────────────

  it("returns 403 when profile lookup resolves as profile_missing", async () => {
    const supabase = makeSupabase({
      data: { user: { id: "user-no-profile", user_metadata: {} } },
      error: null,
    });
    mockState.createRouteSupabaseClient.mockResolvedValue(supabase);
    mockState.resolveWebUserProfileWithStatus.mockResolvedValue({ status: "profile_missing" });

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeRequest({ email: "noprofile@example.com", password: "password99" }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toMatchObject({
      ok: false,
      error: "login_failed",
      code: "AUTH_LOGIN_PROFILE_MISSING",
      reason: "profile_missing",
    });
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  // ── Server config error (500) ────────────────────────────────────────────

  it("returns 500 when RBAC secret is unavailable", async () => {
    mockState.hasRBACSecret.mockReturnValue(false);

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeRequest({ email: "admin@example.com", password: "password99" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toMatchObject({
      ok: false,
      error: "login_failed",
      code: "AUTH_LOGIN_SERVER_CONFIG",
      reason: "server_config",
    });
    // Must not attempt Supabase at all
    expect(mockState.createRouteSupabaseClient).not.toHaveBeenCalled();
  });

  // ── Happy path (200) ─────────────────────────────────────────────────────

  it("returns 200 with profile and RBAC cookie on successful login", async () => {
    const supabase = makeSupabase({
      data: {
        user: {
          id: "user-uuid-1",
          user_metadata: { avatar_url: "https://cdn.example.com/avatar.jpg" },
        },
      },
      error: null,
    });
    mockState.createRouteSupabaseClient.mockResolvedValue(supabase);
    mockState.resolveWebUserProfileWithStatus.mockResolvedValue(RESOLVED_ACTIVE_PROFILE);

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeRequest({ email: "Admin@School.com", password: "securepass1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.profile).toMatchObject({
      id: "user-uuid-1",
      email: "admin@school.com",
      role: "admin",
      school_id: VALID_SCHOOL_ID,
    });
    // Cookie must contain the signed token
    expect(res.headers.get("set-cookie")).toContain("school_rbac=mock-signed-cookie");
    // Emails are normalized to lowercase before being passed to Supabase
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({ email: "admin@school.com" }),
    );
  });

  // ── Rate limiting (429) ──────────────────────────────────────────────────

  it("returns 429 when rate limit is exceeded", async () => {
    mockState.enforceRateLimit.mockReturnValue(
      NextResponse.json({ error: "too_many_attempts", message: "محاولات كثيرة، حاول لاحقاً" }, { status: 429 }),
    );

    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeRequest({ email: "user@example.com", password: "password99" }));

    expect(res.status).toBe(429);
    expect(mockState.createRouteSupabaseClient).not.toHaveBeenCalled();
  });

  // ── Cache headers ─────────────────────────────────────────────────────────

  it("always sets Cache-Control: no-store on error responses", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(makeRequest({ email: "bad", password: "x" }));

    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
