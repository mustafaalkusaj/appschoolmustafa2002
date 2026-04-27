import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  captureOpsError: vi.fn(),
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/ops/error-capture", () => ({
  captureOpsError: mockState.captureOpsError,
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: mockState.enforceRateLimit,
}));

vi.mock("server-only", () => ({}));

describe("POST /api/ops/client-error", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockState.captureOpsError.mockResolvedValue(undefined);
    // Allow all by default
    mockState.enforceRateLimit.mockResolvedValue(null);
  });

  it("accepts valid client error payload", async () => {
    const { POST } = await import("@/app/api/ops/client-error/route");
    const body = JSON.stringify({
      page_url: "/ar/branch-overview",
      action: "add_class",
      error_message: "save class failed",
      status_code: 500,
      user_role: "branch_admin",
    });

    const res = await POST(
      new NextRequest("http://localhost/api/ops/client-error", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.ok).toBe(true);
    expect(mockState.captureOpsError).toHaveBeenCalled();
  });

  it("rejects oversized payload by content-length", async () => {
    const { POST } = await import("@/app/api/ops/client-error/route");
    const res = await POST(
      new NextRequest("http://localhost/api/ops/client-error", {
        method: "POST",
        body: "x",
        headers: {
          "Content-Type": "application/json",
          "content-length": "99999",
        },
      }),
    );
    expect(res.status).toBe(413);
    expect(mockState.captureOpsError).not.toHaveBeenCalled();
  });

  it("rejects oversized body by actual size", async () => {
    const { POST } = await import("@/app/api/ops/client-error/route");
    const bigBody = JSON.stringify({ error_message: "a".repeat(5000) });
    const res = await POST(
      new NextRequest("http://localhost/api/ops/client-error", {
        method: "POST",
        body: bigBody,
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(413);
    expect(mockState.captureOpsError).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON", async () => {
    const { POST } = await import("@/app/api/ops/client-error/route");
    const res = await POST(
      new NextRequest("http://localhost/api/ops/client-error", {
        method: "POST",
        body: "not-json",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    const { NextResponse } = await import("next/server");
    mockState.enforceRateLimit.mockResolvedValue(
      NextResponse.json({ error: "rate_limited" }, { status: 429 }),
    );
    const { POST } = await import("@/app/api/ops/client-error/route");
    const res = await POST(
      new NextRequest("http://localhost/api/ops/client-error", {
        method: "POST",
        body: JSON.stringify({ error_message: "test" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(429);
    expect(mockState.captureOpsError).not.toHaveBeenCalled();
  });

  it("sanitizes captured data - no stack trace from client", async () => {
    mockState.captureOpsError.mockImplementation(async (data: Record<string, unknown>) => {
      expect(data.stack).toBeUndefined();
    });

    const { POST } = await import("@/app/api/ops/client-error/route");
    await POST(
      new NextRequest("http://localhost/api/ops/client-error", {
        method: "POST",
        body: JSON.stringify({
          error_message: "frontend error",
          // Even if client sends stack, it's not forwarded
          stack: "Error: something\n  at Component (/app/page.tsx:1:1)",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("clamps string fields to max length", async () => {
    let capturedInput: Record<string, unknown> | null = null;
    mockState.captureOpsError.mockImplementation(async (data: Record<string, unknown>) => {
      capturedInput = data;
    });

    const { POST } = await import("@/app/api/ops/client-error/route");
    await POST(
      new NextRequest("http://localhost/api/ops/client-error", {
        method: "POST",
        body: JSON.stringify({
          error_message: "e".repeat(2000), // over 500 limit
          action: "a".repeat(1000),         // over 200 limit
          user_role: "r".repeat(200),        // over 50 limit
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect((capturedInput?.error_message as string).length).toBeLessThanOrEqual(500);
    expect((capturedInput?.action as string).length).toBeLessThanOrEqual(200);
    expect((capturedInput?.user_role as string).length).toBeLessThanOrEqual(50);
  });

  it("rejects invalid status_code values", async () => {
    let capturedInput: Record<string, unknown> | null = null;
    mockState.captureOpsError.mockImplementation(async (data: Record<string, unknown>) => {
      capturedInput = data;
    });

    const { POST } = await import("@/app/api/ops/client-error/route");
    await POST(
      new NextRequest("http://localhost/api/ops/client-error", {
        method: "POST",
        body: JSON.stringify({
          error_message: "error",
          status_code: 99999, // invalid
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(capturedInput?.status_code).toBeUndefined();
  });
});
