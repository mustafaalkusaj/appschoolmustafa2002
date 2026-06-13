import { NextRequest, NextResponse } from "next/server";

import { resolveBranchScope } from "@/lib/branch-scope";
import { enforceRateLimit } from "@/lib/rate-limit";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { searchPaymentStudents } from "@/lib/payments/overview";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limitValue = Number.parseInt(req.nextUrl.searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 8;

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "البحث عن الطلاب متاح ضمن نطاق المدرسة الحالية فقط.",
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
    namespace: "payments-student-search",
    windowMs: 60_000,
    maxHits: 240,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  try {
    const students = await searchPaymentStudents(actorSupabase, targetSchoolId, branchScope.value, query, limit);
    return NextResponse.json(
      { ok: true, students },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر تحميل نتائج البحث.", 500);
  }
}
