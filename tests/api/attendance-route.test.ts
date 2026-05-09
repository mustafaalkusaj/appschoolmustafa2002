import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const applyBranchScopeToQuery = vi.fn();
const resolveBranchIdForWrite = vi.fn();
const resolveBranchScope = vi.fn();
const resolveSchoolScopedActorContext = vi.fn();
const enforceRateLimit = vi.fn();
const routeUserHasPermission = vi.fn();

vi.mock("@/lib/branch-scope", () => ({
  applyBranchScopeToQuery,
  resolveBranchIdForWrite,
  resolveBranchScope,
}));

vi.mock("@/lib/managed-users-server", () => ({
  resolveSchoolScopedActorContext,
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit,
}));

vi.mock("@/lib/route-permissions", () => ({
  routeUserHasPermission,
}));

function createThenableQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    neq: vi.fn(() => query),
    order: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    in: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    upsert: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => Promise.resolve(resolve(result)),
  };
  return query;
}

describe("attendance route branch scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimit.mockResolvedValue(null);
    routeUserHasPermission.mockResolvedValue(true);
    resolveSchoolScopedActorContext.mockResolvedValue({
      ok: true,
      value: {
        actorSupabase: {
          from: vi.fn(() => createThenableQuery({ data: [], error: null })),
        },
        actorUserId: "actor-1",
        targetSchoolId: "school-1",
        actorBranchId: "branch-a",
        allowedBranchIds: ["branch-a"],
      },
    });
    resolveBranchScope.mockReturnValue({
      ok: true,
      value: {
        branchId: "branch-a",
        branchIds: ["branch-a"],
        cacheKeySuffix: "branch:branch-a",
      },
    });
    resolveBranchIdForWrite.mockReturnValue({
      ok: true,
      value: "branch-a",
    });
    applyBranchScopeToQuery.mockImplementation((query) => query);
  });

  it("applies the resolved branch scope to attendance reads", async () => {
    const { GET } = await import("@/app/api/web/attendance/route");

    const request = new NextRequest("http://localhost/api/web/attendance?schoolId=school-1");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(resolveBranchScope).toHaveBeenCalledWith(
      expect.objectContaining({
        actorBranchId: "branch-a",
        allowedBranchIds: ["branch-a"],
      }),
      null,
    );
    expect(applyBranchScopeToQuery).toHaveBeenCalledTimes(3);
    expect(applyBranchScopeToQuery).toHaveBeenNthCalledWith(
      1,
      expect.any(Object),
      expect.objectContaining({ branchId: "branch-a", branchIds: ["branch-a"] }),
    );
  });

  it("uses the resolved write branch when saving attendance", async () => {
    const actorSupabase = {
      from: vi.fn((table: string) => {
        if (table === "students") {
          return createThenableQuery({
            data: [{ id: "student-1", branch_id: "branch-a" }],
            error: null,
          });
        }
        if (table === "attendance_records") {
          return {
            upsert: vi.fn(async (payload: Array<Record<string, unknown>>) => {
              expect(payload[0]?.branch_id).toBe("branch-a");
              return { error: null };
            }),
          };
        }
        return createThenableQuery({ data: [], error: null });
      }),
    };

    resolveSchoolScopedActorContext.mockResolvedValue({
      ok: true,
      value: {
        actorSupabase,
        actorUserId: "actor-1",
        targetSchoolId: "school-1",
        actorBranchId: "branch-a",
        allowedBranchIds: ["branch-a"],
      },
    });

    const { POST } = await import("@/app/api/web/attendance/route");
    const request = new NextRequest("http://localhost/api/web/attendance", {
      method: "POST",
      body: JSON.stringify({
        school_id: "school-1",
        attendance_date: new Date().toISOString().slice(0, 10),
        entries: [{ student_id: "student-1", status: "present", note: "ok" }],
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(resolveBranchIdForWrite).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: "branch-a", branchIds: ["branch-a"] }),
      null,
    );
  });
});
