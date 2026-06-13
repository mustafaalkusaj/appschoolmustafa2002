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
      namespace: "teachers-evaluations",
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
      .from("teacher_evaluations")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("school_id", targetSchoolId)
      .order("evaluation_date", { ascending: false });

    if (error) {
      logRouteError("teachers-evaluations-get", error, { teacherId, schoolId: targetSchoolId });
      return jsonError("تعذر تحميل سجل التقييمات.", 500);
    }

    return NextResponse.json({ ok: true, evaluations: data ?? [] });
  } catch (error) {
    logRouteError("teachers-evaluations-get", error, { teacherId, schoolId: targetSchoolId });
    return jsonError("تعذر تحميل سجل التقييمات.", 500);
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
      roleDeniedMessage: "إدارة تقييمات الأساتذة متاحة للإدارة فقط.",
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
      namespace: "teachers-evaluations-create",
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
    const evaluationDate = typeof body?.evaluation_date === "string" ? body.evaluation_date : new Date().toISOString().split("T")[0];
    const toNumOrNull = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const { data, error } = await actorSupabase
      .from("teacher_evaluations")
      .insert({
        teacher_id: teacherId,
        school_id: targetSchoolId,
        evaluation_date: evaluationDate,
        overall_score: toNumOrNull(body?.overall_score),
        overall_grade: typeof body?.overall_grade === "string" ? body.overall_grade : null,
        discipline_score: toNumOrNull(body?.discipline_score),
        curriculum_score: toNumOrNull(body?.curriculum_score),
        student_results_score: toNumOrNull(body?.student_results_score),
        cooperation_score: toNumOrNull(body?.cooperation_score),
        notes: typeof body?.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
        ...(branchScope.value.branchId ? { branch_id: branchScope.value.branchId } : {}),
      })
      .select("*")
      .single();

    if (error || !data) {
      logRouteError("teachers-evaluations-create", error, { teacherId, actorUserId, schoolId: targetSchoolId });
      return jsonError(error?.message || "تعذر إضافة التقييم.", 500);
    }

    return NextResponse.json({ ok: true, evaluation: data }, { status: 201 });
  } catch (error) {
    logRouteError("teachers-evaluations-create", error, { teacherId, actorUserId, schoolId: targetSchoolId });
    return jsonError("تعذر إضافة التقييم.", 500);
  }
}
