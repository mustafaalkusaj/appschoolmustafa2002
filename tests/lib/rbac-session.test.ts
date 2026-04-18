import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const TEST_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  RBAC_COOKIE_SECRET: "12345678901234567890123456789012",
};

describe("rbac session", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, TEST_ENV);
  });

  it("compacts default role permissions and restores them after verification", async () => {
    const { buildTemplatePermissions } = await import("@/types/roles");
    const { buildRBACSessionPayload, signRBACSession, verifyRBACSession } = await import("@/lib/rbac-session");

    const payload = buildRBACSessionPayload({
      role: "super_admin",
      permissions: buildTemplatePermissions("super_admin"),
      schoolId: null,
      userActive: true,
      schoolActive: true,
      subscriptionStatus: null,
      subscriptionEnd: null,
    });

    expect(payload.permissions).toEqual([]);

    const token = await signRBACSession(payload);
    expect(token).toBeTruthy();

    const verified = await verifyRBACSession(token);
    expect(verified?.permissions).toEqual(buildTemplatePermissions("super_admin"));
  });

  it("preserves custom permission sets that differ from role defaults", async () => {
    const { buildRBACSessionPayload, signRBACSession, verifyRBACSession } = await import("@/lib/rbac-session");

    const payload = buildRBACSessionPayload({
      role: "admin",
      permissions: ["view_students", "view_payments"],
      schoolId: "school-1",
      userActive: true,
      schoolActive: true,
      subscriptionStatus: "active",
      subscriptionEnd: "2026-12-31",
    });

    expect(payload.permissions).toEqual(["view_students", "view_payments"]);

    const token = await signRBACSession(payload);
    expect(token).toBeTruthy();

    const verified = await verifyRBACSession(token);
    expect(verified?.permissions).toEqual(["view_students", "view_payments"]);
  });
});
