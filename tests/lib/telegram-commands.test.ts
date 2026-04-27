import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockState = vi.hoisted(() => ({
  buildOpsReport: vi.fn(),
  buildOpsTelegramHtml: vi.fn(),
  classifyNotificationSeverity: vi.fn(),
  getRecentOpsErrors: vi.fn(),
  getOpsErrorById: vi.fn(),
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
      expired_count: 0,
      expiring_7_days_count: 0,
      expiring_30_days_count: 0,
      details: {},
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
    source: "api",
    route: "/api/web/students",
    method: "POST",
    page_url: null,
    action: "save_student",
    user_role: "branch_admin",
    school_id: null,
    branch_id: null,
    auth_user_id: null,
    status_code: 500,
    error_code: null,
    error_message: "Unexpected database error",
    safe_stack: null,
    request_id: null,
    deployment_id: null,
    user_agent: null,
    metadata: {},
    fix_prompt: "أريدك تصلح خطأ إنتاج في مشروع school-iraq.com.",
    last_seen_at: "2026-04-26T00:00:00.000Z",
    occurrence_count: 3,
  };
}

describe("parseTelegramUpdate", () => {
  it("returns null for non-object", async () => {
    const { parseTelegramUpdate } = await import("@/lib/ops/telegram-commands");
    expect(parseTelegramUpdate(null)).toBeNull();
    expect(parseTelegramUpdate("text")).toBeNull();
    expect(parseTelegramUpdate([])).toBeNull();
  });

  it("returns null if update_id missing", async () => {
    const { parseTelegramUpdate } = await import("@/lib/ops/telegram-commands");
    expect(parseTelegramUpdate({ message: {} })).toBeNull();
  });

  it("parses valid update", async () => {
    const { parseTelegramUpdate } = await import("@/lib/ops/telegram-commands");
    const update = parseTelegramUpdate({
      update_id: 123,
      message: { message_id: 1, chat: { id: 999, type: "private" }, text: "/help" },
    });
    expect(update?.update_id).toBe(123);
  });
});

describe("parseTelegramCommand", () => {
  it("returns null for non-command text", async () => {
    const { parseTelegramCommand } = await import("@/lib/ops/telegram-commands");
    expect(parseTelegramCommand("hello world")).toBeNull();
    expect(parseTelegramCommand("")).toBeNull();
    expect(parseTelegramCommand(undefined)).toBeNull();
  });

  it("parses simple command", async () => {
    const { parseTelegramCommand } = await import("@/lib/ops/telegram-commands");
    const parsed = parseTelegramCommand("/status");
    expect(parsed?.command).toBe("/status");
    expect(parsed?.args).toBe("");
  });

  it("strips @botname suffix", async () => {
    const { parseTelegramCommand } = await import("@/lib/ops/telegram-commands");
    const parsed = parseTelegramCommand("/status@MyOpsBot");
    expect(parsed?.command).toBe("/status");
  });

  it("parses /error_ command with prefix", async () => {
    const { parseTelegramCommand } = await import("@/lib/ops/telegram-commands");
    const parsed = parseTelegramCommand("/error_abcd1234");
    expect(parsed?.command).toBe("/error_abcd1234");
  });

  it("normalizes to lowercase", async () => {
    const { parseTelegramCommand } = await import("@/lib/ops/telegram-commands");
    const parsed = parseTelegramCommand("/STATUS");
    expect(parsed?.command).toBe("/status");
  });
});

describe("formatHelpMessage", () => {
  it("contains all commands", async () => {
    const { formatHelpMessage } = await import("@/lib/ops/telegram-commands");
    const msg = formatHelpMessage();
    expect(msg).toContain("/status");
    expect(msg).toContain("/health");
    expect(msg).toContain("/errors");
    expect(msg).toContain("/report");
    expect(msg).toContain("/test");
    expect(msg).toContain("/version");
    expect(msg).toContain("school-iraq.com");
  });

  it("does not contain secrets", async () => {
    const { formatHelpMessage } = await import("@/lib/ops/telegram-commands");
    const msg = formatHelpMessage();
    expect(msg).not.toContain("TOKEN");
    expect(msg).not.toContain("SECRET");
  });
});

describe("formatStatusMessage", () => {
  it("returns green for healthy report", async () => {
    const { formatStatusMessage } = await import("@/lib/ops/telegram-commands");
    const msg = formatStatusMessage(baseReport());
    expect(msg).toContain("🟢");
    expect(msg).toContain("95/100");
    expect(msg).toContain("✅");
  });

  it("returns red for down report", async () => {
    const { formatStatusMessage } = await import("@/lib/ops/telegram-commands");
    const report = { ...baseReport(), status: "down" as const, score: 30 };
    const msg = formatStatusMessage(report);
    expect(msg).toContain("🔴");
  });

  it("does not contain secrets", async () => {
    const { formatStatusMessage } = await import("@/lib/ops/telegram-commands");
    const msg = formatStatusMessage(baseReport());
    expect(msg).not.toContain("SUPABASE");
    expect(msg).not.toContain("TOKEN");
  });
});

describe("formatErrorsMessage", () => {
  it("returns positive message when no errors", async () => {
    const { formatErrorsMessage } = await import("@/lib/ops/telegram-commands");
    expect(formatErrorsMessage([])).toContain("✅");
  });

  it("includes error severity and id prefix", async () => {
    const { formatErrorsMessage } = await import("@/lib/ops/telegram-commands");
    const msg = formatErrorsMessage([baseError()]);
    expect(msg).toContain("🔴");
    expect(msg).toContain("abcd1234");
    expect(msg).toContain("×3"); // occurrence_count
  });

  it("does not expose school_id or branch_id", async () => {
    const { formatErrorsMessage } = await import("@/lib/ops/telegram-commands");
    const err = { ...baseError(), school_id: "secret-school-id", branch_id: "secret-branch-id" };
    const msg = formatErrorsMessage([err]);
    expect(msg).not.toContain("secret-school-id");
    expect(msg).not.toContain("secret-branch-id");
  });
});

describe("handleTelegramCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockState.buildOpsReport.mockResolvedValue(baseReport());
    mockState.buildOpsTelegramHtml.mockReturnValue("<b>ops html</b>");
    mockState.classifyNotificationSeverity.mockReturnValue("info");
    mockState.getRecentOpsErrors.mockResolvedValue([baseError()]);
    mockState.getOpsErrorById.mockResolvedValue(baseError());
  });

  it("/help returns help message", async () => {
    const { handleTelegramCommand } = await import("@/lib/ops/telegram-commands");
    const result = await handleTelegramCommand({ command: "/help", args: "", raw: "/help" });
    expect(result).toContain("/status");
    expect(result).toContain("school-iraq.com");
  });

  it("/test returns exact confirmation text", async () => {
    const { handleTelegramCommand } = await import("@/lib/ops/telegram-commands");
    const result = await handleTelegramCommand({ command: "/test", args: "", raw: "/test" });
    expect(result).toBe("Telegram bot commands تعمل ✅");
  });

  it("/start returns same as /help", async () => {
    const { handleTelegramCommand } = await import("@/lib/ops/telegram-commands");
    const helpResult = await handleTelegramCommand({ command: "/help", args: "", raw: "/help" });
    const startResult = await handleTelegramCommand({ command: "/start", args: "", raw: "/start" });
    expect(startResult).toBe(helpResult);
    expect(startResult).toContain("/status");
    expect(startResult).toContain("school-iraq.com");
  });

  it("/status calls buildOpsReport and returns safe response", async () => {
    const { handleTelegramCommand } = await import("@/lib/ops/telegram-commands");
    const result = await handleTelegramCommand({ command: "/status", args: "", raw: "/status" });
    expect(mockState.buildOpsReport).toHaveBeenCalled();
    expect(result).toContain("school-iraq.com");
    expect(result).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(result).not.toContain("TOKEN");
  });

  it("/errors returns errors list", async () => {
    const { handleTelegramCommand } = await import("@/lib/ops/telegram-commands");
    const result = await handleTelegramCommand({ command: "/errors", args: "", raw: "/errors" });
    expect(mockState.getRecentOpsErrors).toHaveBeenCalled();
    expect(result).toContain("abcd1234");
  });

  it("/error_abcd returns error details", async () => {
    const { handleTelegramCommand } = await import("@/lib/ops/telegram-commands");
    const result = await handleTelegramCommand({ command: "/error_abcd1234", args: "", raw: "/error_abcd1234" });
    expect(result).toContain("abcd1234-5678-0000-0000-000000000000");
    expect(result).not.toContain("secret-school");
  });

  it("/prompt_abcd returns fix prompt", async () => {
    const { handleTelegramCommand } = await import("@/lib/ops/telegram-commands");
    const result = await handleTelegramCommand({ command: "/prompt_abcd1234", args: "", raw: "/prompt_abcd1234" });
    expect(result).toContain("school-iraq.com");
  });

  it("unknown command returns help", async () => {
    const { handleTelegramCommand } = await import("@/lib/ops/telegram-commands");
    const result = await handleTelegramCommand({ command: "/unknown", args: "", raw: "/unknown" });
    expect(result).toContain("/status");
    expect(result).toContain("غير معروف");
  });

  it("does not throw when buildOpsReport fails", async () => {
    mockState.buildOpsReport.mockRejectedValue(new Error("DB down"));
    const { handleTelegramCommand } = await import("@/lib/ops/telegram-commands");
    const result = await handleTelegramCommand({ command: "/status", args: "", raw: "/status" });
    expect(result).toContain("تعذر");
    expect(result).not.toContain("DB down");
  });
});
