import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { resolvePaymentsMeta } from "@/lib/payments/overview";

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

  const { actorSupabase, targetSchoolId } = context.value;

  try {
    const payload = await resolvePaymentsMeta(actorSupabase, targetSchoolId);
    return NextResponse.json({
      ok: true,
      ...payload,
      students: [],
      paymentCountsByStudent: {},
      archiveNotice:
        payload.archiveNotice || "تم نقل قائمة الطلاب المفصلة إلى تحميل مجزأ عبر /api/web/payments/students.",
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر تحميل بيانات المدفوعات.", 500);
  }
}
