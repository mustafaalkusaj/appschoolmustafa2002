import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { jsonError } from "@/lib/route-utils";
import { filterAllowedPageCodes } from "@/lib/authorization/page-access";

const createEmployeeSchema = z.object({
  full_name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  phone: z.string().max(30).nullable().optional(),
  job_title: z.string().max(100).nullable().optional(),
  school_role_id: z.string().uuid(),
  is_single_page_user: z.boolean().optional(),
  allowed_pages: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin"], roleDeniedMessage: "غير مصرح" },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "غير مصرح", "status" in context ? context.status : 403);
  }
  const { targetSchoolId, actorBranchId } = context.value;
  const service = createServiceSupabaseClient();
  let query = service
    .from("user_profiles")
    .select("id, full_name, email, avatar_url, is_active, job_title, school_role_id")
    .eq("school_id", targetSchoolId);
  if (actorBranchId) {
    query = query.eq("branch_id", actorBranchId);
  }
  const { data, error } = await query.order("full_name");
  if (error) return jsonError("تعذر تحميل المستخدمين", 500);
  return NextResponse.json({ ok: true, users: data ?? [] });
}

export async function POST(req: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin"], roleDeniedMessage: "غير مصرح" },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "غير مصرح", "status" in context ? context.status : 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = createEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("بيانات غير صحيحة", 400);
  }

  const { targetSchoolId, actorBranchId } = context.value;
  const service = createServiceSupabaseClient();

  // Page scope lives in the user_page_access table, not on user_profiles —
  // allowed_pages is derived from it at snapshot time. Unknown codes are
  // dropped rather than stored, so a typo cannot mint an unreachable grant.
  const allowedPages = filterAllowedPageCodes(parsed.data.allowed_pages ?? []);

  // Verify school_role_id belongs to this school
  const { data: role } = await service
    .from("school_roles")
    .select("id")
    .eq("id", parsed.data.school_role_id)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (!role) return jsonError("الدور المحدد غير موجود", 404);

  // Create Supabase auth user
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email: parsed.data.email.trim().toLowerCase(),
    password: parsed.data.password,
    email_confirm: true,
  });

  if (authError || !authData?.user) {
    const status = authError?.message?.toLowerCase().includes("already") ? 409 : 400;
    return jsonError(authError?.message ?? "تعذر إنشاء الحساب", status);
  }

  const authUserId = authData.user.id;

  // Insert user_profile record
  const { data: profile, error: profileError } = await service
    .from("user_profiles")
    .insert({
      id: authUserId,
      school_id: targetSchoolId,
      role: "employee",
      full_name: parsed.data.full_name.trim(),
      email: parsed.data.email.trim().toLowerCase(),
      phone: parsed.data.phone ?? null,
      job_title: parsed.data.job_title ?? null,
      school_role_id: parsed.data.school_role_id,
      is_single_page_user: allowedPages.length === 1,
      is_active: true,
    })
    .select("id, full_name, email, avatar_url, is_active, job_title, school_id, is_single_page_user")
    .single();

  if (profileError) {
    await service.auth.admin.deleteUser(authUserId);
    return jsonError("تعذر إنشاء ملف المستخدم", 500);
  }

  // Persist the page grants the caller asked for. Rolling back on failure
  // matters: a user created with no page access lands on an empty shell and
  // looks "broken" rather than "half-saved".
  if (allowedPages.length > 0) {
    const { error: pageAccessError } = await service.from("user_page_access").insert(
      allowedPages.map((pageCode) => ({
        user_id: authUserId,
        school_id: targetSchoolId,
        branch_id: actorBranchId ?? null,
        page_code: pageCode,
        can_view: true,
      })),
    );

    if (pageAccessError) {
      await service.from("user_page_access").delete().eq("user_id", authUserId);
      await service.from("user_profiles").delete().eq("id", authUserId);
      await service.auth.admin.deleteUser(authUserId);
      return jsonError("تعذر حفظ صلاحيات الصفحات", 500);
    }
  }

  return NextResponse.json(
    { ok: true, user: { ...profile, auth_user_id: authUserId, school_id: targetSchoolId } },
    { status: 201 },
  );
}
