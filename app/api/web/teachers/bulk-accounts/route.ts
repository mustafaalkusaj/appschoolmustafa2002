import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { jsonError, logRouteError } from "@/lib/route-utils";

function generateUsername(): string {
  const bytes = randomBytes(2);
  const digits = String(((bytes[0] * 256 + bytes[1]) % 9000) + 1000);
  return `t${digits}`;
}

function generatePassword(): string {
  const bytes = randomBytes(3);
  const n = (bytes[0] * 65536 + bytes[1] * 256 + bytes[2]) % 900000 + 100000;
  return String(n);
}

/** POST /api/web/teachers/bulk-accounts — bulk generate app accounts */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id : null;
  const teacherIds = Array.isArray(body?.teacherIds) ? (body.teacherIds as string[]) : [];

  if (!schoolId) {
    return jsonError("school_id مطلوب.", 400);
  }
  if (teacherIds.length === 0) {
    return jsonError("يجب تحديد معلم واحد على الأقل.", 400);
  }
  if (teacherIds.length > 100) {
    return jsonError("لا يمكن توليد حسابات لأكثر من 100 معلم في وقت واحد.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إدارة حسابات الأساتذة متاحة للإدارة فقط.",
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

  const branchScope = resolveBranchScope(context.value);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const [rateLimited, canManage] = await Promise.all([
    enforceRateLimit(req, {
      namespace: "teachers-bulk-accounts",
      windowMs: 60_000,
      maxHits: 10,
      identifier: actorUserId,
    }),
    routeUserHasPermission(actorSupabase, actorUserId, "manage_teachers"),
  ]);

  if (rateLimited) return rateLimited;
  if (!canManage) {
    return jsonError("ليس لديك صلاحية إدارة حسابات الأساتذة.", 403);
  }

  try {
    // Fetch teachers that don't already have accounts (branch-scoped)
    const { data: teachers, error: fetchError } = await applyBranchScopeToQuery(
      actorSupabase
        .from("teachers")
        .select("id, full_name, employee_id, app_username")
        .in("id", teacherIds)
        .eq("school_id", targetSchoolId)
        .neq("status", "deleted"),
      branchScope.value,
    );

    if (fetchError || !teachers) {
      logRouteError("teachers-bulk-accounts", fetchError, { actorUserId, schoolId: targetSchoolId });
      return jsonError("تعذر تحميل بيانات الأساتذة.", 500);
    }

    const results: Array<{ teacherId: string; username: string; password: string }> = [];
    const errors: Array<{ teacherId: string; error: string }> = [];

    for (const teacher of teachers) {
      // Skip teachers that already have an account
      if (teacher.app_username) {
        errors.push({ teacherId: teacher.id, error: "يوجد حساب مسبق" });
        continue;
      }

      const username = generateUsername();
      const password = generatePassword();

      // TODO(C1-MIGRATION): Remove app_password_plain write once managed_user_credentials
      // is the sole credential store. Passwords are returned to the caller in
      // `results` and must not be exposed via list/GET API responses.
      const { error: updateError } = await actorSupabase
        .from("teachers")
        .update({
          app_username: username,
          app_password_plain: password,
          app_status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", teacher.id)
        .eq("school_id", targetSchoolId);

      if (updateError) {
        logRouteError("teachers-bulk-accounts-update", updateError, {
          teacherId: teacher.id,
          actorUserId,
          schoolId: targetSchoolId,
        });
        errors.push({ teacherId: teacher.id, error: updateError.message });
      } else {
        results.push({ teacherId: teacher.id, username, password });
      }
    }

    return NextResponse.json({ ok: true, results, errors }, { status: 201 });
  } catch (error) {
    logRouteError("teachers-bulk-accounts", error, { actorUserId, schoolId: targetSchoolId });
    return jsonError("تعذر توليد حسابات الأساتذة.", 500);
  }
}
