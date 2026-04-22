import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const enforceRateLimit = vi.fn();
const resolveSchoolScopedActorContext = vi.fn();
const resolvePaymentsMeta = vi.fn();
const rememberWithTtl = vi.fn();
const buildSchoolCacheTag = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit,
}));

vi.mock("@/lib/managed-users-server", () => ({
  resolveSchoolScopedActorContext,
}));

vi.mock("@/lib/payments/overview", () => ({
  resolvePaymentsMeta,
}));

vi.mock("@/lib/server-cache", () => ({
  rememberWithTtl,
  buildSchoolCacheTag,
}));

describe("GET /api/web/payments/meta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimit.mockReturnValue(null);
    buildSchoolCacheTag.mockReturnValue("tag-1");
    rememberWithTtl.mockImplementation(async (_key, _ttl, loader) => loader());
  });

  it("passes the resolved branch scope to the payments overview loader", async () => {
    const { GET } = await import("@/app/api/web/payments/meta/route");
    const schoolId = "11111111-1111-4111-8111-111111111111";

    resolveSchoolScopedActorContext.mockResolvedValue({
      ok: true,
      value: {
        actorSupabase: { mock: true },
        actorUserId: "actor-1",
        targetSchoolId: schoolId,
        actorBranchId: "branch-a",
        allowedBranchIds: ["branch-a"],
      },
    });

    resolvePaymentsMeta.mockResolvedValue({
      summary: {
        totalStudents: 1,
        totalFee: 100,
        totalPaid: 50,
        totalRemaining: 50,
        collectedCount: 0,
      },
      classOptions: [],
      paymentYears: [],
      totalPaymentCount: 0,
      archives: [],
      archiveNotice: "",
    });

    const request = new NextRequest(`http://localhost/api/web/payments/meta?schoolId=${schoolId}`);
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(rememberWithTtl).toHaveBeenCalledWith(
      expect.stringContaining("branch:branch-a"),
      30_000,
      expect.any(Function),
      expect.any(Object),
    );
    expect(resolvePaymentsMeta).toHaveBeenCalledWith(
      { mock: true },
      schoolId,
      expect.objectContaining({
        branchId: "branch-a",
        branchIds: ["branch-a"],
      }),
    );
  });
});

