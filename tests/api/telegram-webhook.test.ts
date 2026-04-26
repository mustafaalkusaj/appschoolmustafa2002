import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  handleTelegramCommand: vi.fn(),
  sendTelegramBotReply: vi.fn(),
}));

vi.mock("@/lib/ops/telegram-commands", () => ({
  parseTelegramUpdate: (body: unknown) => {
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    const b = body as Record<string, unknown>;
    if (typeof b.update_id !== "number") return null;
    return b;
  },
  parseTelegramCommand: (text: string | undefined) => {
    if (!text?.startsWith("/")) return null;
    return { command: text.toLowerCase(), args: "", raw: text };
  },
  handleTelegramCommand: mockState.handleTelegramCommand,
}));

vi.mock("@/lib/ops/telegram", () => ({
  maskChatId: (chatId: string) => {
    if (chatId.length <= 4) return "***";
    return `***${chatId.slice(-4)}`;
  },
  sendTelegramBotReply: mockState.sendTelegramBotReply,
}));

vi.mock("server-only", () => ({}));

// Mock telegram-secret as identity — route hashing logic is tested separately.
// This keeps test secret values readable without computing SHA256 in test helpers.
vi.mock("@/lib/ops/telegram-secret", () => ({
  getTelegramSecretToken: (s: string) => s,
}));

const TEST_WEBHOOK_SECRET = "test-webhook-secret-abc123";

function makeWebhookRequest(
  body: unknown,
  opts: { secret?: string | null } = {},
) {
  // Default: include the correct test secret via header (Telegram's X-Telegram-Bot-Api-Secret-Token).
  // Pass secret: "wrong" to test rejection, or secret: null to test missing-secret path.
  const secret = "secret" in opts ? opts.secret : TEST_WEBHOOK_SECRET;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) {
    headers["x-telegram-bot-api-secret-token"] = secret;
  }
  return new NextRequest("http://localhost/api/ops/telegram-webhook", {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
}

function makeUpdate(chatId: number, text: string) {
  return {
    update_id: 1,
    message: {
      message_id: 1,
      chat: { id: chatId, type: "private" },
      text,
    },
  };
}

describe("POST /api/ops/telegram-webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("TELEGRAM_CHAT_ID", "123456789");
    // Secret must be non-empty — new route fails closed (returns ok without processing) when unset.
    // Tests that want to test no-secret behavior stub this to "" themselves.
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", TEST_WEBHOOK_SECRET);
    mockState.handleTelegramCommand.mockResolvedValue("✅ البوت يعمل");
    mockState.sendTelegramBotReply.mockResolvedValue({ provider: "telegram", status: "sent" });
  });

  it("always returns 200", async () => {
    const { POST } = await import("@/app/api/ops/telegram-webhook/route");
    const res = await POST(makeWebhookRequest({ invalid: true }));
    expect(res.status).toBe(200);
  });

  it("ignores messages from unauthorized chat", async () => {
    const { POST } = await import("@/app/api/ops/telegram-webhook/route");
    const res = await POST(makeWebhookRequest(makeUpdate(999999999, "/status")));
    expect(res.status).toBe(200);
    expect(mockState.handleTelegramCommand).not.toHaveBeenCalled();
    expect(mockState.sendTelegramBotReply).not.toHaveBeenCalled();
  });

  it("handles /help from authorized chat", async () => {
    const { POST } = await import("@/app/api/ops/telegram-webhook/route");
    const res = await POST(makeWebhookRequest(makeUpdate(123456789, "/help")));
    expect(res.status).toBe(200);
    expect(mockState.handleTelegramCommand).toHaveBeenCalledWith(
      expect.objectContaining({ command: "/help" }),
    );
    expect(mockState.sendTelegramBotReply).toHaveBeenCalled();
  });

  it("handles /start as alias for /help", async () => {
    const { POST } = await import("@/app/api/ops/telegram-webhook/route");
    const res = await POST(makeWebhookRequest(makeUpdate(123456789, "/start")));
    expect(res.status).toBe(200);
    expect(mockState.handleTelegramCommand).toHaveBeenCalledWith(
      expect.objectContaining({ command: "/start" }),
    );
    expect(mockState.sendTelegramBotReply).toHaveBeenCalled();
  });

  it("handles /test from authorized chat using sendTelegramBotReply", async () => {
    mockState.handleTelegramCommand.mockResolvedValue("Telegram bot commands تعمل ✅");
    const { POST } = await import("@/app/api/ops/telegram-webhook/route");
    const res = await POST(makeWebhookRequest(makeUpdate(123456789, "/test")));
    expect(res.status).toBe(200);
    expect(mockState.sendTelegramBotReply).toHaveBeenCalledWith(
      "Telegram bot commands تعمل ✅",
    );
  });

  it("numeric chat.id matches string TELEGRAM_CHAT_ID", async () => {
    // chat.id=123456789 (number) vs TELEGRAM_CHAT_ID="123456789" (string)
    const { POST } = await import("@/app/api/ops/telegram-webhook/route");
    const res = await POST(makeWebhookRequest(makeUpdate(123456789, "/test")));
    expect(res.status).toBe(200);
    expect(mockState.handleTelegramCommand).toHaveBeenCalled();
  });

  it("ignores non-command plain text from authorized chat", async () => {
    const { POST } = await import("@/app/api/ops/telegram-webhook/route");
    const res = await POST(makeWebhookRequest(makeUpdate(123456789, "hello bot")));
    expect(res.status).toBe(200);
    expect(mockState.handleTelegramCommand).not.toHaveBeenCalled();
  });

  it("ignores update without message text", async () => {
    const { POST } = await import("@/app/api/ops/telegram-webhook/route");
    const update = { update_id: 1, message: { message_id: 1, chat: { id: 123456789, type: "private" } } };
    const res = await POST(makeWebhookRequest(update));
    expect(res.status).toBe(200);
    expect(mockState.handleTelegramCommand).not.toHaveBeenCalled();
  });

  it("rejects wrong webhook secret (still returns 200)", async () => {
    const { POST } = await import("@/app/api/ops/telegram-webhook/route");
    const res = await POST(
      makeWebhookRequest(makeUpdate(123456789, "/status"), { secret: "wrong-secret" }),
    );
    expect(res.status).toBe(200);
    expect(mockState.handleTelegramCommand).not.toHaveBeenCalled();
  });

  it("accepts correct webhook secret via X-Telegram-Bot-Api-Secret-Token header", async () => {
    const { POST } = await import("@/app/api/ops/telegram-webhook/route");
    const res = await POST(
      makeWebhookRequest(makeUpdate(123456789, "/test"), { secret: TEST_WEBHOOK_SECRET }),
    );
    expect(res.status).toBe(200);
    expect(mockState.handleTelegramCommand).toHaveBeenCalled();
  });

  it("rejects when TELEGRAM_WEBHOOK_SECRET is not configured (fail-closed)", async () => {
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "");
    const { POST } = await import("@/app/api/ops/telegram-webhook/route");
    const res = await POST(
      makeWebhookRequest(makeUpdate(123456789, "/test"), { secret: TEST_WEBHOOK_SECRET }),
    );
    expect(res.status).toBe(200);
    expect(mockState.handleTelegramCommand).not.toHaveBeenCalled();
  });

  it("does not expose secrets in response", async () => {
    const { POST } = await import("@/app/api/ops/telegram-webhook/route");
    const res = await POST(makeWebhookRequest(makeUpdate(123456789, "/status")));
    const text = await res.text();
    expect(text).not.toContain("TOKEN");
    expect(text).not.toContain("SECRET");
    expect(text).not.toContain("SUPABASE");
  });

  it("returns 200 even when handleTelegramCommand throws", async () => {
    mockState.handleTelegramCommand.mockRejectedValue(new Error("internal failure"));
    const { POST } = await import("@/app/api/ops/telegram-webhook/route");
    const res = await POST(makeWebhookRequest(makeUpdate(123456789, "/status")));
    expect(res.status).toBe(200);
  });

  it("ignores all when TELEGRAM_CHAT_ID not configured", async () => {
    vi.stubEnv("TELEGRAM_CHAT_ID", "");
    const { POST } = await import("@/app/api/ops/telegram-webhook/route");
    const res = await POST(makeWebhookRequest(makeUpdate(123456789, "/status")));
    expect(res.status).toBe(200);
    expect(mockState.handleTelegramCommand).not.toHaveBeenCalled();
  });
});

describe("POST /api/ops/telegram-webhook/setup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("OPS_ALERT_TOKEN", "QA_TEST_OPS_ALERT_TOKEN");
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "fake-bot-token");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "");
    vi.stubEnv("OFFICIAL_DOMAIN_URL", "https://school-iraq.com");
  });

  it("denies without OPS token", async () => {
    const { POST } = await import("@/app/api/ops/telegram-webhook/setup/route");
    const res = await POST(
      new NextRequest("http://localhost/api/ops/telegram-webhook/setup", { method: "POST" }),
    );
    expect([401, 403, 404]).toContain(res.status);
  });

  it("returns 503 when TELEGRAM_BOT_TOKEN missing", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    const { POST } = await import("@/app/api/ops/telegram-webhook/setup/route");
    const res = await POST(
      new NextRequest(
        "http://localhost/api/ops/telegram-webhook/setup?token=QA_TEST_OPS_ALERT_TOKEN",
        { method: "POST" },
      ),
    );
    expect(res.status).toBe(503);
  });

  it("accepts valid query token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, description: "Webhook was set" }),
    })));

    const { POST } = await import("@/app/api/ops/telegram-webhook/setup/route");
    const res = await POST(
      new NextRequest(
        "http://localhost/api/ops/telegram-webhook/setup?token=QA_TEST_OPS_ALERT_TOKEN",
        { method: "POST" },
      ),
    );
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.ok).toBe(true);
  });

  it("accepts valid Bearer token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, description: "Webhook was set" }),
    })));

    const { POST } = await import("@/app/api/ops/telegram-webhook/setup/route");
    const res = await POST(
      new NextRequest("http://localhost/api/ops/telegram-webhook/setup", {
        method: "POST",
        headers: { Authorization: "Bearer QA_TEST_OPS_ALERT_TOKEN" },
      }),
    );
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.ok).toBe(true);
  });

  it("does not expose bot token in response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, description: "Webhook was set" }),
    })));

    const { POST } = await import("@/app/api/ops/telegram-webhook/setup/route");
    const res = await POST(
      new NextRequest(
        "http://localhost/api/ops/telegram-webhook/setup?token=QA_TEST_OPS_ALERT_TOKEN",
        { method: "POST" },
      ),
    );
    const text = await res.text();
    expect(text).not.toContain("fake-bot-token");
    expect(text).not.toContain("TELEGRAM_BOT_TOKEN");
  });
});

describe("POST /api/ops/telegram-webhook/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("OPS_ALERT_TOKEN", "QA_TEST_OPS_ALERT_TOKEN");
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "fake-bot-token");
  });

  it("denies without OPS token", async () => {
    const { POST } = await import("@/app/api/ops/telegram-webhook/delete/route");
    const res = await POST(
      new NextRequest("http://localhost/api/ops/telegram-webhook/delete", { method: "POST" }),
    );
    expect([401, 403, 404]).toContain(res.status);
  });

  it("does not expose bot token in response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, description: "Webhook was deleted" }),
    })));

    const { POST } = await import("@/app/api/ops/telegram-webhook/delete/route");
    const res = await POST(
      new NextRequest(
        "http://localhost/api/ops/telegram-webhook/delete?token=QA_TEST_OPS_ALERT_TOKEN",
        { method: "POST" },
      ),
    );
    const text = await res.text();
    expect(text).not.toContain("fake-bot-token");
  });
});
