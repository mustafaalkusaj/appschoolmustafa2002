import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { transportError } from "@/lib/transport/server";

/** List / create bus routes with their stops and student counts. */
export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin"], roleDeniedMessage: "النقل المدرسي متاح للإدارة فقط." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return transportError(
      "message" in context ? context.message : "غير مصرح.",
      "status" in context ? context.status : 403,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  if (!(await routeUserHasPermission(actorSupabase, actorUserId, "view_transport"))) {
    return transportError("ليس لديك صلاحية عرض النقل المدرسي.", 403);
  }
  const rateLimited = await enforceRateLimit(req, {
    namespace: "transport-routes", windowMs: 60_000, maxHits: 60, identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const branchScope = resolveBranchScope(
    context.value,
    req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id"),
  );
  if (!branchScope.ok) return transportError(branchScope.message, branchScope.status);

  const [routesRes, membershipRes] = await Promise.all([
    applyBranchScopeToQuery(
      actorSupabase
        .from("bus_routes")
        .select("id, name, monthly_fee, is_active, driver_id, backup_driver_id, branch_id, created_at, drivers!bus_routes_driver_id_fkey(full_name)")
        .eq("school_id", targetSchoolId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(500),
      branchScope.value,
    ),
    applyBranchScopeToQuery(
      actorSupabase
        .from("bus_route_students")
        .select("route_id")
        .eq("school_id", targetSchoolId)
        .is("deleted_at", null)
        .limit(20_000),
      branchScope.value,
    ),
  ]);

  if (routesRes.error) return transportError("تعذر تحميل الخطوط.", 500);

  // Aggregates run in JS: PostgREST aggregates are disabled here (PGRST123).
  const counts = new Map<string, number>();
  for (const row of membershipRes.data ?? []) {
    counts.set(row.route_id as string, (counts.get(row.route_id as string) ?? 0) + 1);
  }

  const routes = (routesRes.data ?? []).map((route) => ({
    ...route,
    student_count: counts.get(route.id as string) ?? 0,
  }));

  return NextResponse.json({ ok: true, routes }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

export async function POST(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin"], roleDeniedMessage: "النقل المدرسي متاح للإدارة فقط." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return transportError(
      "message" in context ? context.message : "غير مصرح.",
      "status" in context ? context.status : 403,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  if (!(await routeUserHasPermission(actorSupabase, actorUserId, "manage_transport"))) {
    return transportError("ليس لديك صلاحية إدارة النقل المدرسي.", 403);
  }
  const rateLimited = await enforceRateLimit(req, {
    namespace: "transport-routes-write", windowMs: 60_000, maxHits: 30, identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return transportError("جسم الطلب غير صالح.", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return transportError("اسم الخط مطلوب.", 400);

  const monthlyFee = Number(body.monthly_fee ?? 0);
  if (!Number.isFinite(monthlyFee) || monthlyFee < 0) {
    return transportError("قيمة الاشتراك غير صالحة.", 400);
  }

  const branchScope = resolveBranchScope(
    context.value,
    typeof body.branch_id === "string" ? body.branch_id : null,
  );
  if (!branchScope.ok) return transportError(branchScope.message, branchScope.status);

  const driverId = typeof body.driver_id === "string" && body.driver_id ? body.driver_id : null;
  if (driverId) {
    // The FK alone would accept a driver from another school; check tenancy.
    const { data: driver } = await actorSupabase
      .from("drivers")
      .select("id")
      .eq("id", driverId)
      .eq("school_id", targetSchoolId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!driver) return transportError("السائق المحدد غير موجود.", 400);
  }

  const { data, error } = await actorSupabase
    .from("bus_routes")
    .insert({
      school_id: targetSchoolId,
      branch_id: branchScope.value.branchId,
      name,
      monthly_fee: monthlyFee,
      driver_id: driverId,
    })
    .select("id")
    .single();

  if (error || !data) return transportError("تعذر إنشاء الخط.", 500);
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
