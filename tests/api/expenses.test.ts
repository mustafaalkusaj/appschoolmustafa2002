/**
 * Integration tests for GET and POST /api/web/expenses
 *
 * Covers: missing session (401), missing/invalid schoolId (400),
 * permission denied (403), validation errors on POST (400),
 * and the happy-path responses.
 */
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock state
// ---------------------------------------------------------------------------
const mockState = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  resolveSchoolScopedActorContext: vi.fn(),
  resolveBranchScope: vi.fn(),
  resolveBranchIdForWrite: vi.fn(),
  resolveExpensesPage: vi.fn(),
  invalidateExpenseRelatedCaches: vi.fn(),
  routeUserHasPermission: vi.fn(),
  logRouteError: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: mockState.enforceRateLimit,
}));

vi.mock("@/lib/managed-users-server", () => ({
  resolveSchoolScopedActorContext: mockState.resolveSchoolScopedActorContext,
}));

vi.mock("@/lib/branch-scope", () => ({
  resolveBranchScope: mockState.resolveBranchScope,
  resolveBranchIdForWrite: mockState.resolveBranchIdForWrite,
}));

vi.mock("@/lib/expenses-server", () => ({
  resolveExpensesPage: mockState.resolveExpensesPage,
  invalidateExpenseRelatedCaches: mockState.invalidateExpenseRelatedCaches,
}));

vi.mock("@/lib/route-permissions", () => ({
  routeUserHasPermission: mockState.routeUserHasPermission,
}));

vi.mock("@/lib/cache-strategies", () => ({
  getCacheHeaders: vi.fn(() => ({})),
  CACHE_STRATEGIES: { EXPENSES_LIST: "expenses-list" },
}));

vi.mock("@/lib/route-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/route-utils")>("@/lib/route-utils");
  return { ...actual, logRouteError: mockState.logRouteError };
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const VALID_SCHOOL_ID = "22222222-2222-4222-8222-222222222222";
const VALID_EXPENSE_TYPE_ID = "33333333-3333-4333-8333-333333333333";

const ACTOR_CONTEXT_OK = {
  ok: true as const,
  value: {
    actorSupabase: {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn(async () => ({ data: null, error: null })),
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      })),
    },
    actorUserId: "actor-user-1",
    actorRole: "admin" as const,
    targetSchoolId: VALID_SCHOOL_ID,
    actorBranchId: null,
    allowedBranchIds: [],
  },
};

const BRANCH_SCOPE_OK = {
  ok: true as const,
  value: { branchId: null, branchIds: [], cacheKeySuffix: "all" },
};

// ---------------------------------------------------------------------------
// GET /api/web/expenses
// ---------------------------------------------------------------------------
describe("GET /api/web/expenses", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockState.enforceRateLimit.mockReturnValue(null);
    mockState.resolveSchoolScopedActorContext.mockResolvedValue(ACTOR_CONTEXT_OK);
    mockState.resolveBranchScope.mockReturnValue(BRANCH_SCOPE_OK);
    mockState.routeUserHasPermission.mockResolvedValue(true);
    mockState.resolveExpensesPage.mockResolvedValue({
      rows: [],
      summary: {
        schoolTotalCount: 0,
        schoolTotalAmount: 0,
        schoolTodayAmount: 0,
        filteredTotalCount: 0,
        filteredTotalAmount: 0,
      },
      page: 1,
      pageSize: 20,
      totalCount: 0,
      totalPages: 0,
    });
  });

  // ── Missing session (401) ────────────────────────────────────────────────

  it("returns 401 when there is no valid session", async () => {
    mockState.resolveSchoolScopedActorContext.mockResolvedValue({
      ok: false,
      status: 401,
      message: "يجب تسجيل الدخول أولاً.",
    });

    const { GET } = await import("@/app/api/web/expenses/route");
    const req = new NextRequest(
      `http://localhost/api/web/expenses?schoolId=${VALID_SCHOOL_ID}`,
    );
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  // ── Missing / invalid schoolId (400) ────────────────────────────────────

  it("returns 400 when schoolId query param is missing", async () => {
    const { GET } = await import("@/app/api/web/expenses/route");
    const req = new NextRequest("http://localhost/api/web/expenses");
    const res = await GET(req);

    expect(res.status).toBe(400);
    // resolveSchoolScopedActorContext must not have been called
    expect(mockState.resolveSchoolScopedActorContext).not.toHaveBeenCalled();
  });

  it("returns 400 when schoolId is not a valid UUID", async () => {
    const { GET } = await import("@/app/api/web/expenses/route");
    const req = new NextRequest("http://localhost/api/web/expenses?schoolId=not-a-uuid");
    const res = await GET(req);

    expect(res.status).toBe(400);
    expect(mockState.resolveSchoolScopedActorContext).not.toHaveBeenCalled();
  });

  // ── Permission denied (403) ──────────────────────────────────────────────

  it("returns 403 when actor lacks view_expenses permission", async () => {
    mockState.routeUserHasPermission.mockResolvedValue(false);

    const { GET } = await import("@/app/api/web/expenses/route");
    const req = new NextRequest(
      `http://localhost/api/web/expenses?schoolId=${VALID_SCHOOL_ID}`,
    );
    const res = await GET(req);

    expect(res.status).toBe(403);
  });

  // ── Rate limited (429) ───────────────────────────────────────────────────

  it("returns 429 when rate limit is exceeded", async () => {
    mockState.enforceRateLimit.mockReturnValue(
      NextResponse.json({ error: "rate_limited" }, { status: 429 }),
    );

    const { GET } = await import("@/app/api/web/expenses/route");
    const req = new NextRequest(
      `http://localhost/api/web/expenses?schoolId=${VALID_SCHOOL_ID}`,
    );
    const res = await GET(req);

    expect(res.status).toBe(429);
  });

  // ── Happy path (200) ─────────────────────────────────────────────────────

  it("returns 200 with paginated data for an authorized actor", async () => {
    mockState.resolveExpensesPage.mockResolvedValue({
      rows: [{ id: "exp-1", amount: 500, expense_date: "2026-01-15" }],
      summary: {
        schoolTotalCount: 1,
        schoolTotalAmount: 500,
        schoolTodayAmount: 0,
        filteredTotalCount: 1,
        filteredTotalAmount: 500,
      },
      page: 1,
      pageSize: 20,
      totalCount: 1,
      totalPages: 1,
    });

    const { GET } = await import("@/app/api/web/expenses/route");
    const req = new NextRequest(
      `http://localhost/api/web/expenses?schoolId=${VALID_SCHOOL_ID}&page=1&pageSize=20`,
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].amount).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// POST /api/web/expenses
// ---------------------------------------------------------------------------
describe("POST /api/web/expenses", () => {
  function makeActorSupabase(expenseTypeResult: { data: unknown; error: unknown }) {
    const insertBuilder = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({
        data: {
          id: "expense-new-1",
          school_id: VALID_SCHOOL_ID,
          expense_type_id: VALID_EXPENSE_TYPE_ID,
          amount: 250,
          expense_date: "2026-03-10",
          recipient: null,
          receipt_number: null,
          receipt_image_url: null,
          notes: null,
          created_at: "2026-03-10T08:00:00.000Z",
          expense_types: { name: "كهرباء" },
        },
        error: null,
      })),
    };

    return {
      from: vi.fn((table: string) => {
        if (table === "expense_types") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(async () => expenseTypeResult),
          };
        }
        // expenses table
        return {
          insert: vi.fn(() => insertBuilder),
        };
      }),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();

    mockState.enforceRateLimit.mockReturnValue(null);
    mockState.routeUserHasPermission.mockResolvedValue(true);
    mockState.resolveBranchScope.mockReturnValue(BRANCH_SCOPE_OK);
    mockState.resolveBranchIdForWrite.mockReturnValue({ ok: true, value: null });
    mockState.resolveSchoolScopedActorContext.mockResolvedValue({
      ...ACTOR_CONTEXT_OK,
      value: {
        ...ACTOR_CONTEXT_OK.value,
        actorSupabase: makeActorSupabase({
          data: { id: VALID_EXPENSE_TYPE_ID, name: "كهرباء" },
          error: null,
        }),
      },
    });
  });

  // ── Missing session (401) ────────────────────────────────────────────────

  it("returns 401 when the request has no valid session", async () => {
    mockState.resolveSchoolScopedActorContext.mockResolvedValue({
      ok: false,
      status: 401,
      message: "يجب تسجيل الدخول أولاً.",
    });

    const { POST } = await import("@/app/api/web/expenses/route");
    const req = new NextRequest("http://localhost/api/web/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id: VALID_SCHOOL_ID,
        expense_type_id: VALID_EXPENSE_TYPE_ID,
        amount: 250,
        expense_date: "2026-03-10",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  // ── Missing expense_type_id (400) ────────────────────────────────────────

  it("returns 400 when expense_type_id is missing", async () => {
    const { POST } = await import("@/app/api/web/expenses/route");
    const req = new NextRequest("http://localhost/api/web/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id: VALID_SCHOOL_ID,
        // expense_type_id intentionally omitted
        amount: 250,
        expense_date: "2026-03-10",
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.fieldErrors?.expense_type_id).toBeTruthy();
    // Context lookup must not happen before schema validation passes
    expect(mockState.resolveSchoolScopedActorContext).not.toHaveBeenCalled();
  });

  it("returns 400 when school_id is missing", async () => {
    const { POST } = await import("@/app/api/web/expenses/route");
    const req = new NextRequest("http://localhost/api/web/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expense_type_id: VALID_EXPENSE_TYPE_ID,
        amount: 250,
        expense_date: "2026-03-10",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 when amount is zero or negative", async () => {
    const { POST } = await import("@/app/api/web/expenses/route");
    const req = new NextRequest("http://localhost/api/web/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id: VALID_SCHOOL_ID,
        expense_type_id: VALID_EXPENSE_TYPE_ID,
        amount: -50,
        expense_date: "2026-03-10",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 when expense_date format is invalid", async () => {
    const { POST } = await import("@/app/api/web/expenses/route");
    const req = new NextRequest("http://localhost/api/web/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id: VALID_SCHOOL_ID,
        expense_type_id: VALID_EXPENSE_TYPE_ID,
        amount: 250,
        expense_date: "10/03/2026", // wrong format – must be YYYY-MM-DD
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  // ── Permission denied (403) ──────────────────────────────────────────────

  it("returns 403 when actor lacks add_expenses permission", async () => {
    mockState.routeUserHasPermission.mockResolvedValue(false);

    const { POST } = await import("@/app/api/web/expenses/route");
    const req = new NextRequest("http://localhost/api/web/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id: VALID_SCHOOL_ID,
        expense_type_id: VALID_EXPENSE_TYPE_ID,
        amount: 250,
        expense_date: "2026-03-10",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  // ── Expense type not found (404) ─────────────────────────────────────────

  it("returns 404 when the expense_type_id does not belong to the school", async () => {
    mockState.resolveSchoolScopedActorContext.mockResolvedValue({
      ...ACTOR_CONTEXT_OK,
      value: {
        ...ACTOR_CONTEXT_OK.value,
        actorSupabase: makeActorSupabase({ data: null, error: null }),
      },
    });

    const { POST } = await import("@/app/api/web/expenses/route");
    const req = new NextRequest("http://localhost/api/web/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id: VALID_SCHOOL_ID,
        expense_type_id: VALID_EXPENSE_TYPE_ID,
        amount: 250,
        expense_date: "2026-03-10",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  // ── Happy path (200) ─────────────────────────────────────────────────────

  it("returns 200 with created expense on valid input", async () => {
    const { POST } = await import("@/app/api/web/expenses/route");
    const req = new NextRequest("http://localhost/api/web/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id: VALID_SCHOOL_ID,
        expense_type_id: VALID_EXPENSE_TYPE_ID,
        amount: 250,
        expense_date: "2026-03-10",
        recipient: "مزود الخدمة",
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.expense).toMatchObject({
      id: "expense-new-1",
      amount: 250,
      expense_date: "2026-03-10",
    });
    expect(mockState.invalidateExpenseRelatedCaches).toHaveBeenCalledWith(VALID_SCHOOL_ID);
  });
});
