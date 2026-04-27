import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockState = vi.hoisted(() => ({
  buildOpsReport: vi.fn(),
  buildOpsTelegramHtml: vi.fn(),
  classifyNotificationSeverity: vi.fn(),
  getRecentOpsErrors: vi.fn(),
  getOpsErrorById: vi.fn(),
  updateOpsErrorStatus: vi.fn(),
  writeAuditLog: vi.fn(),
  supabaseFrom: vi.fn(),
}));

vi.mock("@/lib/ops/health-monitor", () => ({
  buildOpsReport: mockState.buildOpsReport,
}));

vi.mock("@/lib/ops/notifier", () => ({
  buildOpsTelegramHtml: mockState.buildOpsTelegramHtml,
  classifyNotificationSeverity: mockState.classifyNotificationSeverity,
}));

vi.mock("@/lib/ops/error-capture", () => ({
  getRecentOpsErrors: mockState.getRecentOpsErrors,
  getOpsErrorById: mockState.getOpsErrorById,
  updateOpsErrorStatus: mockState.updateOpsErrorStatus,
}));

vi.mock("@/lib/audit/audit-log", () => ({
  writeAuditLog: mockState.writeAuditLog,
}));

vi.mock("@/lib/supabase-server", () => ({
  createServiceSupabaseClient: () => ({
    from: mockState.supabaseFrom,
  }),
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
      active_count: 5,
      expired_count: 2,
      expiring_7_days_count: 1,
      expiring_30_days_count: 3,
      details: {},
      expired_school_names: ["School A", "School B"],
      expiring_soon_school_names: ["School C"],
    },
  };
}

function baseError() {
  return {
    id: "abcd1234-5678-0000-0000-000000000000",
    created_at: "2026-04-26T00:00:00.000Z",
    environment: "production",
    severity: "critical" as const,
    status: "open" as const,
    source: "api" as const,
    route: "/api/web/students",
    method: "GET",
    page_url: null,
    action: null,
    user_role: "admin",
    school_id: "school-1",
    branch_id: null,
    auth_user_id: null,
    status_code: 500,
    error_code: null,
    error_message: "Internal server error",
    safe_stack: null,
    request_id: null,
    deployment_id: null,
    user_agent: null,
    metadata: {},
    fix_prompt: null,
    last_seen_at: "2026-04-26T00:00:00.000Z",
    occurrence_count: 1,
  };
}

describe("handleTelegramCommand — extended commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("TELEGRAM_CHAT_ID", "123456789");
    vi.stubEnv("OPS_ALERT_TOKEN", "test-ops-token");

    mockState.buildOpsReport.mockResolvedValue(baseReport());
    mockState.updateOpsErrorStatus.mockResolvedValue(undefined);
    mockState.writeAuditLog.mockResolvedValue(undefined);

    // Default supabase mock — override per test
    mockState.supabaseFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            gte: () => Promise.resolve({ count: 0, data: [], error: null }),
          }),
          gt: () => Promise.resolve({ data: [], error: null }),
          gte: () => Promise.resolve({ data: [], error: null }),
          limit: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
          then: (resolve: (val: unknown) => unknown) =>
            resolve({ count: 5, data: null, error: null }),
        }),
        gte: () => Promise.resolve({ data: [], error: null }),
        gt: () => Promise.resolve({ data: [], error: null }),
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
        head: true,
        count: "exact",
        limit: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        then: (resolve: (val: unknown) => unknown) =>
          resolve({ count: 5, data: null, error: null }),
      }),
    });
  });

  it("/fixed_<id> calls updateOpsErrorStatus with 'fixed'", async () => {
    const err = baseError();
    mockState.getRecentOpsErrors.mockResolvedValue([err]);
    mockState.updateOpsErrorStatus.mockResolvedValue(undefined);

    const { handleTelegramCommand } = await import(
      "@/lib/ops/telegram-commands"
    );
    const result = await handleTelegramCommand({
      command: `/fixed_${err.id.slice(0, 8)}`,
      args: "",
      raw: `/fixed_${err.id.slice(0, 8)}`,
    });

    expect(mockState.updateOpsErrorStatus).toHaveBeenCalledWith(err.id, "fixed");
    expect(result).toContain("fixed");
    expect(result).not.toContain("password");
    expect(result).not.toContain("token");
    expect(result).not.toContain("secret");
  });

  it("/ignore_<id> calls updateOpsErrorStatus with 'ignored'", async () => {
    const err = baseError();
    mockState.getRecentOpsErrors.mockResolvedValue([err]);
    mockState.updateOpsErrorStatus.mockResolvedValue(undefined);

    const { handleTelegramCommand } = await import(
      "@/lib/ops/telegram-commands"
    );
    const result = await handleTelegramCommand({
      command: `/ignore_${err.id.slice(0, 8)}`,
      args: "",
      raw: `/ignore_${err.id.slice(0, 8)}`,
    });

    expect(mockState.updateOpsErrorStatus).toHaveBeenCalledWith(err.id, "ignored");
    expect(result).toContain("تجاهل");
  });

  it("/deepcheck returns comprehensive report", async () => {
    // Mock chained from().select().eq().eq() for counts
    mockState.supabaseFrom.mockReturnValue({
      select: (_cols: unknown, _opts?: unknown) => {
        const innerChain = {
          eq: (_col: unknown, _val: unknown) => ({
            eq: (_c: unknown, _v: unknown) =>
              Promise.resolve({ count: 3, data: null, error: null }),
            then: (resolve: (val: unknown) => unknown) =>
              resolve({ count: 5, data: null, error: null }),
          }),
          then: (resolve: (val: unknown) => unknown) =>
            resolve({ count: 5, data: null, error: null }),
        };
        return innerChain;
      },
    });

    const { handleTelegramCommand } = await import(
      "@/lib/ops/telegram-commands"
    );
    const result = await handleTelegramCommand({
      command: "/deepcheck",
      args: "",
      raw: "/deepcheck",
    });

    expect(result).toContain("فحص شامل");
    expect(result).toContain("school-iraq.com");
    // Should not contain secrets
    expect(result).not.toContain(process.env.OPS_ALERT_TOKEN ?? "");
    expect(result.length).toBeLessThanOrEqual(4096);
  });

  it("/users returns masked user list without secrets", async () => {
    const users = [
      {
        id: "user-1",
        full_name: "Ahmed",
        email: "ahmed@school.com",
        role: "admin",
        created_at: "2026-04-01T00:00:00Z",
      },
    ];

    mockState.supabaseFrom.mockReturnValue({
      select: (_cols: unknown, _opts?: unknown) => ({
        eq: (_col: unknown, _val: unknown) => ({
          then: (resolve: (val: unknown) => unknown) =>
            resolve({ count: 1, data: null, error: null }),
        }),
        order: (_col: unknown, _opts?: unknown) => ({
          limit: (_n: number) =>
            Promise.resolve({ data: users, error: null }),
        }),
        then: (resolve: (val: unknown) => unknown) =>
          resolve({ count: 1, data: [{ role: "admin" }], error: null }),
      }),
    });

    const { handleTelegramCommand } = await import(
      "@/lib/ops/telegram-commands"
    );
    const result = await handleTelegramCommand({
      command: "/users",
      args: "",
      raw: "/users",
    });

    expect(result).toContain("إحصائيات المستخدمين");
    // Email should be masked — full email should not appear
    expect(result).not.toContain("ahmed@school.com");
    // Masked form should appear
    expect(result).toContain("***@school.com");
    // No secrets
    expect(result).not.toContain("password");
    expect(result).not.toContain("token");
  });

  it("/add_user without args returns usage instructions", async () => {
    const { handleTelegramCommand } = await import(
      "@/lib/ops/telegram-commands"
    );
    const result = await handleTelegramCommand({
      command: "/add_user",
      args: "",
      raw: "/add_user",
    });

    expect(result).toContain("إضافة مستخدم");
    expect(result).toContain("/add_user email=");
  });

  it("/add_user with args creates pending action", async () => {
    const pendingId = "pending-uuid-1234-5678-0000-000000000000";
    mockState.supabaseFrom.mockReturnValue({
      insert: (_data: unknown) => ({
        select: (_cols: unknown) => ({
          single: () =>
            Promise.resolve({ data: { id: pendingId }, error: null }),
        }),
      }),
    });

    vi.stubEnv("TELEGRAM_CHAT_ID", "123456789");

    const { handleTelegramCommand } = await import(
      "@/lib/ops/telegram-commands"
    );
    const result = await handleTelegramCommand({
      command: "/add_user",
      args: 'email=test@example.com role=admin name="Test User" school=school-1',
      raw: '/add_user email=test@example.com role=admin name="Test User" school=school-1',
    });

    expect(result).toContain("طلب إضافة مستخدم");
    // Email should be masked
    expect(result).not.toContain("test@example.com");
    expect(result).toContain("***@example.com");
    // Should show confirm command
    expect(result).toContain("/confirm_add_user");
  });

  it("/subscriptions returns subscription counts", async () => {
    const { handleTelegramCommand } = await import(
      "@/lib/ops/telegram-commands"
    );
    const result = await handleTelegramCommand({
      command: "/subscriptions",
      args: "",
      raw: "/subscriptions",
    });

    expect(result).toContain("ملخص الاشتراكات");
    expect(result).toContain("5"); // active_count
    expect(result).toContain("2"); // expired_count
  });

  it("/finance_today returns aggregate only (no student details)", async () => {
    const payments = [
      { id: "pay-1", amount: 50000 },
      { id: "pay-2", amount: 75000 },
    ];

    mockState.supabaseFrom.mockReturnValue({
      select: (_cols: unknown) => ({
        gte: (_col: unknown, _val: unknown) =>
          Promise.resolve({ data: payments, error: null }),
      }),
    });

    const { handleTelegramCommand } = await import(
      "@/lib/ops/telegram-commands"
    );
    const result = await handleTelegramCommand({
      command: "/finance_today",
      args: "",
      raw: "/finance_today",
    });

    expect(result).toContain("مدفوعات اليوم");
    // Should show count and total, not individual records
    expect(result).toContain("العدد");
    expect(result).toContain("الإجمالي");
    // Should not contain individual payment IDs
    expect(result).not.toContain("pay-1");
    expect(result).not.toContain("pay-2");
  });

  it("no secrets in any command reply", async () => {
    const FAKE_TOKEN = "super-secret-ops-token-12345";
    vi.stubEnv("OPS_ALERT_TOKEN", FAKE_TOKEN);

    const { handleTelegramCommand } = await import(
      "@/lib/ops/telegram-commands"
    );
    const result = await handleTelegramCommand({
      command: "/version",
      args: "",
      raw: "/version",
    });

    expect(result).not.toContain(FAKE_TOKEN);
    // NODE_ENV is fine to show but tokens/secrets should not appear
    expect(result).not.toMatch(/\bsk_[a-zA-Z0-9]{10,}/);
  });

  it("/fixed_<id> writes an audit log", async () => {
    const err = baseError();
    mockState.getRecentOpsErrors.mockResolvedValue([err]);
    mockState.updateOpsErrorStatus.mockResolvedValue(undefined);
    mockState.writeAuditLog.mockResolvedValue(undefined);

    const { handleTelegramCommand } = await import(
      "@/lib/ops/telegram-commands"
    );
    await handleTelegramCommand({
      command: `/fixed_${err.id.slice(0, 8)}`,
      args: "",
      raw: `/fixed_${err.id.slice(0, 8)}`,
    });

    // writeAuditLog is fire-and-forget (called with catch) — verify it was called
    // Give a tick for the async call to settle
    await new Promise((r) => setTimeout(r, 10));
    expect(mockState.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_source: "telegram_ops_bot",
        action_type: "error_status_change",
        entity_type: "ops_error",
        entity_id: err.id,
      }),
    );
  });
});
