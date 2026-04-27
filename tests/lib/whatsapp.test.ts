import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildCriticalWhatsAppMessage, buildDailyWhatsAppMessage, isWhatsAppConfigured, maskPhone, sendWhatsAppText } from "@/lib/ops/whatsapp";

describe("whatsapp ops helpers", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          messages: [{ id: "wamid.123" }],
        }),
        { status: 200 },
      ),
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("skips sending when whatsapp env is missing", async () => {
    const result = await sendWhatsAppText("hello");

    expect(result.status).toBe("skipped");
    expect(result.reason).toBe("not_configured");
  });

  it("masks phone numbers safely", () => {
    expect(maskPhone("+9647701234567")).toBe("***4567");
  });

  it("detects configured whatsapp env without exposing the token", () => {
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "SECRET_TOKEN");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123456789");
    vi.stubEnv("WHATSAPP_TO_PHONE", "+9647701234567");
    vi.stubEnv("OPS_WHATSAPP_ENABLED", "true");

    const config = isWhatsAppConfigured();
    const serialized = JSON.stringify(config);

    expect(config.configured).toBe(true);
    expect(config.maskedPhone).toBe("***4567");
    expect(serialized).not.toContain("SECRET_TOKEN");
  });

  it("sends text messages when configured", async () => {
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "SECRET_TOKEN");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123456789");
    vi.stubEnv("WHATSAPP_TO_PHONE", "+9647701234567");
    vi.stubEnv("OPS_WHATSAPP_ENABLED", "true");

    const result = await sendWhatsAppText("رسالة اختبار");

    expect(result.status).toBe("sent");
    expect(result.maskedPhone).toBe("***4567");
    expect(result.providerMessageId).toBe("wamid.123");
  });

  it("builds the Arabic daily and critical message formats", () => {
    const daily = buildDailyWhatsAppMessage({
      status: "degraded",
      score: 84,
      summary: "هناك تحذير في الاشتراكات",
      checks: {
        domain: { ok: true, status: "healthy", message: "ok" },
        vercel: { ok: true, status: "healthy", message: "ok" },
        supabaseAuth: { ok: true, status: "healthy", message: "ok" },
        database: { ok: true, status: "healthy", message: "ok" },
        storage: { ok: false, status: "degraded", message: "warn" },
        upstash: { ok: false, status: "degraded", message: "warn" },
        subscriptions: { ok: false, status: "degraded", message: "warn" },
      },
      errors: [],
      metadata: {},
      subscriptionSnapshot: {
        active_count: 10,
        expired_count: 1,
        expiring_7_days_count: 3,
        expiring_30_days_count: 4,
        details: {},
      },
    });
    const critical = buildCriticalWhatsAppMessage({
      severity: "critical",
      title: "فشل الدومين",
      message: "الموقع لا يستجيب",
    });

    expect(daily).toContain("تقرير تشغيل school-iraq.com");
    expect(daily).toContain("الحالة: degraded");
    expect(daily).toContain("الاشتراكات:");
    expect(critical.startsWith("🚨 تنبيه حرج")).toBe(true);
  });
});
