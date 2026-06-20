import { NextRequest, NextResponse } from "next/server";

import { createPaymentSchema } from "@/lib/api-schemas";
import { resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonValidationError, logRouteError } from "@/lib/route-utils";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { invalidateSchoolCacheDomains } from "@/lib/server-cache";

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

  // Run rate limit, permission check, and student lookup ALL in parallel
  const [rateLimited, canRecordPayments, studentResult] = await Promise.all([
    enforceRateLimit(req, { namespace: "payments-records-create", windowMs: 60_000, maxHits: 40, identifier: actorUserId }),
    routeUserHasPermission(actorSupabase, actorUserId, "add_payments"),
    actorSupabase.from("students").select("id, school_id, branch_id").eq("id", studentId).eq("school_id", targetSchoolId).maybeSingle(),
  ]);

  if (rateLimited) {
    return rateLimited;
  }
  if (!canRecordPayments) {
    return jsonError("ليس لديك صلاحية تسجيل دفعات جديدة.", 403);
  }

  const student = studentResult.data as { id: string; school_id: string; branch_id: string | null } | null;
  const studentError = studentResult.error;
  const studentBranchId: string | null = student?.branch_id ?? null;

  if (studentError || !student?.id) {
    return jsonError("الطالب المطلوب غير موجود ضمن المدرسة الحالية.", 404);
  }

  // Validate actor has access to student's actual branch
  const studentBranchScope = resolveBranchScope(context.value, studentBranchId ?? undefined);
  if (!studentBranchScope.ok) {
    return jsonError(studentBranchScope.message, studentBranchScope.status);
  }

  // Use student's actual branch_id from DB; fall back to actor's accessible branch
  const actorBranchScope = resolveBranchScope(context.value);
  const finalBranchId: string | null = studentBranchId
    ?? (actorBranchScope.ok ? actorBranchScope.value.branchId : null);

  const paymentTimestamp = receiptDate ?? new Date().toISOString();

  const { data: rpcRows, error: rpcError } = await actorSupabase.rpc("create_payment_atomic", {
    p_school_id: targetSchoolId,
    p_student_id: studentId,
    p_branch_id: finalBranchId,
    p_amount: amount,
    p_payment_method: paymentMethod,
    p_notes: notes ?? null,
    p_created_at: paymentTimestamp,
    // Force DB sequence to assign the canonical receipt_number to prevent
    // client-supplied collisions / unique-violation races. Client-facing
    // external receipts still flow through manual_receipt_number.
    p_receipt_number: null,
    p_manual_receipt_number: (manualReceiptNumber ?? receiptNumber) ?? null,
  });

  if (rpcError) {
    // Postgres unique violation (error code 23505) → duplicate payment → 409
    if ((rpcError as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: { code: "DUPLICATE_PAYMENT", message: "تم تسجيل هذه الدفعة مسبقاً." } },
        { status: 409 },
      );
    }
    logRouteError("payments-records-create", rpcError, {
      actorUserId,
      schoolId: targetSchoolId,
      studentId,
    });
    return jsonError("تعذر تسجيل الدفعة حالياً. حاول مرة أخرى بعد قليل.", 500);
  }

  const row = Array.isArray(rpcRows) ? rpcRows[0] : null;

  if (!row) {
    return jsonError("تعذر تسجيل الدفعة حالياً. حاول مرة أخرى بعد قليل.", 500);
  }

  if (row.error_code === "STUDENT_NOT_FOUND") {
    return jsonError("الطالب المطلوب غير موجود ضمن المدرسة الحالية.", 404);
  }

  if (row.error_code === "DUPLICATE_PAYMENT") {
    return NextResponse.json(
      { error: { code: "DUPLICATE_PAYMENT", message: "تم تسجيل هذه الدفعة مسبقاً." } },
      { status: 409 },
    );
  }

  if (row.error_code === "PAID_IN_FULL") {
    return NextResponse.json(
      {
        error: {
          code: "PAID_IN_FULL",
          message: "تم تسديد المبلغ بالكامل، لا يمكن تسجيل دفعة جديدة.",
        },
      },
      { status: 400 }
    );
  }

  if (row.error_code === "PAYMENT_EXCEEDS_REMAINING") {
    return NextResponse.json(
      {
        error: {
          code: "PAYMENT_EXCEEDS_REMAINING",
          message: "قيمة الدفعة أكبر من المبلغ المتبقي.",
        },
      },
      { status: 400 }
    );
  }

  if (row.error_code) {
    logRouteError("payments-records-create", new Error(`Unexpected RPC error_code: ${row.error_code}`), {
      actorUserId,
      schoolId: targetSchoolId,
      studentId,
    });
    return jsonError("تعذر تسجيل الدفعة حالياً. حاول مرة أخرى بعد قليل.", 500);
  }

  invalidateSchoolCacheDomains(targetSchoolId, [
    "dashboard-overview",
    "payments-meta",
    "reports-overview",
    "students-meta",
  ]);

  // Event-driven notification — additive, never blocks the write.
  try {
    const { notifyPayment } = await import("@/lib/notify-events");
    await notifyPayment({
      supabase: actorSupabase,
      schoolId: targetSchoolId,
      branchId: row.branch_id ?? finalBranchId ?? null,
      studentId,
      amount: typeof row.amount === "number" ? row.amount : amount,
      receiptNumber: row.receipt_number ?? receiptNumber ?? null,
    });
  } catch {
    // notification failure must never break the payment write
  }

  // create_payment_atomic does not return verification_token; fetch it from the
  // payments row so the receipt verification link/QR can be built. Null-safe.
  let verificationToken: string | null = row.verification_token ?? null;
  if (!verificationToken && row.id) {
    const { data: tokenRow } = await actorSupabase
      .from("payments")
      .select("verification_token")
      .eq("id", row.id)
      .maybeSingle();
    verificationToken = tokenRow?.verification_token ?? null;
  }

  return NextResponse.json({
    ok: true,
    payment: {
      id: row.id,
      school_id: row.school_id,
      branch_id: row.branch_id,
      student_id: row.student_id,
      amount: row.amount,
      payment_method: row.payment_method,
      notes: row.notes,
      created_at: row.created_at,
      receipt_number: row.receipt_number,
      manual_receipt_number: row.manual_receipt_number,
      verification_token: verificationToken,
    },
    studentUpdate: {
      id: studentId,
      paid_fee: row.paid_fee_after,
      remaining_fee: row.remaining_fee_after,
    },
  });
}
