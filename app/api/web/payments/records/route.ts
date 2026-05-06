import { NextRequest, NextResponse } from "next/server";

import { createPaymentSchema } from "@/lib/api-schemas";
import { resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { resolveAuthoritativeStudentPaidFee } from "@/lib/payments-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getCacheHeaders, CACHE_STRATEGIES } from "@/lib/cache-strategies"; // ✅ cache strategies
import { jsonError, jsonValidationError, logRouteError } from "@/lib/route-utils";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { invalidateSchoolCacheDomains } from "@/lib/server-cache";
import { resolveStudentFeeTotal } from "@/lib/students/financials";

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

  // Load student FIRST to get real branch_id from DB (not client-provided)
  let student: any;
  let studentError: any;
  let studentBranchId: string | null;

  try {
    const studentResult = await actorSupabase
      .from("students")
      .select("id, school_id, paid_fee, total_fee, discount_value, class_name, branch_id")
      .eq("id", studentId)
      .eq("school_id", targetSchoolId)
      .maybeSingle();

    ({ data: student, error: studentError } = studentResult);
    studentBranchId = student?.branch_id ?? null;
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر التحقق من بيانات الطالب.", 500);
  }

  if (studentError || !student?.id) {
    return jsonError("الطالب المطلوب غير موجود ضمن المدرسة الحالية.", 404);
  }

  // Validate actor has access to student's actual branch
  const studentBranchScope = resolveBranchScope(context.value, studentBranchId ?? undefined);
  if (!studentBranchScope.ok) {
    return jsonError(studentBranchScope.message, studentBranchScope.status);
  }

  // Get authoritative paid fee from ALL payments across actor's allowed branches
  // (not just student's branch, to account for cross-branch payments)
  const actorBranchScope = resolveBranchScope(context.value);
  let authoritativePaidFee: number;
  try {
    authoritativePaidFee = await resolveAuthoritativeStudentPaidFee(
      actorSupabase,
      targetSchoolId,
      studentId,
      undefined,
      actorBranchScope.ok ? actorBranchScope.value : undefined,
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر التحقق من بيانات الطالب.", 500);
  }

  // Resolve effective total_fee from class_fees (same logic as frontend)
  let classFeeTotal: number | undefined;
  if (student.class_name) {
    const { data: classFeeRow } = await actorSupabase
      .from("class_fees")
      .select("total_fee")
      .eq("school_id", targetSchoolId)
      .eq("class_name", student.class_name)
      .maybeSingle();
    if (classFeeRow?.total_fee) {
      classFeeTotal = Number(classFeeRow.total_fee);
    }
  }

  const effectiveTotalFee = resolveStudentFeeTotal(Number(student.total_fee ?? 0), classFeeTotal);
  const effectiveDiscount = Number(student.discount_value ?? 0);
  const remainingBeforePayment = Math.max(effectiveTotalFee - authoritativePaidFee - effectiveDiscount, 0);

  // VALIDATION: Reject if student already paid in full
  if (remainingBeforePayment <= 0) {
    return NextResponse.json(
      {
        error: {
          code: "PAID_IN_FULL",
          message: "تم تسديد المبلغ بالكامل، لا يمكن تسجيل دفعة جديدة.",
        },
      },
      { status: 400, headers: getCacheHeaders(CACHE_STRATEGIES.PAYMENTS_LIST) }
    );
  }

  // VALIDATION: Reject if payment exceeds remaining amount
  if (amount > remainingBeforePayment) {
    return NextResponse.json(
      {
        error: {
          code: "PAYMENT_EXCEEDS_REMAINING",
          message: "قيمة الدفعة أكبر من المبلغ المتبقي.",
        },
        details: {
          amount,
          remainingBeforePayment,
        },
      },
      { status: 400, headers: getCacheHeaders(CACHE_STRATEGIES.PAYMENTS_LIST) }
    );
  }

  // Use student's actual branch_id from DB; ignore client-provided requestedBranchId
  let finalBranchId: string | null;

  if (studentBranchId) {
    // Student has a branch_id - use it
    finalBranchId = studentBranchId;
  } else {
    // Student has no branch_id - assign from actor's accessible branch
    finalBranchId = actorBranchScope.ok ? actorBranchScope.value.branchId : null;
  }
  const paymentTimestamp = receiptDate ?? new Date().toISOString();
  const { data: createdPayment, error: paymentError } = await actorSupabase
    .from("payments")
    .insert({
      school_id: targetSchoolId,
      branch_id: finalBranchId,
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

  // Calculate updated student values from payment insertion
  const newPaidFee = authoritativePaidFee + amount;

  // Use same effective total as validation (class_fee resolved)
  const newRemainingFee = Math.max(effectiveTotalFee - newPaidFee - effectiveDiscount, 0);

  invalidateSchoolCacheDomains(targetSchoolId, [
    "dashboard-overview",
    "payments-meta",
    "reports-overview",
  ]);

  return NextResponse.json({
    ok: true,
    payment: createdPayment,
    studentUpdate: {
      id: studentId,
      paid_fee: newPaidFee,
      remaining_fee: newRemainingFee,
      discount_value: effectiveDiscount,
      total_fee: effectiveTotalFee,
    },
  });
}
