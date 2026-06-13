import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock server-only and supabase before importing the module
vi.mock("server-only", () => ({}));

const _mockInsert = vi.fn();
const _mockUpdate = vi.fn();
const _mockSelect = vi.fn();

const mockState = vi.hoisted(() => ({
  sendTelegramMessage: vi.fn(),
  createServiceSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/ops/telegram", () => ({
  sendTelegramMessage: mockState.sendTelegramMessage,
}));

vi.mock("@/lib/supabase-server", () => ({
  createServiceSupabaseClient: mockState.createServiceSupabaseClient,
}));

function makeMockDb(existingRecord: unknown = null, insertError: unknown = null) {
  const maybeSingle = vi.fn(async () => ({ data: existingRecord, error: null }));
  const limit = vi.fn(() => ({ maybeSingle }));
  const eq1 = vi.fn(() => ({ eq: eq2, gte: vi.fn(() => ({ eq: vi.fn(() => ({ limit })) })), limit }));
  function eq2(_field: string, _value: unknown) {
    return { eq: eq2, gte: vi.fn(() => ({ eq: vi.fn(() => ({ limit })) })), limit };
  }
  const select = vi.fn(() => ({ eq: eq1 }));

  const updateEq = vi.fn(async () => ({ error: null }));
  const update = vi.fn(() => ({ eq: updateEq }));

  const insert = vi.fn(async () => ({ error: insertError }));

  return {
    from: vi.fn((table: string) => {
      if (table === "ops_errors") {
        return { select, insert, update };
      }
      return { select, insert, update };
    }),
  };
}

describe("sanitizeError", () => {
  it("removes JWT tokens", async () => {
    const { sanitizeError } = await import("@/lib/ops/error-capture");
    const input = "error with token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    const result = sanitizeError(input);
    expect(result).not.toMatch(/eyJ[a-zA-Z0-9._-]{20,}/);
    expect(result).toContain("[REDACTED]");
  });

  it("removes Authorization header values", async () => {
    const { sanitizeError } = await import("@/lib/ops/error-capture");
    const input = "Authorization: Bearer mysecrettoken12345";
    const result = sanitizeError(input);
    expect(result).not.toContain("mysecrettoken12345");
    expect(result).toContain("[REDACTED]");
  });

  it("removes password patterns", async () => {
    const { sanitizeError } = await import("@/lib/ops/error-capture");
    const input = 'error: password="superSecret123" not matching';
    const result = sanitizeError(input);
    expect(result).not.toContain("superSecret123");
  });

  it("removes env-style key=value patterns", async () => {
    const { sanitizeError } = await import("@/lib/ops/error-capture");
    const input = "SUPABASE_KEY=abcdefghijklmnop failed";
    const result = sanitizeError(input);
    expect(result).not.toContain("abcdefghijklmnop");
    expect(result).toContain("[ENV_REDACTED]");
  });

  it("handles Error objects", async () => {
    const { sanitizeError } = await import("@/lib/ops/error-capture");
    const err = new Error("simple error message");
    expect(sanitizeError(err)).toBe("simple error message");
  });

  it("handles null and undefined without throwing", async () => {
    const { sanitizeError } = await import("@/lib/ops/error-capture");
    // null ?? "" = "" so String("") = ""
    expect(typeof sanitizeError(null)).toBe("string");
    expect(typeof sanitizeError(undefined)).toBe("string");
  });

  it("truncates long strings to 2000 chars", async () => {
    const { sanitizeError } = await import("@/lib/ops/error-capture");
    const long = "a".repeat(5000);
    expect(sanitizeError(long).length).toBeLessThanOrEqual(2000);
  });
});

describe("classifySeverity", () => {
  it("returns critical for 500 status", async () => {
    const { classifySeverity } = await import("@/lib/ops/error-capture");
    expect(classifySeverity({ status_code: 500 })).toBe("critical");
  });

  it("returns warning for 403 status", async () => {
    const { classifySeverity } = await import("@/lib/ops/error-capture");
    expect(classifySeverity({ status_code: 403 })).toBe("warning");
  });

  it("returns warning for 401 status", async () => {
    const { classifySeverity } = await import("@/lib/ops/error-capture");
    expect(classifySeverity({ status_code: 401 })).toBe("warning");
  });

  it("returns warning for storage source", async () => {
    const { classifySeverity } = await import("@/lib/ops/error-capture");
    expect(classifySeverity({ source: "storage" })).toBe("warning");
  });

  it("returns warning for RLS message", async () => {
    const { classifySeverity } = await import("@/lib/ops/error-capture");
    expect(classifySeverity({ error_message: "new row violates row-level security policy" })).toBe("warning");
  });

  it("returns critical for supabase source with timeout", async () => {
    const { classifySeverity } = await import("@/lib/ops/error-capture");
    expect(classifySeverity({ source: "supabase", error_message: "connection timeout" })).toBe("critical");
  });

  it("returns info for generic 200 errors", async () => {
    const { classifySeverity } = await import("@/lib/ops/error-capture");
    expect(classifySeverity({ error_message: "validation failed" })).toBe("info");
  });
});

describe("buildFixPrompt", () => {
  it("includes key error fields", async () => {
    const { buildFixPrompt } = await import("@/lib/ops/error-capture");
    const prompt = buildFixPrompt({
      severity: "critical",
      source: "api",
      route: "/api/web/attendance/students",
      method: "POST",
      status_code: 500,
      error_message: "Internal server error",
      user_role: "branch_admin",
      occurrence_count: 3,
    });

    expect(prompt).toContain("school-iraq.com");
    expect(prompt).toContain("severity: critical");
    expect(prompt).toContain("/api/web/attendance/students");
    expect(prompt).toContain("500");
    expect(prompt).toContain("branch_admin");
    expect(prompt).toContain("npx vercel --prod");
    expect(prompt).toContain("npm run lint");
  });

  it("masks school_id and branch_id", async () => {
    const { buildFixPrompt } = await import("@/lib/ops/error-capture");
    const prompt = buildFixPrompt({
      error_message: "error",
      school_id: "secret-school-uuid",
      branch_id: "secret-branch-uuid",
    });
    expect(prompt).not.toContain("secret-school-uuid");
    expect(prompt).not.toContain("secret-branch-uuid");
    expect(prompt).toContain("[masked]");
  });

  it("does not include stack in safe prompt", async () => {
    const { buildFixPrompt } = await import("@/lib/ops/error-capture");
    const prompt = buildFixPrompt({
      error_message: "error",
      safe_stack: null,
    });
    expect(prompt).not.toContain("```");
  });
});

describe("captureOpsError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockState.sendTelegramMessage.mockResolvedValue({ provider: "telegram", status: "sent" });
  });

  it("does not throw if DB insert fails", async () => {
    mockState.createServiceSupabaseClient.mockReturnValue(
      makeMockDb(null, { message: "DB error" }),
    );
    const { captureOpsError } = await import("@/lib/ops/error-capture");

    await expect(
      captureOpsError({
        source: "api",
        error_message: "test error",
        status_code: 500,
      }),
    ).resolves.not.toThrow();
  });

  it("sends Telegram for critical severity", async () => {
    mockState.createServiceSupabaseClient.mockReturnValue(makeMockDb(null, null));
    const { captureOpsError } = await import("@/lib/ops/error-capture");

    await captureOpsError({
      source: "api",
      error_message: "server crash",
      status_code: 500,
      severity: "critical",
    });

    // Give fire-and-forget a tick
    await new Promise((r) => setTimeout(r, 10));
    expect(mockState.sendTelegramMessage).toHaveBeenCalled();
  });

  it("does not send Telegram for info severity", async () => {
    mockState.createServiceSupabaseClient.mockReturnValue(makeMockDb(null, null));
    const { captureOpsError } = await import("@/lib/ops/error-capture");

    await captureOpsError({
      source: "frontend",
      error_message: "minor UI glitch",
      severity: "info",
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(mockState.sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("response in captured data does not contain secrets", async () => {
    let capturedInsertData: unknown = null;
    const mockDb = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                eq: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
                  })),
                })),
              })),
            })),
          })),
        })),
        insert: vi.fn(async (data: unknown) => {
          capturedInsertData = data;
          return { error: null };
        }),
      })),
    };
    mockState.createServiceSupabaseClient.mockReturnValue(mockDb);

    const { captureOpsError } = await import("@/lib/ops/error-capture");
    await captureOpsError({
      source: "api",
      error_message: "Authorization: Bearer supersecret token value",
      status_code: 401,
    });

    const insertedStr = JSON.stringify(capturedInsertData);
    expect(insertedStr).not.toContain("supersecret");
  });
});
