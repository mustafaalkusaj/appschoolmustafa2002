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

// Arabic ordinal grade progression map (grades 1-12 in Arabic)
const GRADE_MAP: Record<string, string> = {
  "الأول": "الثاني",
  "الثاني": "الثالث",
  "الثالث": "الرابع",
  "الرابع": "الخامس",
  "الخامس": "السادس",
  "السادس": "السابع",
  "السابع": "الثامن",
  "الثامن": "التاسع",
  "التاسع": "العاشر",
  "العاشر": "الحادي عشر",
  "الحادي عشر": "الثاني عشر",
  "الثاني عشر": "مُخرَّج",
};

// Numeric grade progression map (1-12) for schools that use numeric grade names
const NUMERIC_GRADE_MAP: Record<string, string> = {
  "1": "2", "2": "3", "3": "4", "4": "5", "5": "6",
  "6": "7", "7": "8", "8": "9", "9": "10",
  "10": "11", "11": "12", "12": "مُخرَّج",
};

const FINAL_GRADES = ["الثاني عشر", "مُخرَّج", "12"];

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

    // Build bulk update batches to avoid N+1 writes and to fail atomically per batch.
    // We cannot use a true DB transaction through Supabase JS client, so we collect
    // all IDs per target class and issue one UPDATE per group. If any step fails we
    // return an error immediately — no partial state is silently committed.
    if (options.promoteStudents) {
      // Separate graduating students from those being promoted to the next grade
      const graduatingIds: string[] = [];
      const promotionGroups = new Map<string, string[]>(); // nextClass → ids

      for (const student of activeStudents) {
        const currentClass = student.class_name ?? "";
        const isGraduating = FINAL_GRADES.some((g) => currentClass.includes(g));

        if (isGraduating) {
          graduatingIds.push(student.id);
        } else {
          let nextClass: string | null = null;

          // Try Arabic ordinal map first
          for (const [from, to] of Object.entries(GRADE_MAP)) {
            if (currentClass.includes(from)) {
              nextClass = currentClass.replace(from, to);
              break;
            }
          }

          // Fall back to numeric map (e.g. "1", "2", ... "12")
          if (!nextClass) {
            const trimmed = currentClass.trim();
            if (Object.prototype.hasOwnProperty.call(NUMERIC_GRADE_MAP, trimmed)) {
              nextClass = NUMERIC_GRADE_MAP[trimmed];
            }
          }

          if (nextClass) {
            const ids = promotionGroups.get(nextClass) ?? [];
            ids.push(student.id);
            promotionGroups.set(nextClass, ids);
          } else {
            // Log a warning instead of silently skipping — operators need to know
            logger.warn("[year-end-execute] unmatched grade — student skipped", {
              school: targetSchoolId,
              studentId: student.id,
              class_name: currentClass,
            });
          }
        }
      }

      // Step 1: Bulk promote by class group
      for (const [nextClass, ids] of Array.from(promotionGroups.entries())) {
        const { error } = await actorSupabase
          .from("students")
          .update({ class_name: nextClass })
          .eq("school_id", targetSchoolId)
          .in("id", ids);
        if (error) {
          logger.error("[year-end-execute] promotion failed", new Error(error.message), { school: targetSchoolId, nextClass });
          return jsonError("فشل ترحيل الطلاب إلى الصف " + nextClass + ": " + error.message, 500);
        }
        promotedCount += ids.length;
      }

      // Step 2: Bulk graduate terminal students
      if (graduatingIds.length > 0) {
        const { error } = await actorSupabase
          .from("students")
          .update({ status: "graduated", class_name: "مُخرَّج" })
          .eq("school_id", targetSchoolId)
          .in("id", graduatingIds);
        if (error) {
          logger.error("[year-end-execute] graduation failed", new Error(error.message), { school: targetSchoolId });
          return jsonError("فشل تخريج الطلاب النهائيين: " + error.message, 500);
        }
        graduatedCount = graduatingIds.length;
      }
    }

    // Step 3: Reset fees — only runs if promotion steps above all succeeded
    if (options.resetFees) {
      const { data: resetData, error: resetError } = await applyBranchScopeToQuery(
        actorSupabase
          .from("students")
          .update({ paid_fee: 0 })
          .eq("school_id", targetSchoolId)
          .neq("status", "graduated"),
        branchScope.value,
      ).select("id");

      if (resetError) {
        logger.error("[year-end-execute] fees reset failed", new Error(resetError.message), { school: targetSchoolId });
        return jsonError("فشل إعادة تصفير الأقساط: " + resetError.message, 500);
      }
      feesResetCount = (resetData ?? []).length;
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
