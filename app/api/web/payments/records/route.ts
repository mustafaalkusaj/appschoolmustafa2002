import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolBranchId, resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { recomputeStudentPaidFee } from "@/lib/payments-server";
import { routeUserHasPermission } from "@/lib/route-permissions";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

type CreatePaymentBody = {
  school_id?: unknown;
  student_id?: unknown;
  amount?: unknown;
  payment_method?: unknown;
  notes?: unknown;
  receipt_date?: unknown;
  receipt_number?: unknown;
  manual_receipt_number?: unknown;
  branch_id?: unknown;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as CreatePaymentBody | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";
  const studentId = typeof body?.student_id === "string" ? body.student_id.trim() : "";
  const amount = Number(body?.amount ?? 0);
  const paymentMethod = typeof body?.payment_method === "string" ? body.payment_method.trim() : "cash";
  const notes = typeof body?.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
  const receiptDate = typeof body?.receipt_date === "string" ? body.receipt_date : null;
  const receiptNumber = typeof body?.receipt_number === "string" && body.receipt_number.trim()
    ? body.receipt_number.trim()
    : null;
  const manualReceiptNumber =
    typeof body?.manual_receipt_number === "string" && body.manual_receipt_number.trim()
      ? body.manual_receipt_number.trim()
      : null;
  const requestedBranchId = typeof body?.branch_id === "string" && body.branch_id.trim() ? body.branch_id.trim() : null;

  if (!schoolId || !studentId) {
    return jsonError("المدرسة والطالب مطلوبان لتسجيل الدفعة.", 400);
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonError("المبلغ يجب أن يكون أكبر من صفر.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "تسجيل الدفعات متاح ضمن المدرسة الحالية فقط.",
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
  const canRecordPayments = await routeUserHasPermission(actorSupabase, actorUserId, "add_payments");
  if (!canRecordPayments) {
    return jsonError("ليس لديك صلاحية تسجيل دفعات جديدة.", 403);
  }
  const { data: student, error: studentError } = await actorSupabase
    .from("students")
    .select("id, school_id, paid_fee, total_fee, discount_value, remaining_fee")
    .eq("id", studentId)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (studentError || !student?.id) {
    return jsonError("الطالب المطلوب غير موجود ضمن المدرسة الحالية.", 404);
  }

  const branchId = requestedBranchId ?? (await resolveSchoolBranchId(actorSupabase, targetSchoolId));
  const paymentTimestamp = receiptDate ? new Date(receiptDate).toISOString() : new Date().toISOString();
  const { data: createdPayment, error: paymentError } = await actorSupabase
    .from("payments")
    .insert({
      school_id: targetSchoolId,
      branch_id: branchId,
      student_id: studentId,
      amount,
      payment_method: paymentMethod,
      notes,
      created_at: paymentTimestamp,
      receipt_number: receiptNumber,
      manual_receipt_number: manualReceiptNumber,
    })
    .select("id, school_id, branch_id, student_id, amount, payment_method, notes, created_at, receipt_number, manual_receipt_number")
    .single();

  if (paymentError || !createdPayment) {
    return jsonError(paymentError?.message || "تعذر تسجيل الدفعة.", 500);
  }

  try {
    const nextPaidFee = await recomputeStudentPaidFee(actorSupabase, targetSchoolId, studentId);
    const totalFee = Number(student.total_fee ?? 0);
    const discountValue = Number(student.discount_value ?? 0);
    return NextResponse.json({
      ok: true,
      payment: createdPayment,
      studentUpdate: {
        id: studentId,
        paid_fee: nextPaidFee,
        remaining_fee: Math.max(0, totalFee - nextPaidFee - discountValue),
      },
    });
  } catch (syncError) {
    return NextResponse.json(
      {
        ok: true,
        payment: createdPayment,
        warning:
          syncError instanceof Error
            ? syncError.message
            : "تم تسجيل الدفعة لكن تعذر مزامنة رصيد الطالب.",
      },
      { status: 202 },
    );
  }
}
