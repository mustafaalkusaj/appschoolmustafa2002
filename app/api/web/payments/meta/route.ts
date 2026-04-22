import { NextRequest, NextResponse } from "next/server";

import { resolveBranchScope } from "@/lib/branch-scope";
import { enforceRateLimit } from "@/lib/rate-limit";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { resolvePaymentsMeta } from "@/lib/payments/overview";
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
      roleDeniedMessage: "بيانات المدفوعات متاحة ضمن نطاق المدرسة الحالية فقط.",
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
    namespace: "payments-meta",
    windowMs: 60_000,
    maxHits: 90,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  try {
    const payload = await rememberWithTtl(
      `payments-meta:${targetSchoolId}:${branchScope.value.cacheKeySuffix}`,
      30_000,
      () => resolvePaymentsMeta(actorSupabase, targetSchoolId, branchScope.value),
      {
        tags: [buildSchoolCacheTag(targetSchoolId, "payments-meta")],
      },
    );
    return NextResponse.json(
      { ok: true, ...payload },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر تحميل ملخص المدفوعات.", 500);
  }
}
