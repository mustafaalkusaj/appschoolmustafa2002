import { NextRequest, NextResponse } from "next/server";

import { createPaymentSchema } from "@/lib/api-schemas";
import { applyBranchScopeToQuery, resolveBranchIdForWrite, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolBranchId, resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { resolveAuthoritativeStudentPaidFee } from "@/lib/payments-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonValidationError, logRouteError } from "@/lib/route-utils";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { invalidateSchoolCacheDomains } from "@/lib/server-cache";
import { calculateStudentRemainingFee } from "@/lib/students/financials";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const {
    school_id: schoolId,
    student_id: studentId,
    amount,
    payment_method: paymentMethod,
    notes,
    receipt_date: receiptDate,
    receipt_number: receiptNumber,
    manual_receipt_number: manualReceiptNumber,
    branch_id: requestedBranchId,
  } = parsed.data;

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

  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = await enforceRateLimit(req, {
    namespace: "payments-records-create",
    windowMs: 60_000,
    maxHits: 40,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const canRecordPayments = await routeUserHasPermission(actorSupabase, actorUserId, "add_payments");
  if (!canRecordPayments) {
    return jsonError("ليس لديك صلاحية تسجيل دفعات جديدة.", 403);
  }
  const { data: student, error: studentError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("students")
      .select("id, school_id, paid_fee, total_fee, discount_value, remaining_fee")
      .eq("id", studentId)
      .eq("school_id", targetSchoolId),
    branchScope.value,
  ).maybeSingle();

  if (studentError || !student?.id) {
    return jsonError("الطالب المطلوب غير موجود ضمن المدرسة الحالية.", 404);
  }

  let authoritativePaidFee = Number(student.paid_fee ?? 0);
  try {
    authoritativePaidFee = await resolveAuthoritativeStudentPaidFee(
      actorSupabase,
      targetSchoolId,
      studentId,
      student.paid_fee,
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر التحقق من رصيد الطالب الحالي.", 500);
  }

  const remainingBeforePayment = calculateStudentRemainingFee({
    total_fee: Number(student.total_fee ?? 0),
    paid_fee: authoritativePaidFee,
    discount_value: Number(student.discount_value ?? 0),
  });
  if (amount > remainingBeforePayment) {
    return jsonError("قيمة الدفعة أكبر من المبلغ المتبقي على الطالب.", 400);
  }

  const writeBranch = resolveBranchIdForWrite(branchScope.value, requestedBranchId);
  if (!writeBranch.ok) {
    return jsonError(writeBranch.message, writeBranch.status);
  }
  const branchId = writeBranch.value ?? (await resolveSchoolBranchId(actorSupabase, targetSchoolId));
  const paymentTimestamp = receiptDate ?? new Date().toISOString();
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
    logRouteError("payments-records-create", paymentError ?? new Error("Payment insert failed"), {
      actorUserId,
      schoolId: targetSchoolId,
      studentId,
    });
    return jsonError("تعذر تسجيل الدفعة حالياً. حاول مرة أخرى بعد قليل.", 500);
  }

  const { data: refreshedStudent, error: refreshedStudentError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("students")
      .select("id, paid_fee, remaining_fee")
      .eq("id", studentId)
      .eq("school_id", targetSchoolId),
    branchScope.value,
  ).maybeSingle();

  if (refreshedStudentError) {
    logRouteError("payments-records-refresh-student", refreshedStudentError, {
      actorUserId,
      schoolId: targetSchoolId,
      studentId,
    });
    return NextResponse.json(
      {
        ok: true,
        payment: createdPayment,
        warning: "تم تسجيل الدفعة لكن تعذر تحميل الرصيد المحدث للطالب.",
      },
      { status: 202 },
    );
  }

  invalidateSchoolCacheDomains(targetSchoolId, [
    "dashboard-overview",
    "payments-meta",
    "reports-overview",
  ]);

  return NextResponse.json({
    ok: true,
    payment: createdPayment,
    studentUpdate: refreshedStudent
      ? {
          id: refreshedStudent.id,
          paid_fee: Number(refreshedStudent.paid_fee ?? 0),
          remaining_fee: Number(refreshedStudent.remaining_fee ?? 0),
        }
      : null,
  });
}
