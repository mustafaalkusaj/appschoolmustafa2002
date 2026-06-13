import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError, logRouteError } from "@/lib/route-utils";

const querySchema = z.object({
  schoolId: z.string().uuid("معرّف المدرسة غير صالح."),
});

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId") ?? "";
  const parsed = querySchema.safeParse({ schoolId });
  if (!parsed.success) {
    return jsonError("معرّف المدرسة غير صالح.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إعدادات نهاية السنة متاحة للمسؤولين فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorUserId, actorSupabase, targetSchoolId } = context.value;

  const branchScope = resolveBranchScope(context.value);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "year-end-preview",
    windowMs: 60_000,
    maxHits: 30,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  try {
    const { data: students, error } = await applyBranchScopeToQuery(
      actorSupabase
        .from("students")
        .select("id, class_name, status")
        .eq("school_id", targetSchoolId)
        .neq("status", "graduated"),
      branchScope.value,
    );

    if (error) throw error;

    const activeStudents = students ?? [];
    const totalStudents = activeStudents.length;

    // Students in final grade (السادس) who will graduate
    const GRADUATING_CLASSES = ["السادس", "6"];
    const graduatingStudents = activeStudents.filter(
      (s) => s.class_name && GRADUATING_CLASSES.some((g) => s.class_name!.includes(g)),
    ).length;

    // Build class distribution
    const classCounts: Record<string, number> = {};
    for (const s of activeStudents) {
      const cn = s.class_name ?? "غير محدد";
      classCounts[cn] = (classCounts[cn] ?? 0) + 1;
    }
    const classes_list = Object.entries(classCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json({
      total_students: totalStudents,
      graduating_students: graduatingStudents,
      classes_list,
      will_reset_fees: true,
    });
  } catch (err) {
    logRouteError("year-end-preview", err);
    return jsonError("تعذر تحميل بيانات المعاينة.", 500);
  }
}
