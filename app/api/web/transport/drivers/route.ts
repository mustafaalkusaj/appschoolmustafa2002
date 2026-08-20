import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { transportError } from "@/lib/transport/server";

/** List / create drivers. Admin-side of the transport module. */
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
    namespace: "transport-drivers", windowMs: 60_000, maxHits: 60, identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const branchScope = resolveBranchScope(
    context.value,
    req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id"),
  );
  if (!branchScope.ok) return transportError(branchScope.message, branchScope.status);

  const { data, error } = await applyBranchScopeToQuery(
    actorSupabase
      .from("drivers")
      .select("id, full_name, phone, national_id, license_number, license_expiry, license_type, vehicle_plate, vehicle_model, vehicle_color, vehicle_year, vehicle_photo_url, address, date_of_birth, blood_type, emergency_contact_name, emergency_contact_phone, insurance_expiry, inspection_expiry, status, notes, user_profile_id, branch_id, created_at")
      .eq("school_id", targetSchoolId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1_000),
    branchScope.value,
  );
  if (error) return transportError("تعذر تحميل السواق.", 500);

  return NextResponse.json({ ok: true, drivers: data ?? [] }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

export async function POST(req: NextRequest) {
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
  if (!(await routeUserHasPermission(actorSupabase, actorUserId, "manage_transport"))) {
    return transportError("ليس لديك صلاحية إدارة النقل المدرسي.", 403);
  }
  const rateLimited = await enforceRateLimit(req, {
    namespace: "transport-drivers-write", windowMs: 60_000, maxHits: 30, identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return transportError("جسم الطلب غير صالح.", 400);
  }

  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  if (!fullName) return transportError("اسم السائق مطلوب.", 400);

  const branchScope = resolveBranchScope(
    context.value,
    typeof body.branch_id === "string" ? body.branch_id : null,
  );
  if (!branchScope.ok) return transportError(branchScope.message, branchScope.status);

  const asText = (key: string) =>
    typeof body[key] === "string" && (body[key] as string).trim() ? (body[key] as string).trim() : null;

  const { data, error } = await actorSupabase
    .from("drivers")
    .insert({
      school_id: targetSchoolId,
      branch_id: branchScope.value.branchId,
      full_name: fullName,
      phone: asText("phone"),
      national_id: asText("national_id"),
      license_number: asText("license_number"),
      license_expiry: asText("license_expiry"),
      license_type: asText("license_type"),
      vehicle_plate: asText("vehicle_plate"),
      vehicle_model: asText("vehicle_model"),
      vehicle_color: asText("vehicle_color"),
      vehicle_year: asText("vehicle_year"),
      address: asText("address"),
      date_of_birth: asText("date_of_birth"),
      blood_type: asText("blood_type"),
      emergency_contact_name: asText("emergency_contact_name"),
      emergency_contact_phone: asText("emergency_contact_phone"),
      insurance_expiry: asText("insurance_expiry"),
      inspection_expiry: asText("inspection_expiry"),
      notes: asText("notes"),
    })
    .select("id")
    .single();

  if (error || !data) return transportError("تعذر إضافة السائق.", 500);
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
