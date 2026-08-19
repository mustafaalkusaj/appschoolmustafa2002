import { NextRequest, NextResponse } from "next/server";

import { resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { transportError } from "@/lib/transport/server";

type Ctx = { params: Promise<{ routeId: string }> };

async function authorize(req: NextRequest, schoolId: string | null, permission: "view_transport" | "manage_transport") {
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin", "transport_manager"], roleDeniedMessage: "النقل المدرسي متاح للإدارة فقط." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return {
      ok: false as const,
      error: transportError(
        "message" in context ? context.message : "غير مصرح.",
        "status" in context ? context.status : 403,
      ),
    };
  }
  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  if (!(await routeUserHasPermission(actorSupabase, actorUserId, permission))) {
    return { ok: false as const, error: transportError("ليس لديك صلاحية النقل المدرسي.", 403) };
  }
  const rateLimited = await enforceRateLimit(req, {
    namespace: "transport-route-students", windowMs: 60_000, maxHits: 60, identifier: actorUserId,
  });
  if (rateLimited) return { ok: false as const, error: rateLimited };
  return { ok: true as const, actorSupabase, targetSchoolId, context: context.value };
}

/** Students on a route + candidates to add (names only, no amounts). */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { routeId } = await params;
  const auth = await authorize(req, req.nextUrl.searchParams.get("schoolId"), "view_transport");
  if (!auth.ok) return auth.error;
  const { actorSupabase, targetSchoolId } = auth;

  const { data: route } = await actorSupabase
    .from("bus_routes")
    .select("id, name")
    .eq("id", routeId)
    .eq("school_id", targetSchoolId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!route) return transportError("الخط غير موجود.", 404);

  const [membersRes, studentsRes] = await Promise.all([
    actorSupabase
      .from("bus_route_students")
      .select("id, student_id, stop_order, dropoff_pin, subscription_status, students(full_name, class_name)")
      .eq("route_id", routeId)
      .is("deleted_at", null)
      .order("stop_order", { ascending: true })
      .limit(500),
    actorSupabase
      .from("students")
      .select("id, full_name, class_name")
      .eq("school_id", targetSchoolId)
      .is("deleted_at", null)
      .neq("status", "deleted")
      .order("full_name", { ascending: true })
      .limit(5_000),
  ]);
  if (membersRes.error) return transportError("تعذر تحميل طلاب الخط.", 500);

  return NextResponse.json(
    { ok: true, route, members: membersRes.data ?? [], students: studentsRes.data ?? [] },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { routeId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const auth = await authorize(
    req,
    typeof body?.school_id === "string" ? body.school_id : null,
    "manage_transport",
  );
  if (!auth.ok) return auth.error;
  const { actorSupabase, targetSchoolId } = auth;

  const studentId = typeof body?.student_id === "string" ? body.student_id : "";
  if (!studentId) return transportError("student_id مطلوب.", 400);

  const [{ data: route }, { data: student }] = await Promise.all([
    actorSupabase
      .from("bus_routes")
      .select("id, branch_id")
      .eq("id", routeId)
      .eq("school_id", targetSchoolId)
      .is("deleted_at", null)
      .maybeSingle(),
    actorSupabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .eq("school_id", targetSchoolId)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);
  if (!route) return transportError("الخط غير موجود.", 404);
  if (!student) return transportError("الطالب غير موجود.", 404);

  // stop_order appended at the end; the admin can reorder later.
  const { data: last } = await actorSupabase
    .from("bus_route_students")
    .select("stop_order")
    .eq("route_id", routeId)
    .is("deleted_at", null)
    .order("stop_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await actorSupabase.from("bus_route_students").insert({
    school_id: targetSchoolId,
    branch_id: route.branch_id,
    route_id: routeId,
    student_id: studentId,
    stop_order: (last?.stop_order ?? 0) + 1,
  });
  if (error) {
    const duplicate = error.code === "23505";
    return transportError(duplicate ? "الطالب مضاف لهذا الخط بالفعل." : "تعذر إضافة الطالب.", duplicate ? 409 : 500);
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { routeId } = await params;
  const auth = await authorize(req, req.nextUrl.searchParams.get("schoolId"), "manage_transport");
  if (!auth.ok) return auth.error;
  const { actorSupabase, targetSchoolId } = auth;

  const membershipId = req.nextUrl.searchParams.get("membershipId");
  if (!membershipId) return transportError("membershipId مطلوب.", 400);

  const { error } = await actorSupabase
    .from("bus_route_students")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", membershipId)
    .eq("route_id", routeId)
    .eq("school_id", targetSchoolId);
  if (error) return transportError("تعذر إزالة الطالب.", 500);
  return NextResponse.json({ ok: true });
}

/** Toggle a member's subscription flag (paid / due). */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { routeId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const auth = await authorize(
    req,
    typeof body?.school_id === "string" ? body.school_id : null,
    "manage_transport",
  );
  if (!auth.ok) return auth.error;
  const { actorSupabase, targetSchoolId } = auth;

  const membershipId = typeof body?.membership_id === "string" ? body.membership_id : "";
  const status =
    body?.subscription_status === "paid" || body?.subscription_status === "due" || body?.subscription_status === "overdue"
      ? body.subscription_status
      : null;
  if (!membershipId || !status) return transportError("membership_id و subscription_status مطلوبة.", 400);

  const { data, error } = await actorSupabase
    .from("bus_route_students")
    .update({ subscription_status: status, updated_at: new Date().toISOString() })
    .eq("id", membershipId)
    .eq("route_id", routeId)
    .eq("school_id", targetSchoolId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) return transportError("تعذر تحديث حالة الاشتراك.", 500);
  if (!data) return transportError("السجل غير موجود.", 404);
  return NextResponse.json({ ok: true });
}
