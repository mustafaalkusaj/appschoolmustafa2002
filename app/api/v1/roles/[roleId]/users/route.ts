import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { jsonError } from "@/lib/route-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roleId: string }> },
) {
  const { roleId } = await params;
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin"], roleDeniedMessage: "غير مصرح" },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "غير مصرح", "status" in context ? context.status : 403);
  }

  const { targetSchoolId } = context.value;
  const service = createServiceSupabaseClient();

  const { data: role } = await service
    .from("school_roles")
    .select("id")
    .eq("id", roleId)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (!role) return jsonError("الدور غير موجود", 404);

  const { data, error } = await service
    .from("user_profiles")
    .select("id, full_name, email, avatar_url, is_active, job_title")
    .eq("school_role_id", roleId)
    .eq("school_id", targetSchoolId)
    .order("full_name");

  if (error) { return jsonError("تعذر تحميل المستخدمين", 500); }

  return NextResponse.json({ ok: true, users: data ?? [] });
}
