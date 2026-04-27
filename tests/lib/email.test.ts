import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isEmailConfigured, maskEmail, sendOpsEmail } from "@/lib/ops/email";

describe("email ops helpers", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ id: "email-abc123" }),
        { status: 200 },
      ),
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("skips when email env is missing", async () => {
    const result = await sendOpsEmail("subject", "body");
    expect(result.status).toBe("skipped");
    expect(result.reason).toBe("not_configured");
  });

  it("masks email safely", () => {
    expect(maskEmail("admin@school-iraq.com")).toBe("ad***@school-iraq.com");
    expect(maskEmail("a@school-iraq.com")).toBe("a***@school-iraq.com");
    expect(maskEmail("noatsign")).toBe("***");
  });

  it("detects configured email env without exposing API key", () => {
    vi.stubEnv("RESEND_API_KEY", "SECRET_RESEND_KEY");
    vi.stubEnv("OPS_ALERT_EMAIL_FROM", "ops@school-iraq.com");
    vi.stubEnv("OPS_ALERT_EMAIL_TO", "admin@school-iraq.com");
    vi.stubEnv("OPS_EMAIL_ENABLED", "true");

    const config = isEmailConfigured();
    const serialized = JSON.stringify(config);

    expect(config.configured).toBe(true);
    expect(config.maskedTo).toBe("ad***@school-iraq.com");
    expect(serialized).not.toContain("SECRET_RESEND_KEY");
    expect(serialized).not.toContain("admin@school-iraq.com");
  });

  it("sends email when configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "SECRET_RESEND_KEY");
    vi.stubEnv("OPS_ALERT_EMAIL_FROM", "ops@school-iraq.com");
    vi.stubEnv("OPS_ALERT_EMAIL_TO", "admin@school-iraq.com");
    vi.stubEnv("OPS_EMAIL_ENABLED", "true");

    const result = await sendOpsEmail("Test subject", "Test body");

    expect(result.status).toBe("sent");
    expect(result.messageId).toBe("email-abc123");
    expect(JSON.stringify(result)).not.toContain("SECRET_RESEND_KEY");
  });

  it("returns failed without leaking API key on error", async () => {
    vi.stubEnv("RESEND_API_KEY", "SECRET_RESEND_KEY");
    vi.stubEnv("OPS_ALERT_EMAIL_FROM", "ops@school-iraq.com");
    vi.stubEnv("OPS_ALERT_EMAIL_TO", "admin@school-iraq.com");
    vi.stubEnv("OPS_EMAIL_ENABLED", "true");

    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ name: "validation_error", message: "invalid from" }),
        { status: 422 },
      ),
    ) as typeof fetch;

    const result = await sendOpsEmail("subject", "body");

    expect(result.status).toBe("failed");
    expect(result.reason).toBe("request_failed");
    expect(JSON.stringify(result)).not.toContain("SECRET_RESEND_KEY");
  });

  it("returns failed on fetch exception without leaking API key", async () => {
    vi.stubEnv("RESEND_API_KEY", "SECRET_RESEND_KEY");
    vi.stubEnv("OPS_ALERT_EMAIL_FROM", "ops@school-iraq.com");
    vi.stubEnv("OPS_ALERT_EMAIL_TO", "admin@school-iraq.com");
    vi.stubEnv("OPS_EMAIL_ENABLED", "true");

    global.fetch = vi.fn(async () => {
      throw new Error("fetch failed with SECRET_RESEND_KEY");
    }) as typeof fetch;

    const result = await sendOpsEmail("subject", "body");

    expect(result.status).toBe("failed");
    expect(JSON.stringify(result)).not.toContain("SECRET_RESEND_KEY");
  });
});
