import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError, logRouteError } from "@/lib/route-utils";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  schoolId: z.string().uuid("معرّف المدرسة غير صالح."),
  options: z.object({
    promoteStudents: z.boolean().default(true),
    resetFees: z.boolean().default(true),
    notifyParents: z.boolean().default(false),
  }),
});

// Arabic grade progression map
const GRADE_MAP: Record<string, string> = {
  "الأول": "الثاني",
  "الثاني": "الثالث",
  "الثالث": "الرابع",
  "الرابع": "الخامس",
  "الخامس": "السادس",
  "السادس": "مُخرَّج",
};

const FINAL_GRADES = ["السادس", "مُخرَّج", "6"];

// Rate limit: 1 per hour per school (enforced via namespace+identifier)
const YEAR_END_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("البيانات المرسلة غير صالحة.", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("البيانات المرسلة غير صالحة.", 400);
  }

  const { schoolId, options } = parsed.data;

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "عملية نهاية السنة متاحة للمسؤولين فقط.",
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

  // 1 per hour per school
  const rateLimited = await enforceRateLimit(req, {
    namespace: "year-end-execute",
    windowMs: YEAR_END_WINDOW_MS,
    maxHits: 1,
    identifier: `${actorUserId}:${targetSchoolId}`,
    productionFailureMode: "memory-fallback",
  });
  if (rateLimited) return rateLimited;

  try {
    const { data: students, error: fetchError } = await applyBranchScopeToQuery(
      actorSupabase
        .from("students")
        .select("id, class_name, status, paid_fee")
        .eq("school_id", targetSchoolId)
        .neq("status", "graduated"),
      branchScope.value,
    );

    if (fetchError) throw fetchError;

    const activeStudents = students ?? [];
    let promotedCount = 0;
    let graduatedCount = 0;
    let feesResetCount = 0;

    if (options.promoteStudents) {
      for (const student of activeStudents) {
        const currentClass = student.class_name ?? "";
        const isGraduating = FINAL_GRADES.some((g) => currentClass.includes(g));

        if (isGraduating) {
          const { error } = await actorSupabase
            .from("students")
            .update({ status: "graduated", class_name: "مُخرَّج" })
            .eq("id", student.id)
            .eq("school_id", targetSchoolId);
          if (!error) graduatedCount++;
        } else {
          // Find the next grade using the map
          let nextClass: string | null = null;
          for (const [from, to] of Object.entries(GRADE_MAP)) {
            if (currentClass.includes(from)) {
              nextClass = currentClass.replace(from, to);
              break;
            }
          }
          if (nextClass) {
            const { error } = await actorSupabase
              .from("students")
              .update({ class_name: nextClass })
              .eq("id", student.id)
              .eq("school_id", targetSchoolId);
            if (!error) promotedCount++;
          }
        }
      }
    }

    if (options.resetFees) {
      const { data: resetData, error: resetError } = await applyBranchScopeToQuery(
        actorSupabase
          .from("students")
          .update({ paid_fee: 0 })
          .eq("school_id", targetSchoolId)
          .neq("status", "graduated"),
        branchScope.value,
      ).select("id");

      if (!resetError) {
        feesResetCount = (resetData ?? []).length;
      } else {
        console.warn("[year-end-execute] fees reset failed:", resetError.message);
      }
    }

    logger.info("[year-end-execute] completed", {
      school: targetSchoolId,
      actor: actorUserId,
      promoted: promotedCount,
      graduated: graduatedCount,
      feesReset: feesResetCount,
    });

    return NextResponse.json({
      promoted_count: promotedCount,
      graduated_count: graduatedCount,
      fees_reset_count: feesResetCount,
    });
  } catch (err) {
    logRouteError("year-end-execute", err);
    return jsonError("تعذر تنفيذ عملية نهاية السنة.", 500);
  }
}
