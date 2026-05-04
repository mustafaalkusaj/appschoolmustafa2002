import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const applyBranchScopeToQuery = vi.fn();
const resolveBranchScope = vi.fn();
const enforceRateLimit = vi.fn();
const resolveSchoolScopedActorContext = vi.fn();
const tableHasColumn = vi.fn();
const routeUserHasPermission = vi.fn();
const loadSchoolDeductionIndex = vi.fn();
const applyEffectiveSalaryDeductions = vi.fn();
const isMissingTableError = vi.fn();

vi.mock("@/lib/branch-scope", () => ({
  applyBranchScopeToQuery,
  resolveBranchScope,
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit,
}));

vi.mock("@/lib/managed-users-server", () => ({
  resolveSchoolScopedActorContext,
  tableHasColumn,
}));

vi.mock("@/lib/route-permissions", () => ({
  routeUserHasPermission,
}));

vi.mock("@/lib/salaries/effective-deductions", () => ({
  loadSchoolDeductionIndex,
  applyEffectiveSalaryDeductions,
}));

vi.mock("@/lib/admin-infrastructure", () => ({
  isMissingTableError,
}));

function createThenableResult() {
  return {
    then: (resolve: (value: { data: never[]; error: null }) => unknown) =>
      Promise.resolve(resolve({ data: [], error: null })),
  };
}

describe("salaries bootstrap route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimit.mockResolvedValue(null);
    tableHasColumn.mockResolvedValue(true);
    routeUserHasPermission.mockResolvedValue(false);
    loadSchoolDeductionIndex.mockResolvedValue(new Map());
    applyEffectiveSalaryDeductions.mockImplementation((rows) => rows);
    isMissingTableError.mockReturnValue(false);
    applyBranchScopeToQuery.mockImplementation((query) => query);
    resolveBranchScope.mockReturnValue({
      ok: true,
      value: {
        branchId: "branch-a",
        branchIds: ["branch-a"],
        cacheKeySuffix: "branch:branch-a",
      },
    });
    resolveSchoolScopedActorContext.mockResolvedValue({
      ok: true,
      value: {
        actorSupabase: {
          from: vi.fn(() => ({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => createThenableResult()),
              })),
            })),
          })),
        },
        actorUserId: "actor-1",
        targetSchoolId: "school-1",
        actorBranchId: "branch-a",
        allowedBranchIds: ["branch-a"],
      },
    });
  });

  it("requires manage_salaries permission before returning salary data", async () => {
    const { GET } = await import("@/app/api/web/salaries/bootstrap/route");

    const request = new NextRequest("http://localhost/api/web/salaries/bootstrap?schoolId=school-1");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error.message).toContain("صلاحية");
    expect(routeUserHasPermission).toHaveBeenCalledWith(expect.any(Object), "actor-1", "manage_salaries");
  });
});
