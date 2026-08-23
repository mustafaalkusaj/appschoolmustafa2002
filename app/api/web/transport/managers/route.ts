import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

import { enforceRateLimit } from "@/lib/rate-limit";
import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";
import { normalizeUserRole } from "@/types/roles";

function generatePassword(): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  let password = "";
  for (let i = 0; i < 12; i++) password += charset[bytes[i] % charset.length];
  return password;
}

async function requireSuperAdmin(req: NextRequest) {
  const actorSupabase = await createRouteSupabaseClient();
  const {
    data: { user },
    error,
  } = await getRouteAuthenticatedUser(actorSupabase, req.headers.get("authorization"));
  if (error || !user?.id) return { ok: false as const, status: 401, message: "غير مصرح." };

  const { data: profile } = await actorSupabase
    .from("user_profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.is_active === false || normalizeUserRole(profile.role) !== "super_admin") {
    return { ok: false as const, status: 403, message: "هذه الصفحة متاحة للسوبر أدمن فقط." };
  }
  return { ok: true as const, actorId: user.id };
}

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: { message: auth.message } }, { status: auth.status });

  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from("user_profiles")
    .select("id, full_name, email, phone, role, school_id, branch_id, is_active, created_at")
    .eq("role", "transport_manager")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  }

  const schoolIds = Array.from(new Set((data ?? []).map((u) => u.school_id).filter(Boolean))) as string[];
  const branchIds = Array.from(new Set((data ?? []).map((u) => u.branch_id).filter(Boolean))) as string[];

  let schoolMap: Record<string, string> = {};
  let branchMap: Record<string, string> = {};

  if (schoolIds.length > 0) {
    const { data: schools } = await service
      .from("schools")
      .select("id, name")
      .in("id", schoolIds);
    schoolMap = Object.fromEntries((schools ?? []).map((s) => [s.id, s.name]));
  }

  if (branchIds.length > 0) {
    const { data: branches } = await service
      .from("branches")
      .select("id, name")
      .in("id", branchIds);
    branchMap = Object.fromEntries((branches ?? []).map((b) => [b.id, b.name]));
  }

  const managers = (data ?? []).map((u) => ({
    ...u,
    username: (u.email ?? "").replace("@schoolapp.local", ""),
    school_name: u.school_id ? schoolMap[u.school_id] ?? null : null,
    branch_name: u.branch_id ? branchMap[u.branch_id] ?? null : null,
  }));

  return NextResponse.json({ managers });
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: { message: auth.message } }, { status: auth.status });

  const rateLimited = await enforceRateLimit(req, {
    namespace: "transport-manager-create",
    windowMs: 60_000,
    maxHits: 10,
    identifier: auth.actorId,
  });
  if (rateLimited) return rateLimited;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const fullName = typeof body?.full_name === "string" ? body.full_name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";
  const branchId = typeof body?.branch_id === "string" ? body.branch_id.trim() : "";

  if (!fullName) return NextResponse.json({ error: { message: "الاسم مطلوب." } }, { status: 400 });
  if (!schoolId) return NextResponse.json({ error: { message: "المدرسة مطلوبة." } }, { status: 400 });
  if (!branchId) return NextResponse.json({ error: { message: "الفرع مطلوب." } }, { status: 400 });

  const service = createServiceSupabaseClient();

  const { data: school } = await service
    .from("schools")
    .select("id")
    .eq("id", schoolId)
    .maybeSingle();
  if (!school) return NextResponse.json({ error: { message: "المدرسة غير موجودة." } }, { status: 400 });

  const { data: branch } = await service
    .from("branches")
    .select("id")
    .eq("id", branchId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!branch) return NextResponse.json({ error: { message: "الفرع غير موجود أو لا ينتمي لهذه المدرسة." } }, { status: 400 });

  const { data: existing } = await service
    .from("user_profiles")
    .select("id")
    .eq("role", "transport_manager")
    .eq("school_id", schoolId)
    .eq("branch_id", branchId)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: { message: "يوجد مدير نقل بالفعل لهذا الفرع. يمكنك إعادة تعيين كلمة المرور." } },
      { status: 409 },
    );
  }

  let username = "";
  for (let attempt = 0; attempt < 20 && !username; attempt++) {
    const bytes = randomBytes(2);
    const candidate = `tm${String(((bytes[0] * 256 + bytes[1]) % 9000) + 1000)}`;
    const { data: clash } = await service
      .from("user_profiles")
      .select("id")
      .eq("email", `${candidate}@schoolapp.local`)
      .maybeSingle();
    if (!clash) username = candidate;
  }
  if (!username) return NextResponse.json({ error: { message: "تعذر توليد اسم مستخدم." } }, { status: 500 });

  const email = `${username}@schoolapp.local`;
  const password = generatePassword();

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "transport_manager", full_name: fullName },
  });
  if (authError || !authData?.user) {
    return NextResponse.json(
      { error: { message: authError?.message || "تعذر إنشاء حساب المصادقة." } },
      { status: 400 },
    );
  }
  const authUserId = authData.user.id;

  const { error: profileError } = await service.from("user_profiles").insert({
    id: authUserId,
    full_name: fullName,
    email,
    phone: phone || null,
    role: "transport_manager",
    school_id: schoolId,
    branch_id: branchId,
    is_active: true,
  });
  if (profileError) {
    await service.auth.admin.deleteUser(authUserId).catch(() => undefined);
    return NextResponse.json({ error: { message: "تعذر إنشاء ملف المستخدم." } }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, credentials: { username, email, password } },
    { status: 201 },
  );
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: { message: auth.message } }, { status: auth.status });

  const rateLimited = await enforceRateLimit(req, {
    namespace: "transport-manager-patch",
    windowMs: 60_000,
    maxHits: 10,
    identifier: auth.actorId,
  });
  if (rateLimited) return rateLimited;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const managerId = typeof body?.manager_id === "string" ? body.manager_id.trim() : "";
  const action = typeof body?.action === "string" ? body.action : "";

  if (!managerId) return NextResponse.json({ error: { message: "معرّف المدير مطلوب." } }, { status: 400 });

  const service = createServiceSupabaseClient();

  const { data: manager } = await service
    .from("user_profiles")
    .select("id, email, is_active")
    .eq("id", managerId)
    .eq("role", "transport_manager")
    .maybeSingle();
  if (!manager) return NextResponse.json({ error: { message: "مدير النقل غير موجود." } }, { status: 404 });

  if (action === "reset_password") {
    const password = generatePassword();
    const { error } = await service.auth.admin.updateUserById(managerId, { password });
    if (error) return NextResponse.json({ error: { message: "تعذر إعادة تعيين كلمة المرور." } }, { status: 500 });

    return NextResponse.json({
      ok: true,
      credentials: {
        username: (manager.email ?? "").replace("@schoolapp.local", ""),
        email: manager.email,
        password,
      },
    });
  }

  if (action === "toggle_active") {
    const newStatus = !manager.is_active;
    const { error } = await service
      .from("user_profiles")
      .update({ is_active: newStatus, updated_at: new Date().toISOString() })
      .eq("id", managerId);
    if (error) return NextResponse.json({ error: { message: "تعذر تحديث الحالة." } }, { status: 500 });

    return NextResponse.json({ ok: true, is_active: newStatus });
  }

  return NextResponse.json({ error: { message: "إجراء غير معروف." } }, { status: 400 });
}
