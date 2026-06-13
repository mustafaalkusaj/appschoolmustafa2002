import { NextRequest, NextResponse } from "next/server";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { jsonError, logRouteError } from "@/lib/route-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  const { teacherId } = await params;
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "إدارة الأساتذة متاحة ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const branchScope = resolveBranchScope(context.value, null);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const [rateLimited, canViewTeachers] = await Promise.all([
    enforceRateLimit(req, {
      namespace: "teachers-notifications-get",
      windowMs: 60_000,
      maxHits: 120,
      identifier: actorUserId,
    }),
    routeUserHasPermission(actorSupabase, actorUserId, "view_teachers"),
  ]);

  if (rateLimited) return rateLimited;
  if (!canViewTeachers) {
    return jsonError("ليس لديك صلاحية عرض الأساتذة.", 403);
  }

  // Branch isolation: verify teacher belongs to this school and branch
  const { data: teacherCheck } = await applyBranchScopeToQuery(
    actorSupabase.from("teachers").select("id")
      .eq("id", teacherId).eq("school_id", targetSchoolId),
    branchScope.value,
  ).maybeSingle();
  if (!teacherCheck) {
    return jsonError("المعلم غير موجود ضمن المدرسة الحالية.", 404);
  }

  try {
    const { data, error } = await actorSupabase
      .from("notifications")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      logRouteError("teachers-notifications-get", error, { teacherId });
      return jsonError("تعذر تحميل الإشعارات.", 500);
    }

    return NextResponse.json({ ok: true, notifications: data ?? [] });
  } catch (error) {
    logRouteError("teachers-notifications-get", error, { teacherId });
    return jsonError("تعذر تحميل الإشعارات.", 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  const { teacherId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id : null;

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إرسال الإشعارات متاح للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const branchScope = resolveBranchScope(context.value, null);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const [rateLimited, canManageTeachers] = await Promise.all([
    enforceRateLimit(req, {
      namespace: "teachers-notifications-post",
      windowMs: 60_000,
      maxHits: 40,
      identifier: actorUserId,
    }),
    routeUserHasPermission(actorSupabase, actorUserId, "manage_teachers"),
  ]);

  if (rateLimited) return rateLimited;
  if (!canManageTeachers) {
    return jsonError("ليس لديك صلاحية إدارة الأساتذة.", 403);
  }

  // Branch isolation: verify teacher belongs to this school and branch
  const { data: teacherCheckPost } = await applyBranchScopeToQuery(
    actorSupabase.from("teachers").select("id")
      .eq("id", teacherId).eq("school_id", targetSchoolId),
    branchScope.value,
  ).maybeSingle();
  if (!teacherCheckPost) {
    return jsonError("المعلم غير موجود ضمن المدرسة الحالية.", 404);
  }

  try {
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const type = typeof body?.type === "string" ? body.type : "general";

    if (!title) {
      return jsonError("عنوان الإشعار مطلوب.", 400);
    }
    if (!message) {
      return jsonError("نص الإشعار مطلوب.", 400);
    }

    const { data, error } = await actorSupabase
      .from("notifications")
      .insert({
        teacher_id: teacherId,
        school_id: targetSchoolId,
        title,
        message,
        type,
        is_read: false,
      })
      .select("*")
      .single();

    if (error || !data) {
      logRouteError("teachers-notifications-post", error, { teacherId, actorUserId, schoolId: targetSchoolId });
      return jsonError(error?.message || "تعذر إرسال الإشعار.", 500);
    }

    return NextResponse.json({ ok: true, notification: data }, { status: 201 });
  } catch (error) {
    logRouteError("teachers-notifications-post", error, { teacherId, actorUserId, schoolId: targetSchoolId });
    return jsonError("تعذر إرسال الإشعار.", 500);
  }
}
