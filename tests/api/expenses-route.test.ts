import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const enforceRateLimit = vi.fn();
const resolveSchoolScopedActorContext = vi.fn();
const resolveExpensesPage = vi.fn();
const routeUserHasPermission = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit,
}));

vi.mock("@/lib/managed-users-server", () => ({
  resolveSchoolScopedActorContext,
}));

vi.mock("@/lib/expenses-server", () => ({
  invalidateExpenseRelatedCaches: vi.fn(),
  resolveExpensesPage,
}));

vi.mock("@/lib/route-permissions", () => ({
  routeUserHasPermission,
}));

describe("GET /api/web/expenses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimit.mockReturnValue(null);
    routeUserHasPermission.mockResolvedValue(true);
  });

  it("rejects invalid query parameters", async () => {
    const { GET } = await import("@/app/api/web/expenses/route");
    const request = new NextRequest("http://localhost/api/web/expenses?schoolId=not-a-uuid");

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.message).toBeTruthy();
  });

  it("returns paginated data for authorized actors", async () => {
    const { GET } = await import("@/app/api/web/expenses/route");
    const schoolId = "11111111-1111-4111-8111-111111111111";

    resolveSchoolScopedActorContext.mockResolvedValue({
      ok: true,
      value: {
        actorSupabase: { mock: true },
        actorUserId: "actor-1",
        targetSchoolId: schoolId,
      },
    });

    resolveExpensesPage.mockResolvedValue({
      rows: [],
      summary: {
        schoolTotalCount: 10,
        schoolTotalAmount: 1000,
        schoolTodayAmount: 200,
        filteredTotalCount: 2,
        filteredTotalAmount: 100,
      },
      page: 1,
      pageSize: 20,
      totalCount: 2,
      totalPages: 1,
    });

    const request = new NextRequest(
      `http://localhost/api/web/expenses?schoolId=${schoolId}&page=1&pageSize=20&search=فاتورة`,
    );

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(resolveExpensesPage).toHaveBeenCalledWith(
      { mock: true },
      schoolId,
      expect.objectContaining({
        page: 1,
        pageSize: 20,
        search: "فاتورة",
      }),
    );
  });
});
