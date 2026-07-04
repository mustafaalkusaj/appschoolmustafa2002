import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
  parseMobileListParams,
  resolveMobileRouteContextAny,
} from "@/lib/mobile-api-admin";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContextAny(req, "super_admin");
  if (!context.ok) return context.response;

  const { serviceSupabase } = context.value;
  const params = parseMobileListParams(req);

  const { data, error } = await serviceSupabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (error) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(error, "audit_logs"),
      items: [],
    });
  }

  const rows = data ?? [];
  const userIds = [...new Set(rows.map((r: any) => r.user_id).filter(Boolean))];

  let nameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: users } = await serviceSupabase
      .from("users")
      .select("id, full_name_ar")
      .in("id", userIds);
    if (users) {
      nameMap = Object.fromEntries(
        users.map((u: any) => [u.id, u.full_name_ar]),
      );
    }
  }

  const items = rows.map((row: any) => ({
    ...row,
    actor_name: nameMap[row.user_id] ?? null,
  }));

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    items,
    page: params.page,
    limit: params.limit,
  });
}
