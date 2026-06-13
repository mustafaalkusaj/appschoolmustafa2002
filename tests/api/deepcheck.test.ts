import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockState = vi.hoisted(() => ({
  isOpsTokenAuthorized: vi.fn(),
  resolveSuperAdminActorContext: vi.fn(),
  buildOpsReport: vi.fn(),
  supabaseFrom: vi.fn(),
}));

vi.mock("@/lib/ops/security", () => ({
  isOpsTokenAuthorized: mockState.isOpsTokenAuthorized,
}));

vi.mock("@/lib/super-admin-server", () => ({
  resolveSuperAdminActorContext: mockState.resolveSuperAdminActorContext,
}));

vi.mock("@/lib/ops/health-monitor", () => ({
  buildOpsReport: mockState.buildOpsReport,
}));

vi.mock("@/lib/supabase-server", () => ({
  createServiceSupabaseClient: () => ({
    from: mockState.supabaseFrom,
  }),
}));

function makeReport() {
  return {
    status: "healthy" as const,
    score: 95,
    summary: "all good",
    checks: {
      domain: { ok: true, status: "healthy" as const, message: "ok" },
      vercel: { ok: true, status: "healthy" as const, message: "ok" },
      supabaseAuth: { ok: true, status: "healthy" as const, message: "ok" },
      database: { ok: true, status: "healthy" as const, message: "ok" },
      storage: { ok: true, status: "healthy" as const, message: "ok" },
      upstash: { ok: true, status: "healthy" as const, message: "ok" },
      subscriptions: { ok: true, status: "healthy" as const, message: "ok" },
    },
    errors: [],
    metadata: {},
    subscriptionSnapshot: {
      active_count: 5,
      expired_count: 0,
      expiring_7_days_count: 0,
      expiring_30_days_count: 0,
      details: {},
    },
  };
}

function makeRequest(opts: { token?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.token) {
    headers["authorization"] = `Bearer ${opts.token}`;
  }
  return new NextRequest("http://localhost/api/ops/deepcheck", {
    method: "POST",
    headers,
  });
}

describe("POST /api/ops/deepcheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OPS_ALERT_TOKEN", "test-ops-token");

    mockState.buildOpsReport.mockResolvedValue(makeReport());
    mockState.supabaseFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ count: 3, data: null, error: null }),
          head: true,
          count: "exact",
        }),
        head: true,
        count: "exact",
      }),
    });

    // Override supabaseFrom to return chainable object with counts
    const chainable = (count: number) => ({
      select: (_cols: unknown, _opts?: unknown) => ({
        eq: (_col: unknown, _val: unknown) => ({
          eq: (_c: unknown, _v: unknown) =>
            Promise.resolve({ count, data: null, error: null }),
          then: (resolve: (val: { count: number; data: null; error: null }) => unknown) =>
            resolve({ count, data: null, error: null }),
        }),
        then: (resolve: (val: { count: number; data: null; error: null }) => unknown) =>
          resolve({ count, data: null, error: null }),
      }),
    });

    mockState.supabaseFrom.mockImplementation((_table: string) =>
      chainable(2),
    );
  });

  it("returns 404 when unauthorized", async () => {
    mockState.isOpsTokenAuthorized.mockReturnValue(false);
    mockState.resolveSuperAdminActorContext.mockResolvedValue({
      ok: false,
      status: 401,
      message: "Unauthorized",
    });

    const { POST } = await import("@/app/api/ops/deepcheck/route");
    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
  });

  it("returns report when authorized with OPS_ALERT_TOKEN", async () => {
    mockState.isOpsTokenAuthorized.mockReturnValue(true);

    const { POST } = await import("@/app/api/ops/deepcheck/route");
    const res = await POST(makeRequest({ token: "test-ops-token" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.report).toBeDefined();
    expect(typeof body.report.score).toBe("number");
    expect(body.errorSummary).toBeDefined();
    expect(body.subscriptions).toBeDefined();
  });

  it("includes errorSummary in response", async () => {
    mockState.isOpsTokenAuthorized.mockReturnValue(true);

    const { POST } = await import("@/app/api/ops/deepcheck/route");
    const res = await POST(makeRequest({ token: "test-ops-token" }));
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.errorSummary).toHaveProperty("open");
    expect(body.errorSummary).toHaveProperty("critical");
  });
});
