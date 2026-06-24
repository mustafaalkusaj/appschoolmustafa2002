import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const h = vi.hoisted(() => ({ ctxMock: vi.fn(), results: [] as Array<{ data: unknown; error: unknown }> }));
const ctxMock = h.ctxMock;

vi.mock("@/lib/managed-users-server", () => ({ resolveSchoolScopedActorContext: h.ctxMock }));
vi.mock("@/lib/supabase-server", () => ({
  createServiceSupabaseClient: () => {
    let i = 0;
    const next = () => h.results[i++] ?? { data: null, error: null };
    const b: Record<string, unknown> = {};
    for (const m of ["from", "select", "insert", "update", "delete", "eq", "in", "order"]) b[m] = () => b;
    b.single = () => Promise.resolve(next());
    b.maybeSingle = () => Promise.resolve(next());
    b.then = (resolve: (v: unknown) => void) => resolve(next());
    return b;
  },
}));

import { GET as rolesGET, POST as rolesPOST } from "@/app/api/v1/roles/route";
import { GET as roleGET, DELETE as roleDELETE, PATCH as rolePATCH } from "@/app/api/v1/roles/[roleId]/route";
import { PUT as permsPUT } from "@/app/api/v1/roles/[roleId]/perms/route";
import { GET as roleUsersGET } from "@/app/api/v1/roles/[roleId]/users/route";

const okCtx = { ok: true, value: { targetSchoolId: "s1", actorUserId: "u1", actorRole: "super_admin" } };
const req = (body?: unknown, method = "GET") =>
  new NextRequest("http://localhost/api/v1/roles" + (body ? "/x" : ""), {
    method,
    headers: { "content-type": "application/json", authorization: "Bearer t" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
const P = (roleId = "r1") => ({ params: Promise.resolve({ roleId }) });

beforeEach(() => { h.results = []; ctxMock.mockResolvedValue(okCtx); });

describe("GET /api/v1/roles", () => {
  it("403 when context denied", async () => {
    ctxMock.mockResolvedValue({ ok: false, status: 403, message: "no" });
    expect((await rolesGET(req())).status).toBe(403);
  });
  it("returns roles", async () => {
    h.results = [{ data: [{ id: "r1", key: "acct" }], error: null }];
    const res = await rolesGET(req());
    expect(res.status).toBe(200);
    expect((await res.json()).roles).toHaveLength(1);
  });
  it("500 on db error", async () => {
    h.results = [{ data: null, error: { message: "x" } }];
    expect((await rolesGET(req())).status).toBe(500);
  });
});

describe("POST /api/v1/roles", () => {
  it("400 invalid body", async () => {
    expect((await rolesPOST(req({ key: "A B" }, "POST"))).status).toBe(400);
  });
  it("201 created", async () => {
    h.results = [{ data: { id: "r2", key: "acct", name_ar: "محاسب" }, error: null }];
    expect((await rolesPOST(req({ key: "accountant", name_ar: "محاسب" }, "POST"))).status).toBe(201);
  });
  it("409 duplicate key", async () => {
    h.results = [{ data: null, error: { code: "23505" } }];
    expect((await rolesPOST(req({ key: "accountant", name_ar: "محاسب" }, "POST"))).status).toBe(409);
  });
  it("500 other error", async () => {
    h.results = [{ data: null, error: { code: "x" } }];
    expect((await rolesPOST(req({ key: "accountant", name_ar: "محاسب" }, "POST"))).status).toBe(500);
  });
});

describe("GET /api/v1/roles/[roleId]", () => {
  it("ok with permissionIds", async () => {
    h.results = [{ data: { id: "r1", key: "acct" }, error: null }, { data: [{ permission_id: "p1" }], error: null }];
    const res = await roleGET(req(), P());
    expect(res.status).toBe(200);
    expect((await res.json()).permissionIds).toEqual(["p1"]);
  });
  it("404 when missing", async () => {
    h.results = [{ data: null, error: null }];
    expect((await roleGET(req(), P())).status).toBe(404);
  });
  it("500 on error", async () => {
    h.results = [{ data: null, error: { message: "x" } }];
    expect((await roleGET(req(), P())).status).toBe(500);
  });
});

describe("DELETE /api/v1/roles/[roleId]", () => {
  it("404 missing", async () => {
    h.results = [{ data: null, error: null }];
    expect((await roleDELETE(req(undefined, "DELETE"), P())).status).toBe(404);
  });
  it("403 system role", async () => {
    h.results = [{ data: { is_system: true }, error: null }];
    expect((await roleDELETE(req(undefined, "DELETE"), P())).status).toBe(403);
  });
  it("ok delete", async () => {
    h.results = [{ data: { is_system: false }, error: null }, { data: null, error: null }];
    expect((await roleDELETE(req(undefined, "DELETE"), P())).status).toBe(200);
  });
  it("500 delete error", async () => {
    h.results = [{ data: { is_system: false }, error: null }, { data: null, error: { message: "x" } }];
    expect((await roleDELETE(req(undefined, "DELETE"), P())).status).toBe(500);
  });
});

describe("PATCH /api/v1/roles/[roleId]", () => {
  it("400 invalid", async () => {
    expect((await rolePATCH(req({ color: "notacolor" }, "PATCH"), P())).status).toBe(400);
  });
  it("400 nothing to update", async () => {
    expect((await rolePATCH(req({}, "PATCH"), P())).status).toBe(400);
  });
  it("ok update", async () => {
    h.results = [{ data: { id: "r1", name_ar: "x" }, error: null }];
    expect((await rolePATCH(req({ name_ar: "جديد" }, "PATCH"), P())).status).toBe(200);
  });
  it("500 error", async () => {
    h.results = [{ data: null, error: { message: "x" } }];
    expect((await rolePATCH(req({ name_ar: "جديد" }, "PATCH"), P())).status).toBe(500);
  });
});

describe("PUT /api/v1/roles/[roleId]/perms", () => {
  it("403 denied", async () => {
    ctxMock.mockResolvedValue({ ok: false, status: 403, message: "no" });
    expect((await permsPUT(req({ permissionIds: [] }, "PUT"), P())).status).toBe(403);
  });
  it("400 invalid body", async () => {
    expect((await permsPUT(req({ permissionIds: ["not-a-uuid"] }, "PUT"), P())).status).toBe(400);
  });
  it("404 role not in school", async () => {
    h.results = [{ data: null, error: null }];
    expect((await permsPUT(req({ permissionIds: [] }, "PUT"), P())).status).toBe(404);
  });
  it("ok empty permissionIds (delete only)", async () => {
    h.results = [{ data: { id: "r1" }, error: null }, { data: null, error: null }];
    expect((await permsPUT(req({ permissionIds: [] }, "PUT"), P())).status).toBe(200);
  });
  it("ok with permissionIds (delete+insert)", async () => {
    h.results = [
      { data: { id: "r1" }, error: null },
      { data: [{ id: "11111111-1111-4111-8111-111111111111", key: "students.view" }], error: null },
      { data: null, error: null },
      { data: null, error: null },
    ];
    const res = await permsPUT(req({ permissionIds: ["11111111-1111-4111-8111-111111111111"] }, "PUT"), P());
    expect(res.status).toBe(200);
  });
  it("500 on delete error", async () => {
    h.results = [{ data: { id: "r1" }, error: null }, { data: null, error: { message: "x" } }];
    expect((await permsPUT(req({ permissionIds: [] }, "PUT"), P())).status).toBe(500);
  });
});

describe("GET /api/v1/roles/[roleId]/users", () => {
  it("403 denied", async () => {
    ctxMock.mockResolvedValue({ ok: false, status: 403, message: "no" });
    expect((await roleUsersGET(req(), P())).status).toBe(403);
  });
  it("404 role missing", async () => {
    h.results = [{ data: null, error: null }];
    expect((await roleUsersGET(req(), P())).status).toBe(404);
  });
  it("ok lists users", async () => {
    h.results = [{ data: { id: "r1" }, error: null }, { data: [{ id: "u1", full_name: "A" }], error: null }];
    const res = await roleUsersGET(req(), P());
    expect(res.status).toBe(200);
    expect((await res.json()).users).toHaveLength(1);
  });
  it("500 on users error", async () => {
    h.results = [{ data: { id: "r1" }, error: null }, { data: null, error: { message: "x" } }];
    expect((await roleUsersGET(req(), P())).status).toBe(500);
  });
});
