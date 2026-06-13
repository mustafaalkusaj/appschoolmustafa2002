import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { fetchGradeAnalytics, type GradeAnalyticsFilter } from "@/lib/grades/grade-entries-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

async function resolveContext(
  req: NextRequest,
  schoolId: string | null,
) {
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "تحليلات الدرجات متاحة ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return {
      ok: false as const,
      response: jsonError(
        "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
        "status" in context ? context.status : 500,
      ),
    };
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "grades-analytics",
    windowMs: 60_000,
    maxHits: 30,
    identifier: context.value.actorUserId,
  });

  if (rateLimited) {
    return { ok: false as const, response: rateLimited };
  }

  return { ok: true as const, value: context.value };
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const schoolId = params.get("schoolId");
  const academicYear = params.get("academicYear");

  if (!academicYear) {
    return jsonError("academicYear مطلوب.", 400);
  }

  const context = await resolveContext(req, schoolId);
  if (!context.ok) {
    return context.response;
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const branchScope = resolveBranchScope(context.value);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const canView = await routeUserHasPermission(actorSupabase, actorUserId, "view_grade_analytics");
  if (!canView) {
    return jsonError("ليس لديك صلاحية عرض تحليلات الدرجات.", 403);
  }

  const semesterRaw = params.get("semester");
  const semesterParsed = semesterRaw ? parseInt(semesterRaw, 10) : NaN;
  const semester: 1 | 2 | undefined =
    semesterParsed === 1 || semesterParsed === 2 ? semesterParsed : undefined;

  const filters: GradeAnalyticsFilter = {
    academicYear,
    classId: params.get("classId") ?? undefined,
    semester,
  };

  let branchStudentIds: string[] | undefined;
  if (branchScope.value.branchIds.length > 0) {
    const { data: bs } = await applyBranchScopeToQuery(
      actorSupabase.from("students").select("id").eq("school_id", targetSchoolId),
      branchScope.value,
    );
    branchStudentIds = ((bs ?? []) as Array<{ id: string }>).map((s) => s.id);
  }

  const result = await fetchGradeAnalytics(actorSupabase, targetSchoolId, filters, branchStudentIds);

  return NextResponse.json({
    ok: result.ok,
    gate: result.gate,
    data: result.data,
    count: result.data.length,
  });
}
