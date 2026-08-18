import { NextRequest, NextResponse } from "next/server";

import { enforceRateLimit } from "@/lib/rate-limit";
import {
  createRouteSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";
import { resolveDriverContext, transportError } from "@/lib/transport/server";

/**
 * Record a boarding event on the driver's active trip.
 *
 * dropped_off is PIN-gated: the guardian reads the 4-digit code and the driver
 * cannot close the hand-over without it. That check is the transport module's
 * core safety feature, so it lives server-side, not in the UI.
 */
export async function POST(req: NextRequest) {
  const supabase = await createRouteSupabaseClient();
  const { data: userData } = await getRouteAuthenticatedUser(
    supabase,
    req.headers.get("authorization"),
  );
  const ctx = await resolveDriverContext(userData?.user?.id);
  if (!ctx) return transportError("هذه الصفحة مخصصة للسواق فقط.", 403);

  const rateLimited = await enforceRateLimit(req, {
    namespace: "driver-attendance", windowMs: 60_000, maxHits: 120, identifier: ctx.driverId,
  });
  if (rateLimited) return rateLimited;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return transportError("جسم الطلب غير صالح.", 400);
  }

  const tripId = typeof body.trip_id === "string" ? body.trip_id : "";
  const studentId = typeof body.student_id === "string" ? body.student_id : "";
  const state =
    body.state === "boarded" || body.state === "absent" || body.state === "dropped_off"
      ? body.state
      : null;
  if (!tripId || !studentId || !state) {
    return transportError("trip_id و student_id و state مطلوبة.", 400);
  }

  const { data: trip } = await ctx.service
    .from("bus_trips")
    .select("id, route_id, status")
    .eq("id", tripId)
    .eq("driver_id", ctx.driverId)
    .maybeSingle();
  if (!trip) return transportError("الرحلة غير موجودة.", 404);
  if (trip.status !== "in_progress") return transportError("الرحلة غير جارية.", 409);

  const { data: membership } = await ctx.service
    .from("bus_route_students")
    .select("id, dropoff_pin")
    .eq("route_id", trip.route_id)
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!membership) return transportError("الطالب ليس ضمن هذا الخط.", 404);

  let pinVerified = false;
  if (state === "dropped_off") {
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";
    if (pin.length !== 4) return transportError("رمز التسليم مطلوب (4 أرقام).", 400);
    if (pin !== membership.dropoff_pin) return transportError("رمز التسليم غير صحيح.", 403);
    pinVerified = true;
  }

  const lat = Number.isFinite(Number(body.lat)) ? Number(body.lat) : null;
  const lng = Number.isFinite(Number(body.lng)) ? Number(body.lng) : null;

  // unique (trip_id, student_id, state) makes taps idempotent under retries.
  const { error } = await ctx.service
    .from("bus_trip_attendance")
    .upsert(
      {
        school_id: ctx.schoolId,
        branch_id: ctx.branchId,
        trip_id: tripId,
        student_id: studentId,
        state,
        pin_verified: pinVerified,
        lat,
        lng,
      },
      { onConflict: "trip_id,student_id,state" },
    );

  if (error) return transportError("تعذر تسجيل الحالة.", 500);
  return NextResponse.json({ ok: true });
}
