import { NextRequest, NextResponse } from "next/server";

import { getServerEnv } from "@/lib/env/server";
import { isAuthorizedHealthRequest } from "@/lib/ops-health";

type DependencyStatus = "ok" | "error" | "unconfigured";

export async function GET(req: NextRequest) {
  const env = getServerEnv();
  const authorized = isAuthorizedHealthRequest(req, env.healthcheckToken, process.env.NODE_ENV === "production");

  if (!authorized) {
    return NextResponse.json(
      { ok: false, message: "Not found." },
      {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const startedAt = Date.now();
  const timestamp = new Date().toISOString();

  let envConfigured = true;
  let supabaseStatus: DependencyStatus = "unconfigured";
  let supabaseLatencyMs: number | null = null;
  let envErrorMessage: string | null = null;

  try {
    if (!env.serviceRoleKey) {
      supabaseStatus = "unconfigured";
      envConfigured = false;
      envErrorMessage = "SUPABASE_SERVICE_ROLE_KEY is not configured.";
    } else {
      const probeUrl = `${env.supabaseUrl}/rest/v1/schools?select=id&limit=1`;
      const probeStartedAt = Date.now();
      const response = await fetch(probeUrl, {
        method: "GET",
        headers: {
          apikey: env.serviceRoleKey,
          Authorization: `Bearer ${env.serviceRoleKey}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(3_000),
      });
      supabaseLatencyMs = Date.now() - probeStartedAt;
      supabaseStatus = response.ok ? "ok" : "error";
    }
  } catch (error) {
    envConfigured = false;
    supabaseStatus = "error";
    envErrorMessage = error instanceof Error ? error.message : "Failed to evaluate environment configuration.";
  }

  const ok = envConfigured && supabaseStatus === "ok";

  return NextResponse.json(
    {
      ok,
      status: ok ? "ok" : "degraded",
      timestamp,
      requestId,
      responseTimeMs: Date.now() - startedAt,
      checks: {
        env: envConfigured,
        database: supabaseStatus === "ok",
      },
      dependencies: {
        supabase: {
          status: supabaseStatus,
          latencyMs: supabaseLatencyMs,
        },
      },
      issues: envErrorMessage ? [envErrorMessage] : [],
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
