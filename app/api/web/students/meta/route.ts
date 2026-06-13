import { NextRequest, NextResponse } from "next/server";

import { resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { parseStudentsListFilters, resolveStudentsMeta } from "@/lib/students/overview";
import { getCacheHeaders, CACHE_STRATEGIES } from "@/lib/cache-strategies"; // ✅ إضافة cache strategies
import { buildSchoolCacheTag, rememberWithTtl } from "@/lib/server-cache";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "ملخص الطلاب متاح ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const requestedBranchId = req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = await enforceRateLimit(req, {
    namespace: "students-meta",
    windowMs: 60_000,
    maxHits: 90,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  try {
    const filters = parseStudentsListFilters(req.nextUrl.searchParams);
    // Cache key includes only meta-affecting filters (not page/pageSize/status —
    // counts/summary are aggregate or per-tab-overridden inside resolveStudentsMeta).
    const filterSuffix = `${filters.className}|${filters.sectionName}|${filters.search}`;
    const payload = await rememberWithTtl(
      `students-meta:${targetSchoolId}:${branchScope.value.cacheKeySuffix}:${filterSuffix}`,
      30_000,
      () => resolveStudentsMeta(actorSupabase, targetSchoolId, branchScope.value, filters),
      {
        tags: [buildSchoolCacheTag(targetSchoolId, "students-meta")],
      },
    );
    return NextResponse.json(
      { ok: true, ...payload },
      {
        headers: getCacheHeaders(CACHE_STRATEGIES.STUDENTS_META), // ✅ استخدام cache strategy
      },
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر تحميل ملخص الطلاب.", 500);
  }
}
