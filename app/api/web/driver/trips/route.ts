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

/** Start (POST) or finish (PATCH) a trip on one of the driver's own routes. */
export async function POST(req: NextRequest) {
  const supabase = await createRouteSupabaseClient();
  const { data: userData } = await getRouteAuthenticatedUser(
    supabase,
    req.headers.get("authorization"),
  );
  const ctx = await resolveDriverContext(userData?.user?.id);
  if (!ctx) return transportError("هذه الصفحة مخصصة للسواق فقط.", 403);

  const rateLimited = await enforceRateLimit(req, {
    namespace: "driver-trips", windowMs: 60_000, maxHits: 30, identifier: ctx.driverId,
  });
  if (rateLimited) return rateLimited;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return transportError("جسم الطلب غير صالح.", 400);
  }

  const routeId = typeof body.route_id === "string" ? body.route_id : "";
  const tripType = body.trip_type === "afternoon" ? "afternoon" : "morning";
  const routeIds = await loadDriverRouteIds(ctx);
  if (!routeId || !routeIds.includes(routeId)) {
    return transportError("هذا الخط ليس ضمن خطوطك.", 403);
  }

  const lat = Number.isFinite(Number(body.lat)) ? Number(body.lat) : null;
  const lng = Number.isFinite(Number(body.lng)) ? Number(body.lng) : null;

  // The unique (route_id, trip_date, trip_type) constraint makes retries safe:
  // a second tap resumes today's trip instead of duplicating it.
  const { data: existing } = await ctx.service
    .from("bus_trips")
    .select("id, status")
    .eq("route_id", routeId)
    .eq("trip_date", baghdadToday())
    .eq("trip_type", tripType)
    .maybeSingle();

  if (existing) {
    if (existing.status === "in_progress") {
      return NextResponse.json({ ok: true, id: existing.id, resumed: true });
    }
    return transportError("رحلة اليوم لهذا الخط منتهية بالفعل.", 409);
  }

  const { data, error } = await ctx.service
    .from("bus_trips")
    .insert({
      school_id: ctx.schoolId,
      branch_id: ctx.branchId,
      route_id: routeId,
      driver_id: ctx.driverId,
      trip_type: tripType,
      start_lat: lat,
      start_lng: lng,
    })
    .select("id")
    .single();

  if (error || !data) return transportError("تعذر بدء الرحلة.", 500);
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createRouteSupabaseClient();
  const { data: userData } = await getRouteAuthenticatedUser(
    supabase,
    req.headers.get("authorization"),
  );
  const ctx = await resolveDriverContext(userData?.user?.id);
  if (!ctx) return transportError("هذه الصفحة مخصصة للسواق فقط.", 403);

  const rateLimited = await enforceRateLimit(req, {
    namespace: "driver-trips", windowMs: 60_000, maxHits: 30, identifier: ctx.driverId,
  });
  if (rateLimited) return rateLimited;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return transportError("جسم الطلب غير صالح.", 400);
  }

  const tripId = typeof body.trip_id === "string" ? body.trip_id : "";
  if (!tripId) return transportError("trip_id مطلوب.", 400);

  const lat = Number.isFinite(Number(body.lat)) ? Number(body.lat) : null;
  const lng = Number.isFinite(Number(body.lng)) ? Number(body.lng) : null;

  const { data, error } = await ctx.service
    .from("bus_trips")
    .update({ status: "completed", ended_at: new Date().toISOString(), end_lat: lat, end_lng: lng })
    .eq("id", tripId)
    .eq("driver_id", ctx.driverId)
    .eq("status", "in_progress")
    .select("id")
    .maybeSingle();

  if (error) return transportError("تعذر إنهاء الرحلة.", 500);
  if (!data) return transportError("لا توجد رحلة جارية بهذا المعرف.", 404);
  return NextResponse.json({ ok: true, id: data.id });
}
