import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  getRecentOpsErrors: vi.fn(),
  getOpsErrorById: vi.fn(),
  updateOpsErrorStatus: vi.fn(),
}));

vi.mock("@/lib/ops/error-capture", () => ({
  getRecentOpsErrors: mockState.getRecentOpsErrors,
  getOpsErrorById: mockState.getOpsErrorById,
  updateOpsErrorStatus: mockState.updateOpsErrorStatus,
  captureOpsError: vi.fn(async () => {}),
}));

vi.mock("server-only", () => ({}));

function baseError() {
  return {
    id: "error-1",
    created_at: "2026-04-26T00:00:00.000Z",
    environment: "production",
    severity: "critical" as const,
    status: "open" as const,
    source: "api",
    route: "/api/web/attendance/students",
    method: "POST",
    page_url: null,
    action: null,
    user_role: "branch_admin",
    school_id: null,
    branch_id: null,
    auth_user_id: null,
    status_code: 500,
    error_code: null,
    error_message: "Internal Server Error",
    safe_stack: null,
    request_id: null,
    deployment_id: null,
    user_agent: null,
    metadata: {},
    fix_prompt: "أريدك تصلح خطأ إنتاج في مشروع school-iraq.com.",
    last_seen_at: "2026-04-26T00:00:00.000Z",
    occurrence_count: 1,
  };
}

describe("GET /api/ops/errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("OPS_ALERT_TOKEN", "QA_TEST_OPS_ALERT_TOKEN");
    mockState.getRecentOpsErrors.mockResolvedValue([baseError()]);
  });

  it("denies without token", async () => {
    const { GET } = await import("@/app/api/ops/errors/route");
    const res = await GET(new NextRequest("http://localhost/api/ops/errors"));
    expect([401, 403, 404]).toContain(res.status);
  });

  it("returns errors list with valid token", async () => {
    const { GET } = await import("@/app/api/ops/errors/route");
    const res = await GET(
      new NextRequest(
        "http://localhost/api/ops/errors?token=QA_TEST_OPS_ALERT_TOKEN",
      ),
    );
    const payload = await res.json();
    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.errors)).toBe(true);
  });

  it("does not return fix_prompt in list view", async () => {
    const { GET } = await import("@/app/api/ops/errors/route");
    const res = await GET(
      new NextRequest(
        "http://localhost/api/ops/errors?token=QA_TEST_OPS_ALERT_TOKEN",
      ),
    );
    const payload = await res.json();
    const errorItem = payload.errors[0];
    expect(errorItem).toBeDefined();
    expect(errorItem.fix_prompt).toBeUndefined();
  });

  it("does not contain secrets in response", async () => {
    const { GET } = await import("@/app/api/ops/errors/route");
    const res = await GET(
      new NextRequest(
        "http://localhost/api/ops/errors?token=QA_TEST_OPS_ALERT_TOKEN",
      ),
    );
    const text = await res.text();
    expect(text).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(text).not.toContain("OPS_ALERT_TOKEN");
  });
});

describe("GET /api/ops/errors/[errorId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("OPS_ALERT_TOKEN", "QA_TEST_OPS_ALERT_TOKEN");
    mockState.getOpsErrorById.mockResolvedValue(baseError());
  });

  it("denies without token", async () => {
    const { GET } = await import("@/app/api/ops/errors/[errorId]/route");
    const res = await GET(
      new NextRequest("http://localhost/api/ops/errors/error-1"),
      { params: Promise.resolve({ errorId: "error-1" }) },
    );
    expect([401, 403, 404]).toContain(res.status);
  });

  it("returns full error record with fix_prompt", async () => {
    const { GET } = await import("@/app/api/ops/errors/[errorId]/route");
    const res = await GET(
      new NextRequest(
        "http://localhost/api/ops/errors/error-1?token=QA_TEST_OPS_ALERT_TOKEN",
      ),
      { params: Promise.resolve({ errorId: "error-1" }) },
    );
    const payload = await res.json();
    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.error.fix_prompt).toBeTruthy();
  });

  it("returns 404 for non-existent error", async () => {
    mockState.getOpsErrorById.mockResolvedValue(null);
    const { GET } = await import("@/app/api/ops/errors/[errorId]/route");
    const res = await GET(
      new NextRequest(
        "http://localhost/api/ops/errors/nonexistent?token=QA_TEST_OPS_ALERT_TOKEN",
      ),
      { params: Promise.resolve({ errorId: "nonexistent" }) },
    );
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/ops/errors/[errorId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("OPS_ALERT_TOKEN", "QA_TEST_OPS_ALERT_TOKEN");
    mockState.getOpsErrorById.mockResolvedValue(baseError());
    mockState.updateOpsErrorStatus.mockResolvedValue(undefined);
  });

  it("denies without token", async () => {
    const { PATCH } = await import("@/app/api/ops/errors/[errorId]/route");
    const res = await PATCH(
      new NextRequest("http://localhost/api/ops/errors/error-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "fixed" }),
      }),
      { params: Promise.resolve({ errorId: "error-1" }) },
    );
    expect([401, 403, 404]).toContain(res.status);
  });

  it("updates status with valid token", async () => {
    const { PATCH } = await import("@/app/api/ops/errors/[errorId]/route");
    const res = await PATCH(
      new NextRequest(
        "http://localhost/api/ops/errors/error-1?token=QA_TEST_OPS_ALERT_TOKEN",
        {
          method: "PATCH",
          body: JSON.stringify({ status: "fixed" }),
          headers: { "Content-Type": "application/json" },
        },
      ),
      { params: Promise.resolve({ errorId: "error-1" }) },
    );
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("fixed");
  });

  it("rejects invalid status", async () => {
    const { PATCH } = await import("@/app/api/ops/errors/[errorId]/route");
    const res = await PATCH(
      new NextRequest(
        "http://localhost/api/ops/errors/error-1?token=QA_TEST_OPS_ALERT_TOKEN",
        {
          method: "PATCH",
          body: JSON.stringify({ status: "deleted" }),
          headers: { "Content-Type": "application/json" },
        },
      ),
      { params: Promise.resolve({ errorId: "error-1" }) },
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/ops/errors/[errorId]/prompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("OPS_ALERT_TOKEN", "QA_TEST_OPS_ALERT_TOKEN");
    mockState.getOpsErrorById.mockResolvedValue(baseError());
  });

  it("denies without token", async () => {
    const { GET } = await import(
      "@/app/api/ops/errors/[errorId]/prompt/route"
    );
    const res = await GET(
      new NextRequest(
        "http://localhost/api/ops/errors/error-1/prompt",
      ),
      { params: Promise.resolve({ errorId: "error-1" }) },
    );
    expect([401, 403, 404]).toContain(res.status);
  });

  it("returns plain text prompt", async () => {
    const { GET } = await import(
      "@/app/api/ops/errors/[errorId]/prompt/route"
    );
    const res = await GET(
      new NextRequest(
        "http://localhost/api/ops/errors/error-1/prompt?token=QA_TEST_OPS_ALERT_TOKEN",
      ),
      { params: Promise.resolve({ errorId: "error-1" }) },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    const text = await res.text();
    expect(text).toContain("school-iraq.com");
  });
});
