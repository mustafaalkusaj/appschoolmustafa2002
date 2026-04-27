import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({
  createServiceSupabaseClient: () => ({
    from: () => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}));

const mockState = vi.hoisted(() => ({
  isOpsTokenAuthorized: vi.fn(),
  resolveSuperAdminActorContext: vi.fn(),
  getRecentAuditLogs: vi.fn(),
}));

vi.mock("@/lib/ops/security", () => ({
  isOpsTokenAuthorized: mockState.isOpsTokenAuthorized,
}));

vi.mock("@/lib/super-admin-server", () => ({
  resolveSuperAdminActorContext: mockState.resolveSuperAdminActorContext,
}));

vi.mock("@/lib/audit/audit-log", () => ({
  getRecentAuditLogs: mockState.getRecentAuditLogs,
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

function makeRequest(opts: { token?: string; params?: Record<string, string> } = {}) {
  const url = new URL("http://localhost/api/ops/audit-logs");
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {};
  if (opts.token) {
    headers["authorization"] = `Bearer ${opts.token}`;
  }

  return new NextRequest(url.toString(), { method: "GET", headers });
}

describe("GET /api/ops/audit-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OPS_ALERT_TOKEN", "test-ops-token");
    mockState.getRecentAuditLogs.mockResolvedValue([
      {
        id: "log-1",
        created_at: "2026-04-26T00:00:00Z",
        actor_name: "Admin",
        actor_email: null,
        actor_source: "app",
        action_type: "create",
        entity_type: "user",
        summary: "User created",
      },
    ]);
  });

  it("returns 404 when no token and no super_admin session", async () => {
    mockState.isOpsTokenAuthorized.mockReturnValue(false);
    mockState.resolveSuperAdminActorContext.mockResolvedValue({
      ok: false,
      status: 401,
      message: "Unauthorized",
    });

    const { GET } = await import("@/app/api/ops/audit-logs/route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(404);
  });

  it("returns logs when authorized with OPS_ALERT_TOKEN", async () => {
    mockState.isOpsTokenAuthorized.mockReturnValue(true);

    const { GET } = await import("@/app/api/ops/audit-logs/route");
    const res = await GET(makeRequest({ token: "test-ops-token" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.logs)).toBe(true);
    expect(body.logs).toHaveLength(1);
  });

  it("returns logs when authorized via super_admin session", async () => {
    mockState.isOpsTokenAuthorized.mockReturnValue(false);
    mockState.resolveSuperAdminActorContext.mockResolvedValue({
      ok: true,
      value: { actorUserId: "user-1" },
    });

    const { GET } = await import("@/app/api/ops/audit-logs/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.logs)).toBe(true);
  });

  it("respects limit param (max 100)", async () => {
    mockState.isOpsTokenAuthorized.mockReturnValue(true);
    mockState.getRecentAuditLogs.mockResolvedValue([]);

    const { GET } = await import("@/app/api/ops/audit-logs/route");
    await GET(makeRequest({ params: { limit: "500" } }));

    expect(mockState.getRecentAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 }),
    );
  });
});

describe("writeAuditLog", () => {
  it("does not throw", async () => {
    const { writeAuditLog } = await import("@/lib/audit/audit-log");
    await expect(
      writeAuditLog({
        action_type: "create",
        entity_type: "user",
        summary: "Test",
      }),
    ).resolves.toBeUndefined();
  });
});
