import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockTelegram = vi.hoisted(() => ({
  sendTelegramMessage: vi.fn(),
  isTelegramConfigured: vi.fn(),
}));
const mockEmail = vi.hoisted(() => ({
  sendOpsEmail: vi.fn(),
  isEmailConfigured: vi.fn(),
}));
const mockWhatsApp = vi.hoisted(() => ({
  sendWhatsAppText: vi.fn(),
  isWhatsAppConfigured: vi.fn(),
}));
const mockThrottle = vi.hoisted(() => ({
  isThrottled: vi.fn(),
  markThrottled: vi.fn(),
}));

vi.mock("@/lib/ops/telegram", () => mockTelegram);
vi.mock("@/lib/ops/email", () => mockEmail);
vi.mock("@/lib/ops/whatsapp", () => mockWhatsApp);
vi.mock("@/lib/ops/throttle", () => mockThrottle);

import {
  buildOpsNotificationMessage,
  buildOpsTelegramHtml,
  classifyNotificationSeverity,
  sendOpsNotification,
} from "@/lib/ops/notifier";

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
      expiring_30_days_count: 1,
      details: {},
    },
  };
}

function degradedReport() {
  return {
    ...baseReport(),
    status: "degraded" as const,
    score: 78,
    checks: {
      ...baseReport().checks,
      upstash: {
        ok: false,
        status: "degraded" as const,
        message: "Upstash غير مهيأ.",
        reason: "missing_env",
      },
      storage: {
        ok: false,
        status: "degraded" as const,
        message: "Buckets التخزين تحتاج مراجعة.",
        reason: "missing: school-logos",
      },
      subscriptions: { ok: false, status: "degraded" as const, message: "اشتراكات منتهية" },
    },
    subscriptionSnapshot: {
      active_count: 3,
      expired_count: 2,
      expiring_7_days_count: 1,
      expiring_30_days_count: 2,
      details: {},
      expired_school_names: ["مدرسة النور", "مدرسة الأمل"],
      expiring_soon_school_names: ["مدرسة الرافدين"],
    },
  };
}

describe("unified notifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockWhatsApp.isWhatsAppConfigured.mockReturnValue({ configured: false, enabled: false, maskedPhone: null });
    mockThrottle.isThrottled.mockResolvedValue(false);
    mockThrottle.markThrottled.mockResolvedValue(undefined);
  });

  // ── Provider routing ──────────────────────────────────────────────

  it("returns skipped for all when no providers configured", async () => {
    mockTelegram.sendTelegramMessage.mockResolvedValue({ provider: "telegram", status: "skipped", reason: "not_configured" });
    mockEmail.sendOpsEmail.mockResolvedValue({ provider: "email", status: "skipped", reason: "not_configured" });

    const result = await sendOpsNotification({ title: "test", message: "msg", severity: "info" });

    expect(result.telegram.status).toBe("skipped");
    expect(result.email.status).toBe("skipped");
    expect(result.whatsapp.status).toBe("skipped");
  });

  it("returns per-provider result when telegram succeeds", async () => {
    vi.stubEnv("OPS_TELEGRAM_ENABLED", "true");
    vi.stubEnv("OPS_EMAIL_ENABLED", "false");

    mockTelegram.sendTelegramMessage.mockResolvedValue({ provider: "telegram", status: "sent", messageId: 1 });

    const result = await sendOpsNotification({ title: "test", message: "msg", severity: "info" });

    expect(result.telegram.status).toBe("sent");
    expect(result.email.status).toBe("skipped");
    expect(result.whatsapp.status).toBe("skipped");
  });

  it("returns per-provider result when email succeeds", async () => {
    vi.stubEnv("OPS_TELEGRAM_ENABLED", "false");
    vi.stubEnv("OPS_EMAIL_ENABLED", "true");

    mockEmail.sendOpsEmail.mockResolvedValue({ provider: "email", status: "sent", messageId: "abc" });

    const result = await sendOpsNotification({ title: "test", message: "msg", severity: "info" });

    expect(result.telegram.status).toBe("skipped");
    expect(result.email.status).toBe("sent");
    expect(result.whatsapp.status).toBe("skipped");
  });

  it("uses telegramHtml override for telegram when provided", async () => {
    vi.stubEnv("OPS_TELEGRAM_ENABLED", "true");
    vi.stubEnv("OPS_EMAIL_ENABLED", "false");

    mockTelegram.sendTelegramMessage.mockResolvedValue({ provider: "telegram", status: "sent" });

    const htmlMsg = "<b>HTML message</b>";
    await sendOpsNotification({ title: "test", message: "plain", telegramHtml: htmlMsg, severity: "info" });

    expect(mockTelegram.sendTelegramMessage).toHaveBeenCalledWith(htmlMsg);
  });

  // ── Throttle ──────────────────────────────────────────────────────

  it("skips all providers when warning is throttled", async () => {
    mockThrottle.isThrottled.mockResolvedValue(true);
    vi.stubEnv("OPS_TELEGRAM_ENABLED", "true");

    const result = await sendOpsNotification({ title: "test", message: "msg", severity: "warning" });

    expect(result.throttled).toBe(true);
    expect(result.telegram.status).toBe("skipped");
    expect(result.telegram.reason).toBe("throttled");
    expect(mockTelegram.sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("never throttles critical notifications", async () => {
    mockThrottle.isThrottled.mockResolvedValue(true);
    vi.stubEnv("OPS_TELEGRAM_ENABLED", "true");
    mockTelegram.sendTelegramMessage.mockResolvedValue({ status: "sent" });
    mockEmail.sendOpsEmail.mockResolvedValue({ status: "skipped" });

    const result = await sendOpsNotification({ title: "test", message: "msg", severity: "critical" });

    expect(result.throttled).toBeUndefined();
    expect(mockThrottle.isThrottled).not.toHaveBeenCalled();
    expect(mockTelegram.sendTelegramMessage).toHaveBeenCalled();
  });

  it("marks throttled after successful warning send", async () => {
    vi.stubEnv("OPS_TELEGRAM_ENABLED", "true");
    vi.stubEnv("OPS_EMAIL_ENABLED", "false");
    mockTelegram.sendTelegramMessage.mockResolvedValue({ status: "sent" });

    await sendOpsNotification({ title: "test", message: "msg", severity: "warning" });

    expect(mockThrottle.markThrottled).toHaveBeenCalledWith("notification_warning", 6 * 3600);
  });

  it("does not mark throttled when nothing was sent", async () => {
    vi.stubEnv("OPS_TELEGRAM_ENABLED", "false");
    vi.stubEnv("OPS_EMAIL_ENABLED", "false");

    await sendOpsNotification({ title: "test", message: "msg", severity: "warning" });

    expect(mockThrottle.markThrottled).not.toHaveBeenCalled();
  });

  // ── Severity classification ───────────────────────────────────────

  it("classifies domain down as critical", () => {
    const report = { ...baseReport(), checks: { ...baseReport().checks, domain: { ok: false, status: "down" as const, message: "down" } } };
    expect(classifyNotificationSeverity(report)).toBe("critical");
  });

  it("classifies db down as critical", () => {
    const report = { ...baseReport(), checks: { ...baseReport().checks, database: { ok: false, status: "down" as const, message: "down" } } };
    expect(classifyNotificationSeverity(report)).toBe("critical");
  });

  it("classifies auth down as critical", () => {
    const report = { ...baseReport(), checks: { ...baseReport().checks, supabaseAuth: { ok: false, status: "down" as const, message: "down" } } };
    expect(classifyNotificationSeverity(report)).toBe("critical");
  });

  it("classifies score < 70 as critical", () => {
    const report = { ...baseReport(), score: 65 };
    expect(classifyNotificationSeverity(report)).toBe("critical");
  });

  it("classifies expired subscriptions > 0 as warning", () => {
    const report = { ...baseReport(), subscriptionSnapshot: { ...baseReport().subscriptionSnapshot, expired_count: 1 } };
    expect(classifyNotificationSeverity(report)).toBe("warning");
  });

  it("classifies score 70-89 as warning", () => {
    const report = { ...baseReport(), status: "degraded" as const, score: 80 };
    expect(classifyNotificationSeverity(report)).toBe("warning");
  });

  it("classifies healthy score >= 90 as info", () => {
    expect(classifyNotificationSeverity(baseReport())).toBe("info");
  });

  // ── Message content ───────────────────────────────────────────────

  it("buildOpsNotificationMessage critical prefix starts with 🚨", () => {
    const msg = buildOpsNotificationMessage({ ...baseReport(), status: "down", score: 0 }, "critical");
    expect(msg.startsWith("🚨 تنبيه حرج")).toBe(true);
  });

  it("buildOpsNotificationMessage contains action items for degraded report", () => {
    const msg = buildOpsNotificationMessage(degradedReport(), "warning");
    expect(msg).toContain("الإجراء المطلوب");
    expect(msg).toContain("تجديد اشتراكات منتهية");
  });

  it("buildOpsNotificationMessage includes expired school names", () => {
    const msg = buildOpsNotificationMessage(degradedReport(), "warning");
    expect(msg).toContain("مدرسة النور");
    expect(msg).toContain("مدرسة الأمل");
  });

  it("buildOpsNotificationMessage includes expiring soon school names", () => {
    const msg = buildOpsNotificationMessage(degradedReport(), "warning");
    expect(msg).toContain("مدرسة الرافدين");
  });

  it("buildOpsNotificationMessage includes links", () => {
    const msg = buildOpsNotificationMessage(baseReport(), "info");
    expect(msg).toContain("https://school-iraq.com");
    expect(msg).toContain("https://school-iraq.com/ar/super-admin");
    expect(msg).toContain("https://school-iraq.com/ar/subscriptions");
  });

  it("buildOpsNotificationMessage includes Upstash fail-open reason", () => {
    const report = {
      ...baseReport(),
      checks: {
        ...baseReport().checks,
        upstash: { ok: false, status: "degraded" as const, message: "Upstash غير مهيأ.", reason: "missing_env" },
      },
    };
    const msg = buildOpsNotificationMessage(report, "warning");
    expect(msg).toContain("missing_env");
    expect(msg).toContain("Upstash Redis");
  });

  it("buildOpsNotificationMessage does not contain secrets", () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "SECRET_BOT_TOKEN");
    vi.stubEnv("RESEND_API_KEY", "SECRET_RESEND_KEY");

    const msg = buildOpsNotificationMessage(baseReport(), "info");

    expect(msg).not.toContain("SECRET_BOT_TOKEN");
    expect(msg).not.toContain("SECRET_RESEND_KEY");
  });

  // ── Telegram HTML ─────────────────────────────────────────────────

  it("buildOpsTelegramHtml contains Baghdad time reference", () => {
    const html = buildOpsTelegramHtml(baseReport(), "info");
    // Should contain "بغداد" timezone label
    expect(html).toContain("بغداد");
  });

  it("buildOpsTelegramHtml has HTML bold tags for headers", () => {
    const html = buildOpsTelegramHtml(baseReport(), "info");
    expect(html).toContain("<b>");
    expect(html).toContain("الخدمات");
  });

  it("buildOpsTelegramHtml shows degraded reasons for checks", () => {
    const html = buildOpsTelegramHtml(degradedReport(), "warning");
    expect(html).toContain("missing_env");
    expect(html).toContain("missing: school-logos");
  });

  it("buildOpsTelegramHtml includes school names for expired subscriptions", () => {
    const html = buildOpsTelegramHtml(degradedReport(), "warning");
    expect(html).toContain("مدرسة النور");
    expect(html).toContain("مدرسة الأمل");
  });

  it("buildOpsTelegramHtml contains clickable links", () => {
    const html = buildOpsTelegramHtml(baseReport(), "info");
    expect(html).toContain('<a href="https://school-iraq.com">');
    expect(html).toContain('<a href="https://school-iraq.com/ar/super-admin">');
    expect(html).toContain('<a href="https://school-iraq.com/ar/subscriptions">');
  });

  it("buildOpsTelegramHtml header emoji matches severity", () => {
    expect(buildOpsTelegramHtml(baseReport(), "info")).toContain("🟢");
    expect(buildOpsTelegramHtml(baseReport(), "warning")).toContain("🟡");
    expect(buildOpsTelegramHtml(baseReport(), "critical")).toContain("🔴");
  });

  it("buildOpsTelegramHtml action items section present for degraded", () => {
    const html = buildOpsTelegramHtml(degradedReport(), "warning");
    expect(html).toContain("الإجراء المطلوب");
  });

  it("buildOpsTelegramHtml no action items section for healthy report", () => {
    const html = buildOpsTelegramHtml(baseReport(), "info");
    expect(html).not.toContain("الإجراء المطلوب");
  });

  it("buildOpsTelegramHtml does not leak secrets", () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "SECRET_BOT_TOKEN");
    const html = buildOpsTelegramHtml(baseReport(), "info");
    expect(html).not.toContain("SECRET_BOT_TOKEN");
  });

  // ── Secrets guard ─────────────────────────────────────────────────

  it("sendOpsNotification result does not contain secrets", async () => {
    vi.stubEnv("OPS_TELEGRAM_ENABLED", "true");
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "SECRET_BOT_TOKEN");

    mockTelegram.sendTelegramMessage.mockResolvedValue({ provider: "telegram", status: "sent" });
    mockEmail.sendOpsEmail.mockResolvedValue({ provider: "email", status: "skipped" });

    const result = await sendOpsNotification({ title: "test", message: "msg", severity: "info" });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("SECRET_BOT_TOKEN");
  });
});
