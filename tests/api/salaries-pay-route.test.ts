import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const applyBranchScopeToQuery = vi.fn();
const resolveBranchIdForWrite = vi.fn();
const resolveBranchScope = vi.fn();
const resolveSchoolScopedActorContext = vi.fn();
const resolveSchoolBranchId = vi.fn();
const enforceRateLimit = vi.fn();
const routeUserHasPermission = vi.fn();

vi.mock("@/lib/branch-scope", () => ({
  applyBranchScopeToQuery,
  resolveBranchIdForWrite,
  resolveBranchScope,
}));

vi.mock("@/lib/managed-users-server", () => ({
  resolveSchoolScopedActorContext,
  resolveSchoolBranchId,
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit,
}));

vi.mock("@/lib/route-permissions", () => ({
  routeUserHasPermission,
}));

vi.mock("@/lib/server-cache", () => ({
  invalidateSchoolCacheDomains: vi.fn(),
}));

function createThenableQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => Promise.resolve(resolve(result)),
  };
  return query;
}

describe("POST /api/web/salaries/pay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimit.mockResolvedValue(null);
    routeUserHasPermission.mockResolvedValue(true);
    resolveSchoolBranchId.mockResolvedValue("11111111-1111-4111-8111-111111111111");
    resolveSchoolScopedActorContext.mockResolvedValue({
      ok: true,
      value: {
        actorSupabase: {
          from: vi.fn((table: string) => {
            if (table === "teachers") {
              return createThenableQuery({
                data: {
                  id: "22222222-2222-4222-8222-222222222222",
                  full_name: "Teacher",
                },
                error: null,
              });
            }
            if (table === "salaries") {
              const insertChain = {
                insert: vi.fn(() => insertChain),
                select: vi.fn(() => insertChain),
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: "33333333-3333-4333-8333-333333333333",
                      school_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                      branch_id: "11111111-1111-4111-8111-111111111111",
                      teacher_id: "22222222-2222-4222-8222-222222222222",
                      gross_salary: 1000,
                      deductions: 0,
                      month: "2026-04",
                      is_paid: true,
                      paid_at: "2026-04-28T00:00:00.000Z",
                      notes: null,
                      created_at: "2026-04-28T00:00:00.000Z",
                      teachers: { full_name: "Teacher", subject: null },
                    },
                    error: null,
                  }),
                ),
                eq: vi.fn(() => insertChain),
                order: vi.fn(() => insertChain),
                limit: vi.fn(() => insertChain),
                then: (resolve: (value: { data: unknown; error: unknown }) => unknown) =>
                  Promise.resolve(resolve({ data: [], error: null })),
              };
              return insertChain;
            }
            return createThenableQuery({ data: null, error: null });
          }),
        },
        actorUserId: "actor-1",
        targetSchoolId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        actorBranchId: "11111111-1111-4111-8111-111111111111",
        allowedBranchIds: ["11111111-1111-4111-8111-111111111111"],
      },
    });
    resolveBranchScope.mockReturnValue({
      ok: true,
      value: {
        branchId: "11111111-1111-4111-8111-111111111111",
        branchIds: ["11111111-1111-4111-8111-111111111111"],
        cacheKeySuffix: "branch:11111111-1111-4111-8111-111111111111",
      },
    });
    resolveBranchIdForWrite.mockReturnValue({
      ok: true,
      value: "11111111-1111-4111-8111-111111111111",
    });
    applyBranchScopeToQuery.mockImplementation((query) => query);
  });

  it("enforces the resolved branch scope for salary payment writes", async () => {
    const { POST } = await import("@/app/api/web/salaries/pay/route");

    const request = new NextRequest("http://localhost/api/web/salaries/pay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        school_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        branch_id: "11111111-1111-4111-8111-111111111111",
        teacher_id: "22222222-2222-4222-8222-222222222222",
        month: "2026-04",
        gross_salary: 1000,
        deductions: 0,
        notes: null,
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(resolveBranchScope).toHaveBeenCalledWith(
      expect.objectContaining({
        actorBranchId: "11111111-1111-4111-8111-111111111111",
        allowedBranchIds: ["11111111-1111-4111-8111-111111111111"],
      }),
      "11111111-1111-4111-8111-111111111111",
    );
    expect(resolveBranchIdForWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: "11111111-1111-4111-8111-111111111111",
        branchIds: ["11111111-1111-4111-8111-111111111111"],
      }),
      "11111111-1111-4111-8111-111111111111",
    );
    expect(applyBranchScopeToQuery).toHaveBeenCalled();
  });
});
