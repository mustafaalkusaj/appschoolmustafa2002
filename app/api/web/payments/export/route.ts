import { NextRequest, NextResponse } from "next/server";

import { resolveBranchScope } from "@/lib/branch-scope";
import { enforceRateLimit } from "@/lib/rate-limit";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { exportPaymentStudents, parsePaymentsListFilters } from "@/lib/payments/overview";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "تصدير المدفوعات متاح ضمن نطاق المدرسة الحالية فقط.",
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
    namespace: "payments-export",
    windowMs: 60_000,
    maxHits: 15,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  try {
    const { search, className, quickFilter, sort, dir } = parsePaymentsListFilters(req.nextUrl.searchParams);
    const students = await exportPaymentStudents(actorSupabase, targetSchoolId, branchScope.value, {
      search,
      className,
      quickFilter,
      sort,
      dir,
    });

    return NextResponse.json({
      ok: true,
      students,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر تحميل بيانات التصدير.", 500);
  }
}
