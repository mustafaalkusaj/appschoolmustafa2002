import { NextRequest, NextResponse } from "next/server";

import { isOpsTokenAuthorized } from "@/lib/ops/security";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

function notFound() {
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

export async function GET(request: NextRequest) {
  const tokenAuthorized = isOpsTokenAuthorized(request, [process.env.OPS_ALERT_TOKEN]);

  if (!tokenAuthorized) {
    const authContext = await resolveSuperAdminActorContext(request.headers.get("authorization"));
    if (!authContext.ok) {
      return notFound();
    }
  }

  const supabase = createServiceSupabaseClient();
  const [reportResult, alertsResult] = await Promise.all([
    supabase.from("ops_health_reports").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("ops_alerts").select("*").order("created_at", { ascending: false }).limit(10),
  ]);

  if (reportResult.error) {
    return NextResponse.json(
      {
        ok: false,
        error: reportResult.error.message,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      report: reportResult.data ?? null,
      alerts: alertsResult.data ?? [],
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
