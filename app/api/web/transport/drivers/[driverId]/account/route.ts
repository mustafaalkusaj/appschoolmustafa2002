import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { transportError } from "@/lib/transport/server";

/**
 * Create the driver's WEB login.
 *
 * Drivers sign in on the website like any staff member (auth.users +
 * user_profiles with role='driver'), not through the mobile pipeline —
 * the /driver page is the whole product for them. The generated password is
 * returned exactly once for the admin to hand over.
 */
function generatePassword(): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  let password = "";
  for (let i = 0; i < 12; i++) password += charset[bytes[i] % charset.length];
  return password;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ driverId: string }> },
) {
  const { driverId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id : null;

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
    namespace: "transport-driver-account", windowMs: 60_000, maxHits: 10, identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const service = createServiceSupabaseClient();

  const { data: driver } = await service
    .from("drivers")
    .select("id, full_name, phone, user_profile_id, branch_id")
    .eq("id", driverId)
    .eq("school_id", targetSchoolId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!driver) return transportError("السائق غير موجود.", 404);
  if (driver.user_profile_id) return transportError("هذا السائق لديه حساب دخول بالفعل.", 409);

  // d + 4 digits, unique within auth by the synthetic email domain.
  let username = "";
  for (let attempt = 0; attempt < 20 && !username; attempt++) {
    const bytes = randomBytes(2);
    const candidate = `d${String(((bytes[0] * 256 + bytes[1]) % 9000) + 1000)}`;
    const { data: clash } = await service
      .from("user_profiles")
      .select("id")
      .eq("email", `${candidate}@schoolapp.local`)
      .maybeSingle();
    if (!clash) username = candidate;
  }
  if (!username) return transportError("تعذر توليد اسم مستخدم.", 500);

  const email = `${username}@schoolapp.local`;
  const password = generatePassword();

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "driver", full_name: driver.full_name },
  });
  if (authError || !authData?.user) {
    return transportError(authError?.message || "تعذر إنشاء حساب المصادقة.", 400);
  }
  const authUserId = authData.user.id;

  const { error: profileError } = await service.from("user_profiles").insert({
    id: authUserId,
    full_name: driver.full_name,
    email,
    phone: driver.phone,
    role: "driver",
    school_id: targetSchoolId,
    branch_id: driver.branch_id,
    is_active: true,
  });
  if (profileError) {
    await service.auth.admin.deleteUser(authUserId).catch(() => undefined);
    return transportError("تعذر إنشاء ملف المستخدم.", 500);
  }

  const { error: linkError } = await service
    .from("drivers")
    .update({ user_profile_id: authUserId, updated_at: new Date().toISOString() })
    .eq("id", driverId)
    .eq("school_id", targetSchoolId);
  if (linkError) {
    await service.from("user_profiles").delete().eq("id", authUserId);
    await service.auth.admin.deleteUser(authUserId).catch(() => undefined);
    return transportError("تعذر ربط الحساب بالسائق.", 500);
  }

  // Shown once; never stored in plaintext anywhere.
  return NextResponse.json(
    { ok: true, credentials: { username, email, password } },
    { status: 201 },
  );
}

/** Reset the driver's password. Returned once, like creation. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ driverId: string }> },
) {
  const { driverId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id : null;

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
    namespace: "transport-driver-account", windowMs: 60_000, maxHits: 10, identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const service = createServiceSupabaseClient();
  const { data: driver } = await service
    .from("drivers")
    .select("id, user_profile_id")
    .eq("id", driverId)
    .eq("school_id", targetSchoolId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!driver?.user_profile_id) return transportError("لا يوجد حساب دخول لهذا السائق.", 404);

  const { data: profile } = await service
    .from("user_profiles")
    .select("email")
    .eq("id", driver.user_profile_id)
    .maybeSingle();

  const password = generatePassword();
  const { error } = await service.auth.admin.updateUserById(driver.user_profile_id, { password });
  if (error) return transportError("تعذر إعادة تعيين كلمة المرور.", 500);

  return NextResponse.json({
    ok: true,
    credentials: {
      username: (profile?.email ?? "").replace("@schoolapp.local", ""),
      email: profile?.email ?? "",
      password,
    },
  });
}
