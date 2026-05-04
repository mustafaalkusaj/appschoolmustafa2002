import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveSuperAdminActorContext = vi.fn();

vi.mock("@/lib/super-admin-server", () => ({
  resolveSuperAdminActorContext,
}));

describe("GET /api/web/super-admin/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-super-admin access", async () => {
    const { GET } = await import("@/app/api/web/super-admin/health/route");

    resolveSuperAdminActorContext.mockResolvedValue({
      ok: false,
      status: 401,
      message: "غير مصرح",
    });

    const request = new NextRequest("http://localhost/api/web/super-admin/health");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error.message).toBe("غير مصرح");
  });
});
