import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { recomputeStudentPaidFee } from "@/lib/payments-server";
import { routeUserHasPermission } from "@/lib/route-permissions";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const { paymentId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";

  if (!schoolId) {
    return jsonError("يجب تحديد المدرسة قبل حذف الدفعة.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "حذف الدفعات متاح ضمن المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const canDeletePayments = await routeUserHasPermission(actorSupabase, actorUserId, "delete_payments");
  if (!canDeletePayments) {
    return jsonError("ليس لديك صلاحية حذف الدفعات.", 403);
  }
  const { data: payment, error: paymentError } = await actorSupabase
    .from("payments")
    .select("id, student_id")
    .eq("id", paymentId)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (paymentError || !payment?.id || typeof payment.student_id !== "string") {
    return jsonError("تعذر العثور على الدفعة المطلوبة ضمن المدرسة الحالية.", 404);
  }

  const { error: deleteError } = await actorSupabase
    .from("payments")
    .delete()
    .eq("id", paymentId)
    .eq("school_id", targetSchoolId);

  if (deleteError) {
    return jsonError(deleteError.message || "تعذر حذف الدفعة.", 500);
  }

  try {
    const nextPaidFee = await recomputeStudentPaidFee(actorSupabase, targetSchoolId, payment.student_id);
    const { data: student } = await actorSupabase
      .from("students")
      .select("id, total_fee, discount_value")
      .eq("id", payment.student_id)
      .eq("school_id", targetSchoolId)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      deletedPaymentId: paymentId,
      studentUpdate: student
        ? {
            id: payment.student_id,
            paid_fee: nextPaidFee,
            remaining_fee: Math.max(
              0,
              Number(student.total_fee ?? 0) - nextPaidFee - Number(student.discount_value ?? 0),
            ),
          }
        : null,
    });
  } catch (syncError) {
    return NextResponse.json(
      {
        ok: true,
        deletedPaymentId: paymentId,
        warning:
          syncError instanceof Error
            ? syncError.message
            : "تم حذف الدفعة لكن تعذر مزامنة رصيد الطالب.",
      },
      { status: 202 },
    );
  }
}
