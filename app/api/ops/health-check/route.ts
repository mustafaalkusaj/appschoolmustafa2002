import { NextRequest, NextResponse } from "next/server";

import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { isOpsTokenAuthorized } from "@/lib/ops/security";
import { sendTelegramMessage } from "@/lib/ops/telegram";

// ─── Types ────────────────────────────────────────────────────────────────────

type HealthCheckResult = {
  service: string;
  status: "up" | "down" | "degraded";
  response_ms: number | null;
  error_message: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function pingUrl(url: string): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
      redirect: "manual",
    });
    const latencyMs = Date.now() - startedAt;
    const ok = response.status >= 200 && response.status < 400;
    return { ok, latencyMs };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message.slice(0, 200) : "ping failed",
    };
  }
}

// ─── Health checks ────────────────────────────────────────────────────────────

async function checkWebApp(): Promise<HealthCheckResult> {
  const result = await pingUrl("https://school-iraq.com");
  return {
    service: "web_app",
    status: result.ok ? "up" : "down",
    response_ms: result.latencyMs,
    error_message: result.error ?? null,
  };
}

async function checkSupabase(): Promise<HealthCheckResult> {
  const startedAt = Date.now();
  try {
    const supabase = createServiceSupabaseClient();
    const { error } = await supabase
      .from("schools")
      .select("id", { head: true, count: "exact" })
      .limit(1);

    return {
      service: "supabase",
      status: error ? "down" : "up",
      response_ms: Date.now() - startedAt,
      error_message: error ? error.message.slice(0, 200) : null,
    };
  } catch (err) {
    return {
      service: "supabase",
      status: "down",
      response_ms: Date.now() - startedAt,
      error_message: err instanceof Error ? err.message.slice(0, 200) : "unknown error",
    };
  }
}

async function checkR2(): Promise<HealthCheckResult> {
  const r2Url = process.env.R2_PUBLIC_URL?.trim() ?? process.env.NEXT_PUBLIC_R2_URL?.trim();

  if (!r2Url) {
    return {
      service: "r2_storage",
      status: "degraded",
      response_ms: null,
      error_message: "R2_PUBLIC_URL not configured",
    };
  }

  const result = await pingUrl(r2Url);
  return {
    service: "r2_storage",
    status: result.ok ? "up" : "degraded",
    response_ms: result.latencyMs,
    error_message: result.error ?? null,
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

async function handle(request: NextRequest) {
  const tokenAuthorized = isOpsTokenAuthorized(request, [
    process.env.CRON_SECRET,
    process.env.OPS_ALERT_TOKEN,
  ]);

  if (!tokenAuthorized) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const results: HealthCheckResult[] = [];

  try {
    const [webResult, supabaseResult, r2Result] = await Promise.all([
      checkWebApp(),
      checkSupabase(),
      checkR2(),
    ]);

    results.push(webResult, supabaseResult, r2Result);

    // Save to health_checks table
    const supabase = createServiceSupabaseClient();
    const insertPayload = results.map((r) => ({
      service: r.service,
      status: r.status,
      response_ms: r.response_ms,
      error_message: r.error_message,
      checked_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase.from("health_checks").insert(insertPayload);
    if (insertError) {
      console.error("[health-check] failed to save results:", insertError.message);
    }

    // Alert if any service is down
    const downServices = results.filter((r) => r.status === "down");
    if (downServices.length > 0) {
      const alertLines = [
        "🚨 <b>تنبيه: خدمة معطلة</b>",
        "",
        ...downServices.map(
          (s) =>
            `❌ ${s.service}: ${s.error_message?.slice(0, 100) ?? "down"}`,
        ),
      ];

      await sendTelegramMessage(alertLines.join("\n")).catch(() => {});
    }

    // Alert if any service is slow (> 3000ms)
    const slowServices = results.filter(
      (r) => r.response_ms !== null && r.response_ms > 3000 && r.status === "up",
    );
    if (slowServices.length > 0) {
      const alertLines = [
        "⚠️ <b>تنبيه: أداء بطيء</b>",
        "",
        ...slowServices.map((s) => `🟡 ${s.service}: ${s.response_ms}ms`),
      ];

      await sendTelegramMessage(alertLines.join("\n")).catch(() => {});
    }

    return NextResponse.json(
      {
        ok: true,
        results: results.map((r) => ({
          service: r.service,
          status: r.status,
          response_ms: r.response_ms,
        })),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "health check failed",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
