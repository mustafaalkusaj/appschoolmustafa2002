import { NextRequest, NextResponse } from "next/server";

import { buildOpsReport } from "@/lib/ops/health-monitor";
import { isOpsTokenAuthorized } from "@/lib/ops/security";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

function notFound() {
  return NextResponse.json(
    { ok: false, message: "Not found." },
    {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function POST(request: NextRequest) {
  const tokenAuthorized = isOpsTokenAuthorized(request, [
    process.env.OPS_ALERT_TOKEN,
  ]);

  if (!tokenAuthorized) {
    const authContext = await resolveSuperAdminActorContext(
      request.headers.get("authorization"),
    );
    if (!authContext.ok) return notFound();
  }

  try {
    const supabase = createServiceSupabaseClient();

    const [report, openErrorsResult, criticalErrorsResult] = await Promise.all([
      buildOpsReport(),
      supabase
        .from("ops_errors")
        .select("id", { head: true, count: "exact" })
        .eq("status", "open"),
      supabase
        .from("ops_errors")
        .select("id", { head: true, count: "exact" })
        .eq("status", "open")
        .eq("severity", "critical"),
    ]);

    const errorSummary = {
      open: openErrorsResult.count ?? 0,
      critical: criticalErrorsResult.count ?? 0,
    };

    return NextResponse.json(
      {
        ok: true,
        report,
        errorSummary,
        subscriptions: report.subscriptionSnapshot,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message:
          err instanceof Error ? err.message : "تعذر تنفيذ الفحص الشامل.",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
