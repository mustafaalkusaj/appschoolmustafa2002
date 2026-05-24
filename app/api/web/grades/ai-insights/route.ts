import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { fetchGradeAnalytics } from "@/lib/grades/grade-entries-server";
import { fetchGradeEntriesForSection } from "@/lib/grades/grade-entries-server";
import { fetchGradeSchemes } from "@/lib/grades/grade-schemes-server";
import { detectAtRiskStudents } from "@/lib/grades/at-risk-detector";
import { streamGradeAnalysis } from "@/lib/grades/ai-analysis";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("طلب غير صالح.", 400);
  }

  const { academicYear, semester, classId, className } = body as {
    academicYear?: string;
    semester?: number;
    classId?: string;
    className?: string;
  };

  if (!academicYear) {
    return jsonError("السنة الدراسية مطلوبة.", 400);
  }

  // Extract schoolId from body or header
  const schoolId = (body as Record<string, unknown>).schoolId as string | null ?? null;

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "تحليل الدرجات متاح ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من الصلاحيات.",
      "status" in context ? context.status : 500,
    );
  }

  // Strict rate limit for AI calls (10 per minute per user)
  const rateLimited = await enforceRateLimit(req, {
    namespace: "grades-ai-insights",
    windowMs: 60_000,
    maxHits: 10,
    identifier: context.value.actorUserId,
  });

  if (rateLimited) {
    return jsonError("تجاوزت الحد الأقصى لطلبات التحليل. حاول مجدداً بعد دقيقة.", 429);
  }

  const hasPermission = await routeUserHasPermission(
    context.value.actorSupabase,
    context.value.actorUserId,
    "view_grade_analytics",
  );

  if (!hasPermission) {
    return jsonError("ليس لديك صلاحية لتحليل الدرجات.", 403);
  }

  const { actorSupabase, targetSchoolId } = context.value;
  const resolvedSemester = semester === 2 ? (2 as const) : (1 as const);

  const branchScope = resolveBranchScope(context.value);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  let branchStudentIds: string[] | undefined;
  if (branchScope.value.branchIds.length > 0) {
    const { data: bs } = await applyBranchScopeToQuery(
      actorSupabase.from("students").select("id").eq("school_id", targetSchoolId),
      branchScope.value,
    );
    branchStudentIds = ((bs ?? []) as Array<{ id: string }>).map((s) => s.id);
  }

  // Fetch analytics + entries + scheme in parallel
  const [analyticsResult, entriesResult, schemesResult] = await Promise.all([
    fetchGradeAnalytics(actorSupabase, targetSchoolId, {
      academicYear,
      semester: resolvedSemester,
      classId,
    }, branchStudentIds),
    fetchGradeEntriesForSection(actorSupabase, targetSchoolId, {
      classId,
      academicYear,
      semester: resolvedSemester,
      status: "confirmed",
      studentIds: branchStudentIds,
    }),
    fetchGradeSchemes(actorSupabase, targetSchoolId),
  ]);

  if (!analyticsResult.ok) {
    return jsonError(analyticsResult.gate.message ?? "تعذر تحميل بيانات التحليل.", 503);
  }

  const subjectAnalytics = analyticsResult.data;
  const entries = entriesResult.ok ? entriesResult.items : [];
  const scheme = schemesResult.gradeTypes?.[0] ?? null;

  if (!subjectAnalytics.length) {
    return jsonError("لا توجد بيانات كافية للتحليل. تأكد من وجود درجات مؤكدة.", 422);
  }

  // Detect at-risk students
  const atRiskReport = detectAtRiskStudents(entries, null);

  // Map server SubjectAnalytics → dashboard SubjectAnalytics (avgPercentage → avgScore)
  const mappedAnalytics = subjectAnalytics.map((s) => ({
    subjectId: s.subjectId,
    subjectName: s.subjectName,
    avgScore: s.avgPercentage,
    totalStudents: s.totalStudents,
    passingCount: s.passingCount,
    failingCount: s.failingCount,
    passRate: s.passRate,
  }));

  // Compute overall stats
  const totalStudents = mappedAnalytics.reduce((sum: number, s) => sum + s.totalStudents, 0) / Math.max(mappedAnalytics.length, 1);
  const overallAvg = mappedAnalytics.reduce((sum: number, s) => sum + s.avgScore, 0) / Math.max(mappedAnalytics.length, 1);
  const overallPassRate = mappedAnalytics.reduce((sum: number, s) => sum + s.passRate, 0) / Math.max(mappedAnalytics.length, 1);

  // Stream AI analysis
  try {
    const stream = await streamGradeAnalysis({
      academicYear,
      semester: resolvedSemester,
      className,
      subjectAnalytics: mappedAnalytics,
      atRiskReport,
      totalStudents: Math.round(totalStudents),
      overallAvg,
      passRate: Math.round(overallPassRate),
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return jsonError("تعذر تشغيل التحليل الذكي. تحقق من إعدادات Anthropic API.", 500);
  }
}
