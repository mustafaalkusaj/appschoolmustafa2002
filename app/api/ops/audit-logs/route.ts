import { NextRequest, NextResponse } from "next/server";

import { getRecentAuditLogs } from "@/lib/audit/audit-log";
import { isOpsTokenAuthorized } from "@/lib/ops/security";
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

export async function GET(request: NextRequest) {
  const tokenAuthorized = isOpsTokenAuthorized(request, [
    process.env.OPS_ALERT_TOKEN,
  ]);

  if (!tokenAuthorized) {
    const authContext = await resolveSuperAdminActorContext(
      request.headers.get("authorization"),
    );
    if (!authContext.ok) return notFound();
  }

  const rawLimit = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit ?? "20", 10) || 20));
  const action_type = request.nextUrl.searchParams.get("action_type") ?? undefined;
  const entity_type = request.nextUrl.searchParams.get("entity_type") ?? undefined;
  const school_id = request.nextUrl.searchParams.get("school_id") ?? undefined;

  const logs = await getRecentAuditLogs({
    limit,
    action_type,
    entity_type,
    school_id,
  });

  return NextResponse.json(
    { ok: true, logs },
    { headers: { "Cache-Control": "no-store" } },
  );
}
