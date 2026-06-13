import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockResolveSchoolScopedActorContext = vi.fn();
const mockEnforceRateLimit = vi.fn();
const mockFetchBudgetSummaries = vi.fn();

vi.mock("@/lib/managed-users-server", () => ({
  resolveSchoolScopedActorContext: mockResolveSchoolScopedActorContext,
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: mockEnforceRateLimit,
}));

vi.mock("@/lib/school-manager/budget-summary", () => ({
  fetchBudgetSummaries: mockFetchBudgetSummaries,
}));

describe("GET /api/web/dashboard/budgets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns budget summaries for current and next fiscal year", async () => {
    const mockSummaries = {
      current: {
        fiscalYear: 2026,
        isCurrent: true,
        budget: {
          id: "budget-1",
          school_id: "school-1",
          fiscal_year: 2026,
          status: "active",
          notes: "Test budget",
          created_at: "2026-01-01",
          budget_items: [],
        },
        branches: [
          {
            branchId: "branch-1",
            branchName: "فرع أول",
            plannedIncome: 10000,
            actualIncome: 5000,
            plannedExpense: 3000,
            actualExpense: 2000,
          },
        ],
        totals: {
          plannedIncome: 10000,
          actualIncome: 5000,
          plannedExpense: 3000,
          actualExpense: 2000,
          plannedSurplus: 7000,
          actualSurplus: 3000,
          incomeCompletionRate: 50,
          expenseConsumptionRate: 66.7,
        },
      },
      next: {
        fiscalYear: 2027,
        isCurrent: false,
        budget: null,
        branches: [
          {
            branchId: "branch-1",
            branchName: "فرع أول",
            plannedIncome: 0,
            actualIncome: 0,
            plannedExpense: 0,
            actualExpense: 0,
          },
        ],
        totals: {
          plannedIncome: 0,
          actualIncome: 0,
          plannedExpense: 0,
          actualExpense: 0,
          plannedSurplus: 0,
          actualSurplus: 0,
          incomeCompletionRate: 0,
          expenseConsumptionRate: 0,
        },
      },
    };

    mockResolveSchoolScopedActorContext.mockResolvedValue({
      ok: true,
      value: {
        actorSupabase: {},
        actorUserId: "user-1",
        targetSchoolId: "school-1",
        scopeLevel: "group_admin",
      },
    });

    mockEnforceRateLimit.mockResolvedValue(null);
    mockFetchBudgetSummaries.mockResolvedValue(mockSummaries);

    const { GET } = await import("@/app/api/web/dashboard/budgets/route");
    const req = new NextRequest("http://localhost/api/web/dashboard/budgets", {
      headers: {
        authorization: "Bearer token",
      },
    });

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.current.fiscalYear).toBe(2026);
    expect(data.next.fiscalYear).toBe(2027);
    expect(data.currentYear).toBe(2026);
    expect(data.nextYear).toBe(2027);
    expect(data.current.budget).toBeDefined();
    expect(data.next.budget).toBeNull();
  });

  it("rejects request from non-admin user", async () => {
    mockResolveSchoolScopedActorContext.mockResolvedValue({
      ok: false,
      status: 403,
      message: "لا يمكن الوصول إلى الموازنات من هذا الحساب.",
    });

    const { GET } = await import("@/app/api/web/dashboard/budgets/route");
    const req = new NextRequest("http://localhost/api/web/dashboard/budgets", {
      headers: {
        authorization: "Bearer token",
      },
    });

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error.message).toContain("لا يمكن الوصول");
  });

  it("applies rate limiting", async () => {
    mockResolveSchoolScopedActorContext.mockResolvedValue({
      ok: true,
      value: {
        actorSupabase: {},
        actorUserId: "user-1",
        targetSchoolId: "school-1",
        scopeLevel: "group_admin",
      },
    });

    const rateLimitResponse = new Response(JSON.stringify({ error: "Rate limited" }), {
      status: 429,
    });
    mockEnforceRateLimit.mockResolvedValue(rateLimitResponse);

    const { GET } = await import("@/app/api/web/dashboard/budgets/route");
    const req = new NextRequest("http://localhost/api/web/dashboard/budgets", {
      headers: {
        authorization: "Bearer token",
      },
    });

    const response = await GET(req);

    expect(response.status).toBe(429);
    expect(mockEnforceRateLimit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        namespace: "budgets-list",
        windowMs: 60_000,
        maxHits: 60,
        identifier: "user-1",
      })
    );
  });
});
