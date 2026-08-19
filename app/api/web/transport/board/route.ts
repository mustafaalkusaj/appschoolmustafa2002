import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { baghdadToday, transportError } from "@/lib/transport/server";

/**
 * Today's operations board: every route with its trip status and attendance
 * counts for the current Baghdad day. Counts are computed in JS — PostgREST
 * aggregates are disabled on this project (PGRST123).
 */
export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin", "transport_manager"], roleDeniedMessage: "النقل المدرسي متاح للإدارة فقط." },
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
    namespace: "transport-board", windowMs: 60_000, maxHits: 90, identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const branchScope = resolveBranchScope(
    context.value,
    req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id"),
  );
  if (!branchScope.ok) return transportError(branchScope.message, branchScope.status);

  const today = baghdadToday();

  const [routesRes, tripsRes, membershipRes] = await Promise.all([
    applyBranchScopeToQuery(
      actorSupabase
        .from("bus_routes")
        .select("id, name, driver_id, drivers!bus_routes_driver_id_fkey(full_name, phone, license_expiry)")
        .eq("school_id", targetSchoolId)
        .is("deleted_at", null)
        .eq("is_active", true)
        .limit(500),
      branchScope.value,
    ),
    applyBranchScopeToQuery(
      actorSupabase
        .from("bus_trips")
        .select("id, route_id, trip_type, status, started_at, ended_at, start_lat, start_lng")
        .eq("school_id", targetSchoolId)
        .eq("trip_date", today)
        .limit(2_000),
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

  if (routesRes.error) return transportError("تعذر تحميل لوحة النقل.", 500);

  const trips = tripsRes.data ?? [];
  const tripIds = trips.map((t) => t.id as string);

  let attendance: Array<{ trip_id: string; state: string }> = [];
  if (tripIds.length > 0) {
    const { data } = await actorSupabase
      .from("bus_trip_attendance")
      .select("trip_id, state")
      .in("trip_id", tripIds)
      .limit(20_000);
    attendance = (data ?? []) as Array<{ trip_id: string; state: string }>;
  }

  const enrolled = new Map<string, number>();
  for (const row of membershipRes.data ?? []) {
    enrolled.set(row.route_id as string, (enrolled.get(row.route_id as string) ?? 0) + 1);
  }

  const attendanceByTrip = new Map<string, { boarded: number; absent: number; dropped_off: number }>();
  for (const row of attendance) {
    const bucket = attendanceByTrip.get(row.trip_id) ?? { boarded: 0, absent: 0, dropped_off: 0 };
    if (row.state === "boarded") bucket.boarded += 1;
    else if (row.state === "absent") bucket.absent += 1;
    else if (row.state === "dropped_off") bucket.dropped_off += 1;
    attendanceByTrip.set(row.trip_id, bucket);
  }

  const board = (routesRes.data ?? []).map((route) => {
    const routeTrips = trips
      .filter((t) => t.route_id === route.id)
      .map((t) => ({
        ...t,
        counts: attendanceByTrip.get(t.id as string) ?? { boarded: 0, absent: 0, dropped_off: 0 },
      }));
    return {
      ...route,
      enrolled: enrolled.get(route.id as string) ?? 0,
      trips: routeTrips,
    };
  });

  return NextResponse.json({ ok: true, date: today, board }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
