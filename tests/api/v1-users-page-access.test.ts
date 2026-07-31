import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// vi.mock factories are hoisted above the file body, so the doubles they close
// over have to be created by vi.hoisted() rather than plain top-level consts.
const { resolveSchoolScopedActorContextMock, createServiceSupabaseClientMock } = vi.hoisted(
  () => ({
    resolveSchoolScopedActorContextMock: vi.fn(),
    createServiceSupabaseClientMock: vi.fn(),
  }),
);

vi.mock("@/lib/managed-users-server", () => ({
  resolveSchoolScopedActorContext: resolveSchoolScopedActorContextMock,
}));

vi.mock("@/lib/supabase-server", () => ({
  createServiceSupabaseClient: createServiceSupabaseClientMock,
}));

import { POST } from "@/app/api/v1/users/route";

const SCHOOL_ID = "11111111-1111-4111-8111-111111111111";
const ROLE_ID = "22222222-2222-4222-8222-222222222222";
const AUTH_USER_ID = "33333333-3333-4333-8333-333333333333";

type Insert = { table: string; rows: unknown };

/**
 * Page scope lives in user_page_access — `allowed_pages` is NOT a column on
 * user_profiles (it is derived at snapshot time), so the only way the roles UI
 * page picker can actually persist is one row per granted page. Before this was
 * fixed the route accepted allowed_pages and silently discarded it.
 */
function makeService(inserts: Insert[], failPageAccessInsert = false) {
  const deletes: Array<{ table: string; column: string; value: unknown }> = [];

  return {
    deletes,
    auth: {
      admin: {
        createUser: vi.fn(async () => ({ data: { user: { id: AUTH_USER_ID } }, error: null })),
        deleteUser: vi.fn(async () => ({ error: null })),
      },
    },
    from(table: string) {
      const api: Record<string, unknown> = {
        select: () => api,
        eq: () => api,
        maybeSingle: async () => ({
          data: table === "school_roles" ? { id: ROLE_ID } : null,
          error: null,
        }),
        single: async () => ({ data: { id: AUTH_USER_ID, school_id: SCHOOL_ID }, error: null }),
        delete: () => ({
          eq: async (column: string, value: unknown) => {
            deletes.push({ table, column, value });
            return { error: null };
          },
        }),
        insert(rows: unknown) {
          inserts.push({ table, rows });
          if (table === "user_page_access" && failPageAccessInsert) {
            return Promise.resolve({ error: { message: "insert failed" } });
          }
          return {
            select: () => ({
              single: async () => ({
                data: { id: AUTH_USER_ID, school_id: SCHOOL_ID },
                error: null,
              }),
            }),
            then: (onF: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(onF),
          };
        },
      };
      return api;
    },
  };
}

function request(allowedPages: string[]) {
  return new Request("http://localhost/api/v1/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      full_name: "Test Employee",
      email: "employee@example.invalid",
      password: "placeholder-pw",
      school_role_id: ROLE_ID,
      allowed_pages: allowedPages,
    }),
  }) as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  resolveSchoolScopedActorContextMock.mockResolvedValue({
    ok: true,
    value: { targetSchoolId: SCHOOL_ID, actorBranchId: null },
  });
});

describe("POST /api/v1/users page grants", () => {
  it("persists the requested pages into user_page_access", async () => {
    const inserts: Insert[] = [];
    createServiceSupabaseClientMock.mockReturnValue(makeService(inserts));

    const response = await POST(request(["students", "payments"]));
    expect(response.status).toBe(201);

    const grantInsert = inserts.find((entry) => entry.table === "user_page_access");
    expect(grantInsert, "the page picker must not be silently discarded").toBeTruthy();

    const rows = grantInsert!.rows as Array<Record<string, unknown>>;
    expect(rows.map((row) => row.page_code).sort()).toEqual(["payments", "students"]);
    expect(rows.every((row) => row.user_id === AUTH_USER_ID)).toBe(true);
    expect(rows.every((row) => row.school_id === SCHOOL_ID)).toBe(true);
    expect(rows.every((row) => row.can_view === true)).toBe(true);
  });

  it("marks a single-page user on the profile", async () => {
    const inserts: Insert[] = [];
    createServiceSupabaseClientMock.mockReturnValue(makeService(inserts));

    await POST(request(["students"]));

    const profileInsert = inserts.find((entry) => entry.table === "user_profiles");
    expect((profileInsert!.rows as Record<string, unknown>).is_single_page_user).toBe(true);
  });

  it("drops unknown page codes instead of storing them", async () => {
    const inserts: Insert[] = [];
    createServiceSupabaseClientMock.mockReturnValue(makeService(inserts));

    await POST(request(["students", "not-a-real-page"]));

    const grantInsert = inserts.find((entry) => entry.table === "user_page_access");
    const rows = grantInsert!.rows as Array<Record<string, unknown>>;
    expect(rows.map((row) => row.page_code)).toEqual(["students"]);
  });

  it("writes no grant rows when no pages were requested", async () => {
    const inserts: Insert[] = [];
    createServiceSupabaseClientMock.mockReturnValue(makeService(inserts));

    await POST(request([]));

    expect(inserts.find((entry) => entry.table === "user_page_access")).toBeUndefined();
  });

  it("rolls the account back when the grants cannot be saved", async () => {
    const inserts: Insert[] = [];
    const service = makeService(inserts, true);
    createServiceSupabaseClientMock.mockReturnValue(service);

    const response = await POST(request(["students"]));

    expect(response.status).toBe(500);
    expect(service.deletes.some((entry) => entry.table === "user_profiles")).toBe(true);
    expect(service.auth.admin.deleteUser).toHaveBeenCalledWith(AUTH_USER_ID);
  });
});
