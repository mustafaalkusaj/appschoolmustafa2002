import { NextRequest, NextResponse } from "next/server";

import { enforceRateLimit } from "@/lib/rate-limit";
import {
  createRouteSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";
import {
  baghdadToday,
  loadDriverRouteIds,
  resolveDriverContext,
  transportError,
} from "@/lib/transport/server";

/**
 * Everything the driver's single page needs in one call: who he is, his routes,
 * the students on them (no amounts), and today's trips.
 *
 * Reads go through the service client because RLS intentionally blanks
 * current_school_id() for the driver role; authorisation happens here against
 * public.drivers instead.
 */
export async function GET(req: NextRequest) {
  const supabase = await createRouteSupabaseClient();
  const { data: userData } = await getRouteAuthenticatedUser(
    supabase,
    req.headers.get("authorization"),
  );
  const ctx = await resolveDriverContext(userData?.user?.id);
  if (!ctx) return transportError("هذه الصفحة مخصصة للسواق فقط.", 403);

  const rateLimited = await enforceRateLimit(req, {
    namespace: "driver-overview", windowMs: 60_000, maxHits: 60, identifier: ctx.driverId,
  });
  if (rateLimited) return rateLimited;

  const routeIds = await loadDriverRouteIds(ctx);
  const today = baghdadToday();

  if (routeIds.length === 0) {
    return NextResponse.json(
      { ok: true, driver: { full_name: ctx.fullName }, routes: [], students: [], trips: [], date: today },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }

  const [routesRes, membersRes, stopsRes, tripsRes] = await Promise.all([
    ctx.service
      .from("bus_routes")
      .select("id, name, driver_id, backup_driver_id")
      .in("id", routeIds)
      .is("deleted_at", null),
    ctx.service
      .from("bus_route_students")
      .select("id, route_id, student_id, stop_id, stop_order, special_notes, subscription_status, students(full_name, class_name, photo_url, guardian_name, guardian_phone, parent_phone, phone)")
      .in("route_id", routeIds)
      .is("deleted_at", null)
      .order("stop_order", { ascending: true })
      .limit(2_000),
    ctx.service
      .from("bus_route_stops")
      .select("id, route_id, stop_order, name")
      .in("route_id", routeIds)
      .order("stop_order", { ascending: true }),
    ctx.service
      .from("bus_trips")
      .select("id, route_id, trip_type, status, started_at, ended_at")
      .eq("driver_id", ctx.driverId)
      .eq("trip_date", today),
  ]);

  // Strip to exactly what the driver needs; monthly_fee and any other amount
  // never leave the server on this route.
  const students = (membersRes.data ?? []).map((m) => {
    const s = (Array.isArray(m.students) ? m.students[0] : m.students) as Record<string, unknown> | null;
    return {
      membership_id: m.id,
      route_id: m.route_id,
      student_id: m.student_id,
      stop_id: m.stop_id,
      stop_order: m.stop_order,
      special_notes: m.special_notes,
      subscription_active: m.subscription_status === "paid",
      full_name: (s?.full_name as string) ?? "—",
      class_name: (s?.class_name as string) ?? null,
      photo_url: (s?.photo_url as string) ?? null,
      guardian_name: (s?.guardian_name as string) ?? null,
      guardian_phone:
        ((s?.guardian_phone as string) || (s?.parent_phone as string) || (s?.phone as string)) ?? null,
    };
  });

  return NextResponse.json(
    {
      ok: true,
      date: today,
      driver: { full_name: ctx.fullName },
      routes: routesRes.data ?? [],
      stops: stopsRes.data ?? [],
      students,
      trips: tripsRes.data ?? [],
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
