import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveMobileRouteContext = vi.hoisted(() => vi.fn());
const buildMobileSessionPayload = vi.hoisted(() => vi.fn());

vi.mock("@/lib/mobile-api-server", () => ({
  resolveMobileRouteContext,
  buildMobileSessionPayload,
}));

async function importRoute() {
  return import("@/app/api/mobile/session/route");
}

describe("GET /api/mobile/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("forwards authorization failures from the mobile route context", async () => {
    resolveMobileRouteContext.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: {
            message: "يجب تسجيل الدخول أولاً.",
          },
        },
        { status: 401 },
      ),
    });

    const { GET } = await importRoute();
    const response = await GET(new NextRequest("http://localhost/api/mobile/session"));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error.message).toContain("تسجيل الدخول");
    expect(buildMobileSessionPayload).not.toHaveBeenCalled();
  });

  it("returns the normalized mobile account payload for authenticated users", async () => {
    resolveMobileRouteContext.mockResolvedValue({
      ok: true,
      value: {
        account: {
          identity: {
            role: "student",
          },
        },
      },
    });
    buildMobileSessionPayload.mockReturnValue({
      role: "student",
      school_id: "school-1",
    });

    const { GET } = await importRoute();
    const response = await GET(new NextRequest("http://localhost/api/mobile/session"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      account: {
        role: "student",
        school_id: "school-1",
      },
    });
    expect(buildMobileSessionPayload).toHaveBeenCalledWith({
      identity: {
        role: "student",
      },
    });
  });
});
