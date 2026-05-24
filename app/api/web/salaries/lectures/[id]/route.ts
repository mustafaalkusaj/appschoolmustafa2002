import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: lectureId } = await params;
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  if (!lectureId) return jsonError("معرف المحاضرة مطلوب.", 400);

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "حذف المحاضرات متاح للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "salaries-lectures",
    windowMs: 60_000,
    maxHits: 120,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canManageSalaries = await routeUserHasPermission(actorSupabase, actorUserId, "manage_salaries");
  if (!canManageSalaries) {
    return jsonError("ليس لديك صلاحية حذف المحاضرات.", 403);
  }

  const branchScope = resolveBranchScope(context.value);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  // Branch isolation: verify lecture belongs to a teacher in this branch
  if (branchScope.value.branchIds.length > 0) {
    const { data: lecture } = await actorSupabase
      .from("daily_lectures")
      .select("teacher_id")
      .eq("id", lectureId)
      .eq("school_id", targetSchoolId)
      .maybeSingle();
    const teacherId = (lecture as Record<string, unknown> | null)?.teacher_id as string | null;
    if (!teacherId) return jsonError("المحاضرة غير موجودة.", 404);
    const { data: teacherCheck } = await applyBranchScopeToQuery(
      actorSupabase.from("teachers").select("id").eq("id", teacherId),
      branchScope.value,
    ).limit(1);
    if (!teacherCheck || (teacherCheck as unknown[]).length === 0) {
      return jsonError("لا يمكنك حذف محاضرات أساتذة من فرع آخر.", 403);
    }
  }

  const { error } = await actorSupabase
    .from("daily_lectures")
    .delete()
    .eq("id", lectureId)
    .eq("school_id", targetSchoolId);

  if (error) return jsonError(error.message || "تعذر حذف المحاضرة.", 500);

  return NextResponse.json({ ok: true });
}
