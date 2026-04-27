import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isTelegramConfigured, maskChatId, sendTelegramMessage } from "@/lib/ops/telegram";

describe("telegram ops helpers", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ ok: true, result: { message_id: 42 } }),
        { status: 200 },
      ),
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("skips when telegram env is missing", async () => {
    const result = await sendTelegramMessage("hello");
    expect(result.status).toBe("skipped");
    expect(result.reason).toBe("not_configured");
  });

  it("masks chat id safely", () => {
    expect(maskChatId("-1001234567890")).toBe("***7890");
    expect(maskChatId("123")).toBe("***");
  });

  it("detects configured telegram env without exposing token", () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "SECRET_BOT_TOKEN");
    vi.stubEnv("TELEGRAM_CHAT_ID", "-1001234567890");
    vi.stubEnv("OPS_TELEGRAM_ENABLED", "true");

    const config = isTelegramConfigured();
    const serialized = JSON.stringify(config);

    expect(config.configured).toBe(true);
    expect(config.maskedChatId).toBe("***7890");
    expect(serialized).not.toContain("SECRET_BOT_TOKEN");
    expect(serialized).not.toContain("-1001234567890");
  });

  it("sends message when configured", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "SECRET_BOT_TOKEN");
    vi.stubEnv("TELEGRAM_CHAT_ID", "-1001234567890");
    vi.stubEnv("OPS_TELEGRAM_ENABLED", "true");

    const result = await sendTelegramMessage("رسالة اختبار");

    expect(result.status).toBe("sent");
    expect(result.messageId).toBe(42);
    expect(JSON.stringify(result)).not.toContain("SECRET_BOT_TOKEN");
  });

  it("returns failed without leaking token on API error", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "SECRET_BOT_TOKEN");
    vi.stubEnv("TELEGRAM_CHAT_ID", "-1001234567890");
    vi.stubEnv("OPS_TELEGRAM_ENABLED", "true");

    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ ok: false, description: "Unauthorized" }),
        { status: 401 },
      ),
    ) as typeof fetch;

    const result = await sendTelegramMessage("hello");

    expect(result.status).toBe("failed");
    expect(result.reason).toBe("request_failed");
    expect(JSON.stringify(result)).not.toContain("SECRET_BOT_TOKEN");
    expect(JSON.stringify(result)).not.toContain("Unauthorized");
  });

  it("returns failed on fetch exception without leaking token", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "SECRET_BOT_TOKEN");
    vi.stubEnv("TELEGRAM_CHAT_ID", "-1001234567890");
    vi.stubEnv("OPS_TELEGRAM_ENABLED", "true");

    global.fetch = vi.fn(async () => {
      throw new Error("network error with SECRET_BOT_TOKEN in message");
    }) as typeof fetch;

    const result = await sendTelegramMessage("hello");

    expect(result.status).toBe("failed");
    expect(JSON.stringify(result)).not.toContain("SECRET_BOT_TOKEN");
  });
});
