import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { transportError } from "@/lib/transport/server";

type Ctx = { params: Promise<{ driverId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { driverId } = await params;
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
    namespace: "transport-driver-students", windowMs: 60_000, maxHits: 60, identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const { data: driver } = await actorSupabase
    .from("drivers")
    .select("id")
    .eq("id", driverId)
    .eq("school_id", targetSchoolId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!driver) return transportError("السائق غير موجود.", 404);

  const { data: routes } = await actorSupabase
    .from("bus_routes")
    .select("id, name")
    .eq("driver_id", driverId)
    .eq("school_id", targetSchoolId)
    .is("deleted_at", null);

  const routeIds = (routes ?? []).map((r) => r.id);
  if (routeIds.length === 0) {
    return NextResponse.json(
      { ok: true, students: [], routes: [] },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }

  const { data: members, error } = await actorSupabase
    .from("bus_route_students")
    .select("id, route_id, student_id, subscription_status, students(id, full_name, class_name, phone, guardian_name, guardian_phone, gender, photo_url, section, address, date_of_birth, registration_number)")
    .in("route_id", routeIds)
    .is("deleted_at", null)
    .order("route_id", { ascending: true })
    .limit(500);
  if (error) return transportError("تعذر تحميل طلاب السائق.", 500);

  return NextResponse.json(
    { ok: true, students: members ?? [], routes: routes ?? [] },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
