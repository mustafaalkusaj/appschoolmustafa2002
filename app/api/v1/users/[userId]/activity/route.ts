import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { jsonError } from "@/lib/route-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin"], roleDeniedMessage: "غير مصرح" },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "غير مصرح", "status" in context ? context.status : 403);
  }

  const { targetSchoolId } = context.value;
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || "50"), 100);

  const service = createServiceSupabaseClient();

  const { data: userCheck } = await service
    .from("user_profiles")
    .select("id")
    .eq("id", userId)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (!userCheck) return jsonError("المستخدم غير موجود", 404);

  const { data, error } = await service
    .from("audit_logs")
    .select("id, created_at, actor_name, actor_email, action_type, entity_type, summary, metadata")
    .eq("school_id", targetSchoolId)
    .eq("entity_type", "user")
    .eq("entity_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return jsonError("تعذر تحميل سجل العمليات", 500);

  return NextResponse.json({ ok: true, logs: data ?? [] });
}
