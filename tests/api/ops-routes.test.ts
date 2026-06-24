import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  buildOpsReport: vi.fn(),
  saveOpsReport: vi.fn(),
  saveOpsAlert: vi.fn(),
  sendWhatsAppText: vi.fn(),
  sendOpsNotification: vi.fn(),
  createServiceSupabaseClient: vi.fn(),
  resolveSuperAdminActorContext: vi.fn(),
}));

vi.mock("@/lib/ops/health-monitor", () => ({
  buildOpsReport: mockState.buildOpsReport,
  saveOpsReport: mockState.saveOpsReport,
  saveOpsAlert: mockState.saveOpsAlert,
}));

vi.mock("@/lib/ops/whatsapp", () => ({
  sendWhatsAppText: mockState.sendWhatsAppText,
  buildDailyWhatsAppMessage: vi.fn(() => "daily message"),
  buildCriticalWhatsAppMessage: vi.fn(() => "critical message"),
  isWhatsAppConfigured: vi.fn(() => ({ configured: false, enabled: false, maskedPhone: null })),
}));

vi.mock("@/lib/ops/notifier", () => ({
  sendOpsNotification: mockState.sendOpsNotification,
  buildOpsNotificationMessage: vi.fn(() => "ops message"),
  buildOpsTelegramHtml: vi.fn(() => "<b>ops html</b>"),
  classifyNotificationSeverity: vi.fn(() => "info"),
}));

vi.mock("@/lib/supabase-server", () => ({
  createServiceSupabaseClient: mockState.createServiceSupabaseClient,
}));

vi.mock("@/lib/super-admin-server", () => ({
  resolveSuperAdminActorContext: mockState.resolveSuperAdminActorContext,
}));

function baseReport() {
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
      active_count: 1,
      expired_count: 0,
      expiring_7_days_count: 0,
      expiring_30_days_count: 0,
      details: {},
    },
  };
}

describe("ops api routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("OPS_ALERT_TOKEN", "QA_TEST_OPS_ALERT_TOKEN");
    vi.stubEnv("HEALTHCHECK_TOKEN", "QA_TEST_HEALTHCHECK_TOKEN");
    vi.stubEnv("OPS_REPORT_CRON_SECRET", "QA_TEST_CRON_SECRET");
    mockState.buildOpsReport.mockResolvedValue(baseReport());
    mockState.saveOpsReport.mockResolvedValue({ reportId: "report-1", createdAt: "2026-04-25T00:00:00.000Z" });
    mockState.saveOpsAlert.mockResolvedValue({ id: "alert-1" });
    mockState.sendWhatsAppText.mockResolvedValue({ status: "skipped", reason: "not_configured", maskedPhone: null });
    mockState.sendOpsNotification.mockResolvedValue({
      telegram: { status: "skipped", reason: "not_configured" },
      email: { status: "skipped", reason: "not_configured" },
      whatsapp: { status: "skipped", reason: "disabled" },
    });
    mockState.resolveSuperAdminActorContext.mockResolvedValue({ ok: false, status: 401, message: "denied" });
    mockState.createServiceSupabaseClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "ops_health_reports") {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({ data: { id: "report-1", summary: "ok" }, error: null })),
                })),
              })),
            })),
          };
        }

        return {
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(async () => ({ data: [], error: null })),
            })),
          })),
        };
      }),
    });
  });

  it("denies /api/ops/health without a token", async () => {
    const { GET } = await import("@/app/api/ops/health/route");
    const response = await GET(new NextRequest("http://localhost/api/ops/health"));

    expect([401, 403, 404]).toContain(response.status);
    expect(mockState.buildOpsReport).not.toHaveBeenCalled();
  });

  it("allows /api/ops/health with a token and returns a safe report payload", async () => {
    const { GET } = await import("@/app/api/ops/health/route");
    const response = await GET(
      new NextRequest("http://localhost/api/ops/health", {
        headers: { Authorization: "Bearer QA_TEST_OPS_ALERT_TOKEN" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("healthy");
    expect(JSON.stringify(payload)).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(JSON.stringify(payload)).not.toContain("WHATSAPP_ACCESS_TOKEN");
  });

  it("denies /api/ops/whatsapp-test without a token", async () => {
    const { POST } = await import("@/app/api/ops/whatsapp-test/route");
    const response = await POST(new NextRequest("http://localhost/api/ops/whatsapp-test", { method: "POST" }));

    expect([401, 403, 404]).toContain(response.status);
    expect(mockState.sendWhatsAppText).not.toHaveBeenCalled();
  });

  it("returns the latest report for a valid ops token", async () => {
    const { GET } = await import("@/app/api/ops/latest/route");
    const response = await GET(
      new NextRequest("http://localhost/api/ops/latest", {
        headers: { Authorization: "Bearer QA_TEST_OPS_ALERT_TOKEN" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.report.id).toBe("report-1");
  });

  // ── notification-test ────────────────────────────────────────────────────────

  it("denies /api/ops/notification-test without token or session", async () => {
    const { POST } = await import("@/app/api/ops/notification-test/route");
    const res = await POST(
      new NextRequest("http://localhost/api/ops/notification-test", { method: "POST" }),
    );
    expect([401, 403, 404]).toContain(res.status);
    expect(mockState.sendOpsNotification).not.toHaveBeenCalled();
  });

  it("allows /api/ops/notification-test with OPS_ALERT_TOKEN", async () => {
    const { POST } = await import("@/app/api/ops/notification-test/route");
    const res = await POST(
      new NextRequest(
        "http://localhost/api/ops/notification-test",
        { method: "POST", headers: { Authorization: "Bearer QA_TEST_OPS_ALERT_TOKEN" } },
      ),
    );
    const payload = await res.json();
    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockState.sendOpsNotification).toHaveBeenCalled();
    expect(JSON.stringify(payload)).not.toContain("QA_TEST_OPS_ALERT_TOKEN");
  });

  it("allows /api/ops/notification-test with super_admin session", async () => {
    mockState.resolveSuperAdminActorContext.mockResolvedValue({
      ok: true,
      value: { actorUserId: "user-1" },
    });
    const { POST } = await import("@/app/api/ops/notification-test/route");
    const res = await POST(
      new NextRequest("http://localhost/api/ops/notification-test", {
        method: "POST",
        headers: { Authorization: "Bearer fake-super-admin-token" },
      }),
    );
    const payload = await res.json();
    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockState.sendOpsNotification).toHaveBeenCalled();
  });

  // ── daily-report ─────────────────────────────────────────────────────────────

  it("denies /api/ops/daily-report without token or session", async () => {
    const { POST } = await import("@/app/api/ops/daily-report/route");
    const res = await POST(
      new NextRequest("http://localhost/api/ops/daily-report", { method: "POST" }),
    );
    const payload = await res.json();
    expect(res.status).toBe(401);
    expect(payload).toEqual({ ok: false, error: "Unauthorized" });
    expect(mockState.buildOpsReport).not.toHaveBeenCalled();
  });

  it("allows /api/ops/daily-report with OPS_REPORT_CRON_SECRET", async () => {
    const { POST } = await import("@/app/api/ops/daily-report/route");
    const res = await POST(
      new NextRequest(
        "http://localhost/api/ops/daily-report",
        { method: "POST", headers: { Authorization: "Bearer QA_TEST_CRON_SECRET" } },
      ),
    );
    const payload = await res.json();
    expect(res.status).toBe(200);
    expect(payload).toEqual({ ok: true, status: "healthy", score: 95 });
    expect(mockState.buildOpsReport).toHaveBeenCalled();
    expect(JSON.stringify(payload)).not.toContain("QA_TEST_CRON_SECRET");
  });

  it("allows /api/ops/daily-report with OPS_ALERT_TOKEN", async () => {
    const { POST } = await import("@/app/api/ops/daily-report/route");
    const res = await POST(
      new NextRequest(
        "http://localhost/api/ops/daily-report",
        { method: "POST", headers: { Authorization: "Bearer QA_TEST_OPS_ALERT_TOKEN" } },
      ),
    );
    const payload = await res.json();
    expect(res.status).toBe(200);
    expect(payload).toEqual({ ok: true, status: "healthy", score: 95 });
    expect(mockState.buildOpsReport).toHaveBeenCalled();
  });

  it("allows /api/ops/daily-report with super_admin session", async () => {
    mockState.resolveSuperAdminActorContext.mockResolvedValue({
      ok: true,
      value: { actorUserId: "user-1" },
    });
    const { POST } = await import("@/app/api/ops/daily-report/route");
    const res = await POST(
      new NextRequest("http://localhost/api/ops/daily-report", {
        method: "POST",
        headers: { Authorization: "Bearer fake-super-admin-token" },
      }),
    );
    const payload = await res.json();
    expect(res.status).toBe(200);
    expect(payload).toEqual({ ok: true, status: "healthy", score: 95 });
    expect(mockState.buildOpsReport).toHaveBeenCalled();
  });

  it("rejects /api/ops/daily-report with an invalid token", async () => {
    const { POST } = await import("@/app/api/ops/daily-report/route");
    const res = await POST(
      new NextRequest(
        "http://localhost/api/ops/daily-report",
        { method: "POST", headers: { Authorization: "Bearer invalid-token" } },
      ),
    );
    const payload = await res.json();
    expect(res.status).toBe(401);
    expect(payload).toEqual({ ok: false, error: "Unauthorized" });
    expect(mockState.buildOpsReport).not.toHaveBeenCalled();
  });
});
