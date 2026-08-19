import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { transportError } from "@/lib/transport/server";
import type { RouteSupabaseClient } from "@/lib/managed-users/types";

type Ctx = { params: Promise<{ routeId: string }> };

async function authorize(req: NextRequest, schoolId: string | null) {
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin", "transport_manager"], roleDeniedMessage: "النقل المدرسي متاح للإدارة فقط." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return {
      ok: false as const,
      error: transportError("message" in context ? context.message : "غير مصرح.", "status" in context ? context.status : 403),
    };
  }
  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  if (!(await routeUserHasPermission(actorSupabase, actorUserId, "manage_transport"))) {
    return { ok: false as const, error: transportError("ليس لديك صلاحية إدارة النقل المدرسي.", 403) };
  }
  const rateLimited = await enforceRateLimit(req, {
    namespace: "transport-route-write", windowMs: 60_000, maxHits: 30, identifier: actorUserId,
  });
  if (rateLimited) return { ok: false as const, error: rateLimited };
  return { ok: true as const, actorSupabase, targetSchoolId };
}

async function driverExists(client: RouteSupabaseClient, schoolId: string, driverId: string) {
  const { data } = await client
    .from("drivers")
    .select("id")
    .eq("id", driverId)
    .eq("school_id", schoolId)
    .is("deleted_at", null)
    .maybeSingle();
  return Boolean(data);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { routeId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const auth = await authorize(req, typeof body?.school_id === "string" ? body.school_id : null);
  if (!auth.ok) return auth.error;
  const { actorSupabase, targetSchoolId } = auth;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body?.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (body?.monthly_fee !== undefined) {
    const fee = Number(body.monthly_fee);
    if (!Number.isFinite(fee) || fee < 0) return transportError("قيمة الاشتراك غير صالحة.", 400);
    patch.monthly_fee = fee;
  }
  if (typeof body?.is_active === "boolean") patch.is_active = body.is_active;

  for (const key of ["driver_id", "backup_driver_id"] as const) {
    if (body && key in body) {
      const value = body[key];
      if (value === null || value === "") {
        patch[key] = null;
      } else if (typeof value === "string") {
        if (!(await driverExists(actorSupabase, targetSchoolId, value))) {
          return transportError("السائق المحدد غير موجود.", 400);
        }
        patch[key] = value;
      }
    }
  }

  const { data, error } = await actorSupabase
    .from("bus_routes")
    .update(patch)
    .eq("id", routeId)
    .eq("school_id", targetSchoolId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) return transportError("تعذر تحديث الخط.", 500);
  if (!data) return transportError("الخط غير موجود.", 404);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { routeId } = await params;
  const auth = await authorize(req, req.nextUrl.searchParams.get("schoolId"));
  if (!auth.ok) return auth.error;
  const { actorSupabase, targetSchoolId } = auth;

  const { data, error } = await actorSupabase
    .from("bus_routes")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", routeId)
    .eq("school_id", targetSchoolId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) return transportError("تعذر حذف الخط.", 500);
  if (!data) return transportError("الخط غير موجود.", 404);
  return NextResponse.json({ ok: true });
}
