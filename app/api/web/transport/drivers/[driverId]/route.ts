import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { transportError } from "@/lib/transport/server";

type Ctx = { params: Promise<{ driverId: string }> };

async function authorize(req: NextRequest, schoolId: string | null) {
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin"], roleDeniedMessage: "النقل المدرسي متاح للإدارة فقط." },
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
    namespace: "transport-driver-write", windowMs: 60_000, maxHits: 30, identifier: actorUserId,
  });
  if (rateLimited) return { ok: false as const, error: rateLimited };
  return { ok: true as const, actorSupabase, targetSchoolId };
}

const EDITABLE = [
  "full_name", "phone", "national_id", "license_number", "license_expiry",
  "vehicle_plate", "vehicle_model", "notes",
] as const;

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { driverId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const auth = await authorize(req, typeof body?.school_id === "string" ? body.school_id : null);
  if (!auth.ok) return auth.error;
  const { actorSupabase, targetSchoolId } = auth;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of EDITABLE) {
    if (typeof body?.[key] === "string") patch[key] = (body[key] as string).trim() || null;
  }
  if (body?.status === "active" || body?.status === "suspended" || body?.status === "on_leave") {
    patch.status = body.status;
  }

  const { data, error } = await actorSupabase
    .from("drivers")
    .update(patch)
    .eq("id", driverId)
    .eq("school_id", targetSchoolId)
    .is("deleted_at", null)
    .select("id, status, user_profile_id")
    .maybeSingle();
  if (error) return transportError("تعذر تحديث السائق.", 500);
  if (!data) return transportError("السائق غير موجود.", 404);

  // Suspending a driver must also cut his web session: current_driver_id()
  // filters on status, and user_profiles.is_active gates login.
  if (data.user_profile_id && patch.status) {
    const service = createServiceSupabaseClient();
    await service
      .from("user_profiles")
      .update({ is_active: patch.status === "active" })
      .eq("id", data.user_profile_id);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { driverId } = await params;
  const auth = await authorize(req, req.nextUrl.searchParams.get("schoolId"));
  if (!auth.ok) return auth.error;
  const { actorSupabase, targetSchoolId } = auth;

  const { data, error } = await actorSupabase
    .from("drivers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", driverId)
    .eq("school_id", targetSchoolId)
    .is("deleted_at", null)
    .select("id, user_profile_id")
    .maybeSingle();
  if (error) return transportError("تعذر حذف السائق.", 500);
  if (!data) return transportError("السائق غير موجود.", 404);

  if (data.user_profile_id) {
    const service = createServiceSupabaseClient();
    await service.from("user_profiles").update({ is_active: false }).eq("id", data.user_profile_id);
  }
  // Unassign everywhere so the board never shows a deleted driver.
  await actorSupabase.from("bus_routes").update({ driver_id: null }).eq("driver_id", driverId).eq("school_id", targetSchoolId);
  await actorSupabase.from("bus_routes").update({ backup_driver_id: null }).eq("backup_driver_id", driverId).eq("school_id", targetSchoolId);

  return NextResponse.json({ ok: true });
}
