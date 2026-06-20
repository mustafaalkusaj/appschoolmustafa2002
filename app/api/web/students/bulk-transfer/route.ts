import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isValidUUID } from "@/lib/route-utils";
import { RBAC_COOKIE_NAME, verifyRBACSession } from "@/lib/rbac-session";
import { invalidateSchoolCacheDomains } from "@/lib/server-cache";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { checkPermission } from "@/lib/perm-check";
import { hasPermissionInList } from "@/types/roles";
import type { StudentStatus } from "@/types/student";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

// POST: bulk class transfer (promotion) — promotes many students into one
// target class in a single scoped UPDATE instead of N PATCH requests.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id : null;
  const requestedBranchId = typeof body?.branch_id === "string" ? body.branch_id : null;
  const targetClassName = typeof body?.target_class_name === "string" ? body.target_class_name.trim() : "";
  const rawIds = Array.isArray(body?.student_ids) ? body.student_ids : [];
  const studentIds = Array.from(
    new Set(rawIds.filter((id): id is string => typeof id === "string" && isValidUUID(id))),
  );

  if (!targetClassName) {
    return jsonError("اسم الصف المستهدف مطلوب.", 400);
  }
  if (studentIds.length === 0) {
    return jsonError("لا يوجد طلاب صالحون للترقية.", 400);
  }

  // edit_students permission — same gate as the single-student transfer PATCH.
  const session = await verifyRBACSession(req.cookies.get(RBAC_COOKIE_NAME)?.value);
  if (!session?.userActive) {
    return jsonError("يجب تسجيل الدخول أولاً.", 401);
  }
  const hasEdit = session.deepPermissions
    ? checkPermission(session.deepPermissions, "students.update")
    : hasPermissionInList(session.permissions, "edit_students");
  if (!hasEdit) {
    return jsonError("لا تملك صلاحية تعديل بيانات الطلاب.", 403);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "إدارة الطلاب متاحة ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "students-bulk-transfer",
    windowMs: 60_000,
    maxHits: 30,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  const { targetSchoolId } = context.value;
  const serviceSupabase = createServiceSupabaseClient();

  // Validate the target class exists within the actor's branch scope.
  let classesQuery = serviceSupabase
    .from("classes")
    .select("id")
    .eq("school_id", targetSchoolId)
    .eq("grade", targetClassName)
    .limit(1);
  if (branchScope.value.branchId) {
    classesQuery = classesQuery.eq("branch_id", branchScope.value.branchId);
  } else if (branchScope.value.branchIds.length > 0) {
    classesQuery = classesQuery.in("branch_id", branchScope.value.branchIds);
  }

  const [feeResult, classResult] = await Promise.all([
    applyBranchScopeToQuery(
      serviceSupabase
        .from("class_fees")
        .select("class_name")
        .eq("class_name", targetClassName)
        .eq("school_id", targetSchoolId),
      branchScope.value,
    ).maybeSingle<{ class_name: string }>(),
    classesQuery.maybeSingle<{ id: string }>(),
  ]);
  if (!feeResult.data && !classResult.data) {
    return jsonError("الصف المستهدف غير موجود أو غير متاح ضمن فرعك.", 400);
  }

  // Single scoped UPDATE — branch + school + id-set bound it to the actor's reach.
  const { data, error } = await applyBranchScopeToQuery(
    serviceSupabase
      .from("students")
      .update({ class_name: targetClassName, status: "active" satisfies StudentStatus })
      .eq("school_id", targetSchoolId)
      .in("id", studentIds),
    branchScope.value,
  ).select("id");

  if (error) {
    return jsonError(error.message || "تعذر ترقية الطلاب.", 500);
  }

  invalidateSchoolCacheDomains(targetSchoolId, [
    "dashboard-overview",
    "payments-meta",
    "reports-overview",
    "students-meta",
    "students-list",
  ]);

  const promoted = (data ?? []).length;
  return NextResponse.json({ ok: true, promoted, requested: studentIds.length });
}
