import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  sendOpsNotification: vi.fn(),
  saveOpsAlert: vi.fn(),
  resolveSuperAdminActorContext: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/ops/notifier", () => ({
  sendOpsNotification: mockState.sendOpsNotification,
  buildOpsNotificationMessage: vi.fn(() => "test message"),
}));

vi.mock("@/lib/ops/health-monitor", () => ({
  saveOpsAlert: mockState.saveOpsAlert,
}));

vi.mock("@/lib/super-admin-server", () => ({
  resolveSuperAdminActorContext: mockState.resolveSuperAdminActorContext,
}));

describe("ops notification-test route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("OPS_ALERT_TOKEN", "QA_TEST_OPS_ALERT_TOKEN");
    mockState.saveOpsAlert.mockResolvedValue({ id: "alert-1" });
    // Default: no session (so token-less requests are denied)
    mockState.resolveSuperAdminActorContext.mockResolvedValue({
      ok: false,
      status: 401,
      message: "denied",
    });
    mockState.sendOpsNotification.mockResolvedValue({
      telegram: { status: "skipped", reason: "not_configured" },
      email: { status: "skipped", reason: "not_configured" },
      whatsapp: { status: "skipped", reason: "disabled" },
    });
  });

  it("denies without token — returns 404", async () => {
    const { POST } = await import("@/app/api/ops/notification-test/route");
    const response = await POST(new NextRequest("http://localhost/api/ops/notification-test", { method: "POST" }));

    expect([401, 403, 404]).toContain(response.status);
    expect(mockState.sendOpsNotification).not.toHaveBeenCalled();
  });

  it("denies with wrong token", async () => {
    const { POST } = await import("@/app/api/ops/notification-test/route");
    const response = await POST(
      new NextRequest("http://localhost/api/ops/notification-test", {
        method: "POST",
        headers: { Authorization: "Bearer WRONG_TOKEN" },
      }),
    );

    expect([401, 403, 404]).toContain(response.status);
    expect(mockState.sendOpsNotification).not.toHaveBeenCalled();
  });

  it("returns 200 with valid token when all providers skip", async () => {
    const { POST } = await import("@/app/api/ops/notification-test/route");
    const response = await POST(
      new NextRequest("http://localhost/api/ops/notification-test", {
        method: "POST",
        headers: { Authorization: "Bearer QA_TEST_OPS_ALERT_TOKEN" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.notifications.telegram.status).toBe("skipped");
    expect(payload.notifications.email.status).toBe("skipped");
    expect(payload.notifications.whatsapp.status).toBe("skipped");
  });

  it("returns 200 with valid token when telegram sent", async () => {
    mockState.sendOpsNotification.mockResolvedValue({
      telegram: { status: "sent" },
      email: { status: "skipped" },
      whatsapp: { status: "skipped" },
    });

    const { POST } = await import("@/app/api/ops/notification-test/route");
    const response = await POST(
      new NextRequest("http://localhost/api/ops/notification-test", {
        method: "POST",
        headers: { Authorization: "Bearer QA_TEST_OPS_ALERT_TOKEN" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.notifications.telegram.status).toBe("sent");
  });

  it("response does not contain secrets", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "SECRET_BOT_TOKEN");
    vi.stubEnv("RESEND_API_KEY", "SECRET_RESEND_KEY");

    const { POST } = await import("@/app/api/ops/notification-test/route");
    const response = await POST(
      new NextRequest("http://localhost/api/ops/notification-test", {
        method: "POST",
        headers: { Authorization: "Bearer QA_TEST_OPS_ALERT_TOKEN" },
      }),
    );
    const text = await response.text();

    expect(text).not.toContain("SECRET_BOT_TOKEN");
    expect(text).not.toContain("SECRET_RESEND_KEY");
    expect(text).not.toContain("QA_TEST_OPS_ALERT_TOKEN");
  });
});
