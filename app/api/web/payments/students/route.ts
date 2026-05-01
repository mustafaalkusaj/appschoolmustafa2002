import { NextRequest, NextResponse } from "next/server";

import { resolveBranchScope } from "@/lib/branch-scope";
import { enforceRateLimit } from "@/lib/rate-limit";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { parsePaymentsListFilters, resolvePaymentsStudentsPage } from "@/lib/payments/overview";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const t0 = performance.now();
  const tAuthStart = performance.now();

  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "قائمة المدفوعات متاحة ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const tAuthEnd = performance.now();

  const requestedBranchId = req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = await enforceRateLimit(req, {
    namespace: "payments-students",
    windowMs: 60_000,
    maxHits: 180,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  try {
    const filters = parsePaymentsListFilters(req.nextUrl.searchParams);
    const payload = await resolvePaymentsStudentsPage(actorSupabase, targetSchoolId, branchScope.value, filters);

    const tEnd = performance.now();
    const totalTime = tEnd - t0;
    const authTime = tAuthEnd - tAuthStart;
    const dataTime = tEnd - tAuthEnd;

    console.log("[payments/students GET] Performance metrics", {
      targetSchoolId,
      page: filters.page,
      pageSize: filters.pageSize,
      studentsCount: payload.students.length,
      totalCount: payload.totalCount,
      totalTimeMs: Math.round(totalTime),
      authTimeMs: Math.round(authTime),
      dataTimeMs: Math.round(dataTime),
      responseSize: JSON.stringify(payload).length,
    });

    return NextResponse.json(
      { ok: true, ...payload },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "Server-Timing": `auth;dur=${Math.round(authTime)}, data;dur=${Math.round(dataTime)}, total;dur=${Math.round(totalTime)}`,
        },
      },
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر تحميل قائمة المدفوعات.", 500);
  }
}
