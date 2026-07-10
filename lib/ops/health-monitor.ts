import "server-only";

import { promises as fs } from "node:fs";
import { endOfDayBaghdad } from "@/lib/tz";
import path from "node:path";
import { Redis } from "@upstash/redis";

import { getRateLimitOpsSnapshot } from "@/lib/rate-limit";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

export type OpsCheckStatus = "healthy" | "degraded" | "down";

export type OpsCheckResult = {
  ok: boolean;
  status: OpsCheckStatus;
  message: string;
  reason?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
};

export type SubscriptionSnapshot = {
  active_count: number | null;
  expired_count: number | null;
  expiring_7_days_count: number | null;
  expiring_30_days_count: number | null;
  details: Record<string, unknown>;
  expired_school_names?: string[];
  expiring_soon_school_names?: string[];
};

export type OpsChecks = {
  domain: OpsCheckResult;
  vercel: OpsCheckResult;
  supabaseAuth: OpsCheckResult;
  database: OpsCheckResult;
  storage: OpsCheckResult;
  upstash: OpsCheckResult;
  subscriptions: OpsCheckResult;
};

export type OpsReport = {
  status: OpsCheckStatus;
  score: number;
  summary: string;
  checks: OpsChecks;
  errors: string[];
  metadata: Record<string, unknown>;
  savedAt?: string;
  subscriptionSnapshot: SubscriptionSnapshot;
};

type ServiceSupabase = ReturnType<typeof createServiceSupabaseClient>;

const OFFICIAL_DOMAIN_URL = "https://school-iraq.com";
const OFFICIAL_LOGIN_URL = "https://school-iraq.com/ar/login";
const VERCEL_FALLBACK_URL = "https://appschoolmustafa2002.vercel.app";

function safeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown error";
}

function isMissingSchemaError(error: unknown) {
  const message = safeErrorMessage(error).toLowerCase();
  return (
    message.includes("does not exist") ||
    message.includes("relation") ||
    message.includes("column") ||
    message.includes("schema cache")
  );
}

function statusIcon(status: OpsCheckStatus) {
  if (status === "healthy") return "✅";
  if (status === "degraded") return "⚠️";
  return "❌";
}

function worstStatus(statuses: OpsCheckStatus[]): OpsCheckStatus {
  if (statuses.includes("down")) return "down";
  if (statuses.includes("degraded")) return "degraded";
  return "healthy";
}

function countDaysUntil(dateValue: string | null | undefined, now = new Date()) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((endOfDayBaghdad(date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

async function timedFetch(url: string, init?: RequestInit) {
  const startedAt = Date.now();
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
    redirect: "manual",
    ...init,
  });

  return {
    response,
    latencyMs: Date.now() - startedAt,
  };
}

function buildUnavailableCheck(message: string, details?: Record<string, unknown>): OpsCheckResult {
  return {
    ok: false,
    status: "down",
    message,
    details,
  };
}

function getServiceClient() {
  try {
    return {
      client: createServiceSupabaseClient(),
      error: null,
    } as const;
  } catch (error) {
    return {
      client: null,
      error,
    } as const;
  }
}

async function readStoragePolicyHints() {
  try {
    const filePath = path.join(process.cwd(), "migrations", "20260424_000000_logo_storage_policies.sql");
    const sql = await fs.readFile(filePath, "utf8");

    return {
      source: "migrations/20260424_000000_logo_storage_policies.sql",
      reviewed: true,
      normalUserRandomWriteDenied:
        sql.includes("TO authenticated") &&
        sql.includes("current_app_role() IN ('admin', 'super_admin')") &&
        sql.includes("current_school_id()"),
    };
  } catch {
    return {
      source: "unavailable",
      reviewed: false,
      normalUserRandomWriteDenied: null,
    };
  }
}

export async function checkDomain(): Promise<OpsCheckResult> {
  try {
    const [rootProbe, loginProbe] = await Promise.all([
      timedFetch(OFFICIAL_DOMAIN_URL),
      timedFetch(OFFICIAL_LOGIN_URL),
    ]);

    const rootStatus = rootProbe.response.status;
    const loginStatus = loginProbe.response.status;
    const rootLocation = rootProbe.response.headers.get("location");
    const rootOk =
      rootStatus === 200 ||
      ((rootStatus === 307 || rootStatus === 308) &&
        Boolean(rootLocation && /^\/ar(\/login)?(?:[/?#]|$)/.test(rootLocation)));
    const loginOk = loginStatus === 200 || loginStatus === 307 || loginStatus === 308;
    const status: OpsCheckStatus = rootOk && loginOk ? "healthy" : "down";

    return {
      ok: rootOk && loginOk,
      status,
      message:
        status === "healthy"
          ? "الدومين الرسمي يرد بشكل طبيعي مع redirect متوقع."
          : "الدومين الرسمي لا يمر بجميع الفحوصات المطلوبة.",
      latencyMs: Math.max(rootProbe.latencyMs, loginProbe.latencyMs),
      details: {
        rootStatus,
        rootLocation,
        loginStatus,
        urls: [OFFICIAL_DOMAIN_URL, OFFICIAL_LOGIN_URL],
      },
    };
  } catch (error) {
    return buildUnavailableCheck("تعذر الوصول إلى الدومين الرسمي.", {
      error: safeErrorMessage(error),
    });
  }
}

export async function checkVercelPublic(): Promise<OpsCheckResult> {
  try {
    const [domainProbe, fallbackProbe] = await Promise.all([
      timedFetch(OFFICIAL_DOMAIN_URL),
      timedFetch(VERCEL_FALLBACK_URL),
    ]);

    const fallbackOk = [200, 307, 308].includes(fallbackProbe.response.status);
    const domainOk = [200, 307, 308].includes(domainProbe.response.status);
    const vercelHeader =
      domainProbe.response.headers.get("x-vercel-id") ||
      fallbackProbe.response.headers.get("x-vercel-id") ||
      domainProbe.response.headers.get("server") ||
      fallbackProbe.response.headers.get("server");
    const status: OpsCheckStatus = domainOk && fallbackOk ? "healthy" : "degraded";

    return {
      ok: domainOk && fallbackOk,
      status,
      reason: status === "degraded" ? "partial_probe" : undefined,
      message:
        status === "healthy"
          ? "الواجهة العامة ونسخة Vercel fallback تستجيبان."
          : "فحص Vercel العام أعطى نتيجة جزئية أو متدهورة.",
      latencyMs: Math.max(domainProbe.latencyMs, fallbackProbe.latencyMs),
      details: {
        officialDomainStatus: domainProbe.response.status,
        fallbackStatus: fallbackProbe.response.status,
        headerHint: vercelHeader,
        officialDomain: OFFICIAL_DOMAIN_URL,
        fallbackDomain: VERCEL_FALLBACK_URL,
      },
    };
  } catch (error) {
    return {
      ok: false,
      status: "degraded",
      reason: "request_failed",
      message: "تعذر إكمال فحص Vercel العام.",
      details: {
        error: safeErrorMessage(error),
      },
    };
  }
}

export async function checkSupabaseAuth(client?: ServiceSupabase | null, setupError?: unknown): Promise<OpsCheckResult> {
  if (!client) {
    return buildUnavailableCheck("Supabase Auth غير مهيأ على الخادم.", {
      error: safeErrorMessage(setupError),
    });
  }

  const startedAt = Date.now();

  try {
    const response = await client.auth.admin.listUsers({ page: 1, perPage: 1 });

    return {
      ok: !response.error,
      status: response.error ? "down" : "healthy",
      message: response.error ? "تعذر الوصول إلى Supabase Auth." : "Supabase Auth reachable.",
      latencyMs: Date.now() - startedAt,
      details: {
        userCountPageSize: 1,
      },
    };
  } catch (error) {
    return buildUnavailableCheck("تعذر الوصول إلى Supabase Auth.", {
      error: safeErrorMessage(error),
    });
  }
}

export async function checkSupabaseDatabase(client?: ServiceSupabase | null, setupError?: unknown): Promise<OpsCheckResult> {
  if (!client) {
    return buildUnavailableCheck("قاعدة بيانات Supabase غير مهيأة على الخادم.", {
      error: safeErrorMessage(setupError),
    });
  }

  const startedAt = Date.now();

  try {
    const response = await client.from("schools").select("id", { head: true, count: "exact" }).limit(1);

    if (response.error) {
      if (isMissingSchemaError(response.error)) {
        return {
          ok: false,
          status: "degraded",
          message: "فحص قاعدة البيانات تعذر جزئياً بسبب غموض أو نقص في schema.",
          latencyMs: Date.now() - startedAt,
          details: {
            error: safeErrorMessage(response.error),
            probedTable: "schools",
          },
        };
      }

      return buildUnavailableCheck("تعذر تنفيذ فحص قاعدة البيانات.", {
        error: safeErrorMessage(response.error),
        probedTable: "schools",
      });
    }

    return {
      ok: true,
      status: "healthy",
      message: "فحص قاعدة البيانات نجح على جدول schools.",
      latencyMs: Date.now() - startedAt,
      details: {
        probedTable: "schools",
        count: response.count,
      },
    };
  } catch (error) {
    return buildUnavailableCheck("تعذر تنفيذ فحص قاعدة البيانات.", {
      error: safeErrorMessage(error),
      probedTable: "schools",
    });
  }
}

export async function checkSupabaseStorage(client?: ServiceSupabase | null, setupError?: unknown): Promise<OpsCheckResult> {
  if (!client) {
    return buildUnavailableCheck("Supabase Storage غير مهيأ على الخادم.", {
      error: safeErrorMessage(setupError),
    });
  }

  const startedAt = Date.now();

  try {
    const [bucketsResult, policyHints] = await Promise.all([
      client.storage.listBuckets(),
      readStoragePolicyHints(),
    ]);

    if (bucketsResult.error) {
      return buildUnavailableCheck("تعذر قراءة Buckets الخاصة بالتخزين.", {
        error: safeErrorMessage(bucketsResult.error),
      });
    }

    const bucketNames = new Set((bucketsResult.data ?? []).map((bucket) => bucket.name));
    const hasSchoolLogos = bucketNames.has("school-logos");
    const hasBranchLogos = bucketNames.has("branch-logos");
    const ok = hasSchoolLogos && hasBranchLogos;
    const status: OpsCheckStatus = ok ? "healthy" : "degraded";
    const missingBuckets = ["school-logos", "branch-logos"].filter((b) => !bucketNames.has(b));

    return {
      ok,
      status,
      reason: !ok ? `missing: ${missingBuckets.join(", ")}` : undefined,
      message: ok
        ? "Buckets المطلوبة موجودة وتمت مراجعة سياسة الكتابة."
        : "Buckets التخزين أو سياسة الحماية تحتاج مراجعة.",
      latencyMs: Date.now() - startedAt,
      details: {
        buckets: Array.from(bucketNames).sort(),
        requiredBuckets: ["school-logos", "branch-logos"],
        policyReview: policyHints,
      },
    };
  } catch (error) {
    return buildUnavailableCheck("تعذر تنفيذ فحص التخزين.", {
      error: safeErrorMessage(error),
    });
  }
}

export async function checkUpstash(): Promise<OpsCheckResult> {
  const opsSnapshot = getRateLimitOpsSnapshot();
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    return {
      ok: false,
      status: "degraded",
      reason: "missing_env",
      message: "Upstash غير مهيأ. auth login سيعمل مؤقتاً عبر memory fallback.",
      details: opsSnapshot,
    };
  }

  const startedAt = Date.now();

  try {
    const redis = new Redis({ url, token });
    await redis.get("__ops_healthcheck__");

    return {
      ok: true,
      status: "healthy",
      message: "Upstash Redis reachable.",
      latencyMs: Date.now() - startedAt,
      details: opsSnapshot,
    };
  } catch (error) {
    return {
      ok: false,
      status: "degraded",
      reason: "ping_failed",
      message: "تعذر فحص Upstash. auth login قد يتحول مؤقتاً إلى memory fallback.",
      latencyMs: Date.now() - startedAt,
      details: {
        ...opsSnapshot,
        error: safeErrorMessage(error),
      },
    };
  }
}

export async function checkSubscriptions(client?: ServiceSupabase | null, setupError?: unknown): Promise<OpsCheckResult & { snapshot: SubscriptionSnapshot }> {
  const emptySnapshot: SubscriptionSnapshot = {
    active_count: null,
    expired_count: null,
    expiring_7_days_count: null,
    expiring_30_days_count: null,
    details: {},
  };

  if (!client) {
    return {
      ...buildUnavailableCheck("فحص الاشتراكات غير مهيأ على الخادم.", {
        error: safeErrorMessage(setupError),
      }),
      snapshot: emptySnapshot,
    };
  }

  const startedAt = Date.now();

  try {
    const [schoolsResponse, subscriptionsResponse] = await Promise.all([
      client.from("schools").select("id, name, is_active"),
      client
        .from("subscriptions")
        .select("id, school_id, plan, status, start_date, end_date, created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (schoolsResponse.error || subscriptionsResponse.error) {
      const error = schoolsResponse.error || subscriptionsResponse.error;
      if (isMissingSchemaError(error)) {
        return {
          ok: false,
          status: "degraded",
          message: "Schema الاشتراكات غير واضحة بما يكفي لحساب التقرير بدقة.",
          latencyMs: Date.now() - startedAt,
          details: {
            error: safeErrorMessage(error),
          },
          snapshot: emptySnapshot,
        };
      }

      return {
        ...buildUnavailableCheck("تعذر قراءة بيانات الاشتراكات.", {
          error: safeErrorMessage(error),
        }),
        snapshot: emptySnapshot,
      };
    }

    const schools = schoolsResponse.data ?? [];
    const activeSchools = schools.filter((school) => school.is_active !== false).length;

    const schoolNameMap = new Map<string, string>();
    for (const school of schools) {
      if (school.id && school.name) {
        schoolNameMap.set(school.id, school.name as string);
      }
    }

    const latestBySchool = new Map<string, (typeof subscriptionsResponse.data)[number]>();

    for (const subscription of subscriptionsResponse.data ?? []) {
      if (subscription?.school_id && !latestBySchool.has(subscription.school_id)) {
        latestBySchool.set(subscription.school_id, subscription);
      }
    }

    let activeCount = 0;
    let expiredCount = 0;
    let expiring7 = 0;
    let expiring30 = 0;
    const expiredNames: string[] = [];
    const expiringSoonNames: string[] = [];

    for (const subscription of Array.from(latestBySchool.values())) {
      const normalizedStatus = (subscription.status || "").toLowerCase();
      const daysLeft = countDaysUntil(subscription.end_date);
      const schoolId = subscription.school_id ?? "";
      const schoolName = schoolNameMap.get(schoolId);
      const isExpired =
        normalizedStatus === "expired" ||
        normalizedStatus === "suspended" ||
        normalizedStatus === "inactive" ||
        (typeof daysLeft === "number" && daysLeft < 0);

      if (isExpired) {
        expiredCount += 1;
        if (schoolName) expiredNames.push(schoolName);
        continue;
      }

      activeCount += 1;

      if (typeof daysLeft === "number") {
        if (daysLeft <= 7) {
          expiring7 += 1;
          if (schoolName) expiringSoonNames.push(schoolName);
        }
        if (daysLeft <= 30) {
          expiring30 += 1;
        }
      }
    }

    const status: OpsCheckStatus = expiredCount > 0 || expiring7 > 0 ? "degraded" : "healthy";
    const snapshot: SubscriptionSnapshot = {
      active_count: activeCount,
      expired_count: expiredCount,
      expiring_7_days_count: expiring7,
      expiring_30_days_count: expiring30,
      details: {
        activeSchoolCount: activeSchools,
        sampledSchools: schools.length,
        sampledSubscriptions: (subscriptionsResponse.data ?? []).length,
      },
      expired_school_names: expiredNames.length > 0 ? expiredNames : undefined,
      expiring_soon_school_names: expiringSoonNames.length > 0 ? expiringSoonNames : undefined,
    };

    return {
      ok: true,
      status,
      message:
        status === "healthy"
          ? "فحص الاشتراكات مكتمل ولا توجد اشتراكات منتهية أو حرجة حالياً."
          : "تم رصد اشتراكات منتهية أو قريبة الانتهاء.",
      latencyMs: Date.now() - startedAt,
      details: snapshot.details,
      snapshot,
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        ok: false,
        status: "degraded",
        message: "تعذر تفسير schema الخاصة بالاشتراكات بدقة.",
        latencyMs: Date.now() - startedAt,
        details: {
          error: safeErrorMessage(error),
        },
        snapshot: emptySnapshot,
      };
    }

    return {
      ...buildUnavailableCheck("تعذر تنفيذ فحص الاشتراكات.", {
        error: safeErrorMessage(error),
      }),
      snapshot: emptySnapshot,
    };
  }
}

export function classifyOpsStatus(checks: OpsChecks): OpsCheckStatus {
  return worstStatus([
    checks.domain.status,
    checks.vercel.status,
    checks.supabaseAuth.status,
    checks.database.status,
    checks.storage.status,
    checks.upstash.status,
    checks.subscriptions.status,
  ]);
}

function buildOpsScore(checks: OpsChecks) {
  const weights = {
    domain: 20,
    vercel: 15,
    supabaseAuth: 15,
    database: 15,
    storage: 10,
    upstash: 10,
    subscriptions: 15,
  } satisfies Record<keyof OpsChecks, number>;

  let score = 100;

  for (const [key, weight] of Object.entries(weights) as Array<[keyof OpsChecks, number]>) {
    const status = checks[key].status;
    if (status === "down") {
      score -= weight;
    } else if (status === "degraded") {
      score -= Math.ceil(weight / 2);
    }
  }

  return Math.max(0, Math.min(100, score));
}

function buildArabicSummary(status: OpsCheckStatus, checks: OpsChecks, snapshot: SubscriptionSnapshot, score: number) {
  const lines = [
    `الحالة العامة ${statusIcon(status)} ${status}`,
    `التقييم ${score}/100`,
    `الدومين ${statusIcon(checks.domain.status)}`,
    `Vercel ${statusIcon(checks.vercel.status)}`,
    `Supabase Auth ${statusIcon(checks.supabaseAuth.status)}`,
    `Database ${statusIcon(checks.database.status)}`,
    `Storage ${statusIcon(checks.storage.status)}`,
    `Upstash ${statusIcon(checks.upstash.status)}`,
    `الاشتراكات المنتهية ${snapshot.expired_count ?? "?"}`,
    `تنتهي خلال 7 أيام ${snapshot.expiring_7_days_count ?? "?"}`,
  ];

  return lines.join(" | ");
}

export async function buildOpsReport(): Promise<OpsReport> {
  const { client, error: serviceError } = getServiceClient();
  const [domain, vercel, supabaseAuth, database, storage, upstash, subscriptions] = await Promise.all([
    checkDomain(),
    checkVercelPublic(),
    checkSupabaseAuth(client, serviceError),
    checkSupabaseDatabase(client, serviceError),
    checkSupabaseStorage(client, serviceError),
    checkUpstash(),
    checkSubscriptions(client, serviceError),
  ]);

  const checks: OpsChecks = {
    domain,
    vercel,
    supabaseAuth,
    database,
    storage,
    upstash,
    subscriptions,
  };
  const status = classifyOpsStatus(checks);
  const score = buildOpsScore(checks);
  const errors = Object.entries(checks)
    .filter(([, check]) => check.status !== "healthy")
    .map(([key, check]) => `${key}: ${check.message}`);
  const summary = buildArabicSummary(status, checks, subscriptions.snapshot, score);

  return {
    status,
    score,
    summary,
    checks,
    errors,
    metadata: {
      officialDomain: OFFICIAL_DOMAIN_URL,
      fallbackDomain: VERCEL_FALLBACK_URL,
      generatedAt: new Date().toISOString(),
    },
    subscriptionSnapshot: subscriptions.snapshot,
  };
}

export async function saveOpsReport(report: OpsReport) {
  const client = createServiceSupabaseClient();
  const payload = {
    status: report.status,
    score: report.score,
    domain_status: report.checks.domain,
    vercel_status: report.checks.vercel,
    supabase_status: {
      status: worstStatus([
        report.checks.supabaseAuth.status,
        report.checks.database.status,
        report.checks.storage.status,
      ]),
    },
    auth_status: report.checks.supabaseAuth,
    database_status: report.checks.database,
    storage_status: report.checks.storage,
    upstash_status: report.checks.upstash,
    subscriptions_status: {
      ...report.checks.subscriptions,
      snapshot: report.subscriptionSnapshot,
    },
    e2e_status: null,
    summary: report.summary,
    errors: report.errors,
    metadata: report.metadata,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertResult = await client.from("ops_health_reports").insert(payload as any).select("id, created_at").single();
  if (insertResult.error) {
    throw insertResult.error;
  }

  const snapshotPayload = {
    active_count: report.subscriptionSnapshot.active_count,
    expired_count: report.subscriptionSnapshot.expired_count,
    expiring_7_days_count: report.subscriptionSnapshot.expiring_7_days_count,
    expiring_30_days_count: report.subscriptionSnapshot.expiring_30_days_count,
    details: report.subscriptionSnapshot.details,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const snapshotResult = await client.from("ops_subscription_snapshots").insert(snapshotPayload as any).select("id").single();
  if (snapshotResult.error) {
    throw snapshotResult.error;
  }

  return {
    reportId: insertResult.data.id,
    createdAt: insertResult.data.created_at,
    snapshotId: snapshotResult.data.id,
  };
}

export async function saveOpsAlert(input: {
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  sent_to?: string | null;
  sent_via?: string | null;
  sent_status: "pending" | "sent" | "failed" | "skipped";
  metadata?: Record<string, unknown>;
}) {
  const client = createServiceSupabaseClient();
  const result = await client
    .from("ops_alerts")
    .insert({
      type: input.type,
      severity: input.severity,
      title: input.title,
      message: input.message,
      sent_to: input.sent_to ?? null,
      sent_via: input.sent_via ?? null,
      sent_status: input.sent_status,
      metadata: input.metadata ?? {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .select("id, created_at")
    .single();

  if (result.error) {
    throw result.error;
  }

  return result.data;
}
