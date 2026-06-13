import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockState = vi.hoisted(() => ({
  serviceClient: null as unknown,
  redisGet: vi.fn(async () => null),
  rateLimitSnapshot: {
    production: true,
    upstashConfigured: true,
    failOpenEnabled: true,
    todo: "Replace fail-open with alert-backed resilient limiter before high traffic",
  },
}));

vi.mock("@/lib/supabase-server", () => ({
  createServiceSupabaseClient: vi.fn(() => mockState.serviceClient),
}));

vi.mock("@/lib/rate-limit", () => ({
  getRateLimitOpsSnapshot: vi.fn(() => mockState.rateLimitSnapshot),
}));

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(function Redis(this: { get: typeof mockState.redisGet }) {
    this.get = mockState.redisGet;
  }),
}));

import { isAuthorizedHealthRequest, resolveHealthAccessMode } from "@/lib/ops-health";
import { buildOpsReport, checkSubscriptions, checkSupabaseDatabase, classifyOpsStatus } from "@/lib/ops/health-monitor";

function makeRequest(headers: Record<string, string>) {
  return {
    headers: {
      get(name: string) {
        const normalized = name.toLowerCase();
        const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === normalized);
        return entry?.[1] ?? null;
      },
    },
  };
}

function createListResult(data: unknown, error: unknown = null) {
  return Promise.resolve({ data, error });
}

function createQueryBuilder(result: { data: unknown; error: unknown }) {
  return {
    order: vi.fn(() => createListResult(result.data, result.error)),
    limit: vi.fn(() => createListResult(result.data, result.error)),
    maybeSingle: vi.fn(async () => result),
  };
}

function createServiceClient(options?: {
  schoolsHead?: { data?: unknown; error?: unknown; count?: number | null };
  schoolsList?: { data?: unknown; error?: unknown };
  subscriptionsList?: { data?: unknown; error?: unknown };
  listUsersError?: unknown;
  buckets?: Array<{ name: string }>;
  bucketsError?: unknown;
}) {
  return {
    auth: {
      admin: {
        listUsers: vi.fn(async () => ({
          data: { users: [] },
          error: options?.listUsersError ?? null,
        })),
      },
    },
    storage: {
      listBuckets: vi.fn(async () => ({
        data: options?.buckets ?? [{ name: "school-logos" }, { name: "branch-logos" }],
        error: options?.bucketsError ?? null,
      })),
    },
    from: vi.fn((table: string) => ({
      select: vi.fn((_query?: string, selectOptions?: { head?: boolean; count?: string }) => {
        if (table === "schools" && selectOptions?.head) {
          return {
            limit: vi.fn(async () => ({
              data: options?.schoolsHead?.data ?? null,
              error: options?.schoolsHead?.error ?? null,
              count: options?.schoolsHead?.count ?? 1,
            })),
          };
        }

        if (table === "schools") {
          return createListResult(options?.schoolsList?.data ?? [{ id: "school-1", name: "School A", is_active: true }], options?.schoolsList?.error ?? null);
        }

        if (table === "subscriptions") {
          return createQueryBuilder({
            data:
              options?.subscriptionsList?.data ?? [
                {
                  id: "sub-1",
                  school_id: "school-1",
                  plan: "basic",
                  status: "active",
                  start_date: "2026-01-01",
                  end_date: "2026-12-31",
                  created_at: "2026-01-01T00:00:00.000Z",
                },
              ],
            error: options?.subscriptionsList?.error ?? null,
          });
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    })),
  };
}

describe("ops health access", () => {
  it("allows public access outside production when no token is configured", () => {
    expect(resolveHealthAccessMode(null, false)).toBe("public");
    expect(isAuthorizedHealthRequest(makeRequest({}), null, false)).toBe(true);
  });

  it("disables access in production when no token is configured", () => {
    expect(resolveHealthAccessMode(null, true)).toBe("disabled");
    expect(isAuthorizedHealthRequest(makeRequest({}), null, true)).toBe(false);
  });

  it("authorizes requests that provide the matching x-health-token header", () => {
    expect(
      isAuthorizedHealthRequest(
        makeRequest({ "x-health-token": "QA_TEST_HEALTHCHECK_TOKEN_1234567890" }),
        "QA_TEST_HEALTHCHECK_TOKEN_1234567890",
        true,
      ),
    ).toBe(true);
  });

  it("authorizes requests that provide the matching bearer token", () => {
    expect(
      isAuthorizedHealthRequest(
        makeRequest({ authorization: "Bearer QA_TEST_HEALTHCHECK_TOKEN_1234567890" }),
        "QA_TEST_HEALTHCHECK_TOKEN_1234567890",
        true,
      ),
    ).toBe(true);
  });

  it("rejects mismatched tokens without exposing configuration", () => {
    expect(
      isAuthorizedHealthRequest(
        makeRequest({ "x-health-token": "QA_TEST_WRONG_TOKEN_1234567890" }),
        "QA_TEST_HEALTHCHECK_TOKEN_1234567890",
        true,
      ),
    ).toBe(false);
  });
});

describe("ops monitoring", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockState.serviceClient = createServiceClient();
    mockState.redisGet.mockResolvedValue(null);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    global.fetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url === "https://school-iraq.com") {
        return new Response(null, {
          status: 307,
          headers: { location: "/ar", "x-vercel-id": "ops::test" },
        });
      }

      if (url === "https://school-iraq.com/ar/login" || url === "https://appschoolmustafa2002.vercel.app") {
        return new Response("ok", {
          status: 200,
          headers: { "x-vercel-id": "ops::test" },
        });
      }

      return new Response("ok", { status: 200 });
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("builds a report without leaking secrets", async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "SECRET_TOKEN_SHOULD_NOT_LEAK";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "SECRET_SERVICE_ROLE_SHOULD_NOT_LEAK";

    const report = await buildOpsReport();
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("healthy");
    expect(report.score).toBeGreaterThanOrEqual(90);
    expect(serialized).not.toContain("SECRET_TOKEN_SHOULD_NOT_LEAK");
    expect(serialized).not.toContain("SECRET_SERVICE_ROLE_SHOULD_NOT_LEAK");
  });

  it("keeps building the report when the domain check fails", async () => {
    global.fetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://school-iraq.com" || url === "https://school-iraq.com/ar/login") {
        throw new Error("domain offline");
      }

      return new Response("ok", {
        status: 200,
        headers: { "x-vercel-id": "ops::test" },
      });
    }) as typeof fetch;

    const report = await buildOpsReport();

    expect(report.checks.domain.status).toBe("down");
    expect(report.checks.vercel.status).toBe("degraded");
    expect(report.summary).toContain("الحالة العامة");
  });

  it("marks the database check degraded when schema is unclear", async () => {
    const result = await checkSupabaseDatabase(
      createServiceClient({
        schoolsHead: {
          error: new Error('relation "schools" does not exist'),
        },
      }) as Parameters<typeof checkSupabaseDatabase>[0],
    );

    expect(result.status).toBe("degraded");
    expect(result.ok).toBe(false);
  });

  it("marks subscription checks degraded when schema is unclear", async () => {
    const result = await checkSubscriptions(
      createServiceClient({
        subscriptionsList: {
          error: new Error('relation "subscriptions" does not exist'),
        },
      }) as Parameters<typeof checkSubscriptions>[0],
    );

    expect(result.status).toBe("degraded");
    expect(result.snapshot.active_count).toBeNull();
  });

  it("classifies a mixed report as degraded and lowers the score logically", async () => {
    mockState.serviceClient = createServiceClient({
      subscriptionsList: {
        data: [
          {
            id: "sub-1",
            school_id: "school-1",
            plan: "basic",
            status: "active",
            start_date: "2026-01-01",
            end_date: "2026-04-26",
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
    });

    const report = await buildOpsReport();

    expect(classifyOpsStatus(report.checks)).toBe("degraded");
    expect(report.checks.subscriptions.status).toBe("degraded");
    expect(report.score).toBeLessThan(100);
  });
});
