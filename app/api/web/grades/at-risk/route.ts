import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { fetchGradeEntriesForSection } from "@/lib/grades/grade-entries-server";
import { fetchGradeSchemes } from "@/lib/grades/grade-schemes-server";
import { detectAtRiskStudents } from "@/lib/grades/at-risk-detector";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "عرض الطلاب في خطر متاح ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من الصلاحيات.",
      "status" in context ? context.status : 500,
    );
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "grades-at-risk",
    windowMs: 60_000,
    maxHits: 60,
    identifier: context.value.actorUserId,
  });

  if (rateLimited) {
    return jsonError("تجاوزت الحد الأقصى. حاول مجدداً بعد دقيقة.", 429);
  }

  const hasPermission = await routeUserHasPermission(
    context.value.actorSupabase,
    context.value.actorUserId,
    "view_grades",
  );

  if (!hasPermission) {
    return jsonError("ليس لديك صلاحية لعرض هذه البيانات.", 403);
  }

  const { actorSupabase, targetSchoolId } = context.value;

  const branchScope = resolveBranchScope(context.value);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const academicYear = searchParams.get("academicYear") ?? "";
  const semesterRaw = searchParams.get("semester");
  const semester = semesterRaw === "2" ? (2 as const) : (1 as const);
  const classId = searchParams.get("classId") ?? undefined;

  if (!academicYear) {
    return jsonError("السنة الدراسية مطلوبة.", 400);
  }

  let branchStudentIds: string[] | undefined;
  if (branchScope.value.branchIds.length > 0) {
    const { data: bs } = await applyBranchScopeToQuery(
      actorSupabase.from("students").select("id").eq("school_id", targetSchoolId),
      branchScope.value,
    );
    branchStudentIds = ((bs ?? []) as Array<{ id: string }>).map((s) => s.id);
  }

  const [entriesResult, schemesResult] = await Promise.all([
    fetchGradeEntriesForSection(actorSupabase, targetSchoolId, {
      classId,
      academicYear,
      semester,
      studentIds: branchStudentIds,
    }),
    fetchGradeSchemes(actorSupabase, targetSchoolId),
  ]);

  if (!entriesResult.ok) {
    return NextResponse.json({
      ok: false,
      gate: entriesResult.gate,
      report: { atRiskStudents: [], watchCount: 0, concernCount: 0, criticalCount: 0, totalAtRisk: 0 },
    });
  }

  const scheme = schemesResult.gradeTypes?.[0] ?? null;
  const report = detectAtRiskStudents(entriesResult.items, null);

  return NextResponse.json({ ok: true, gate: { available: true }, report });
}
