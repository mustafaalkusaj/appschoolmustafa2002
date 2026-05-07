import { NextRequest, NextResponse } from "next/server";

import { deletePaymentSchema } from "@/lib/api-schemas";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonValidationError, logRouteError } from "@/lib/route-utils";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { invalidateSchoolCacheDomains } from "@/lib/server-cache";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const { paymentId } = await params;
  if (!paymentId || !UUID_REGEX.test(paymentId)) {
    return jsonError("معرف الدفعة غير صالح.", 400);
  }
  const body = await req.json().catch(() => null);
  const parsed = deletePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }
  const { school_id: schoolId } = parsed.data;

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

  const branchScope = resolveBranchScope(context.value);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = await enforceRateLimit(req, {
    namespace: "payments-records-delete",
    windowMs: 60_000,
    maxHits: 40,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const canDeletePayments = await routeUserHasPermission(actorSupabase, actorUserId, "delete_payments");
  if (!canDeletePayments) {
    return jsonError("ليس لديك صلاحية حذف الدفعات.", 403);
  }

  const paymentQuery = applyBranchScopeToQuery(
    actorSupabase
      .from("payments")
      .select("id, student_id, deleted_at")
      .eq("id", paymentId)
      .eq("school_id", targetSchoolId),
    branchScope.value,
  );
  const { data: payment, error: paymentError } = await paymentQuery.maybeSingle();

  if (paymentError || !payment?.id || typeof payment.student_id !== "string") {
    return jsonError("تعذر العثور على الدفعة المطلوبة ضمن المدرسة الحالية.", 404);
  }

  if (payment.deleted_at) {
    return jsonError("تم حذف هذه الدفعة مسبقاً.", 404);
  }

  // Soft delete: UPDATE with deleted_at instead of hard DELETE
  // This avoids database trigger issues and maintains audit trail
  let softDeleteQuery = actorSupabase
    .from("payments")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: actorUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .eq("school_id", targetSchoolId);

  // Only apply branch scope filtering if user has specific branch access
  if (branchScope.value.branchId) {
    softDeleteQuery = softDeleteQuery.eq("branch_id", branchScope.value.branchId);
  } else if (branchScope.value.branchIds.length > 0) {
    softDeleteQuery = softDeleteQuery.in("branch_id", branchScope.value.branchIds);
  }
  // If neither (group_admin with all branches), no branch filtering needed

  const { error: deleteError } = await softDeleteQuery;

  if (deleteError) {
    logRouteError("payments-records-delete", deleteError, {
      actorUserId,
      schoolId: targetSchoolId,
      paymentId,
      errorCode: deleteError.code,
      errorMessage: deleteError.message,
    });
    // Return detailed error for debugging
    const msg = deleteError.message || "unknown error";
    return jsonError(
      msg.includes("policy") || msg.includes("RLS")
        ? "RLS policy blocks delete. Contact admin."
        : msg.includes("foreign key")
        ? "Payment referenced elsewhere, cannot delete."
        : "Delete failed: " + msg,
      500
    );
  }

  invalidateSchoolCacheDomains(targetSchoolId, [
    "dashboard-overview",
    "payments-meta",
    "payments-list",
    "reports-overview",
  ]);

  // Trigger recompute_student_payment_totals fires on UPDATE of deleted_at
  // Query updated student data (includes trigger-recomputed paid_fee and remaining_fee)
  const { data: updatedStudent, error: studentQueryError } = await actorSupabase
    .from("students")
    .select("id, total_fee, paid_fee, remaining_fee, discount_value")
    .eq("id", payment.student_id)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (studentQueryError || !updatedStudent) {
    logRouteError("payments-records-delete-fetch-updated-student", studentQueryError, {
      actorUserId,
      schoolId: targetSchoolId,
      studentId: payment.student_id,
      paymentId,
    });
    return NextResponse.json(
      {
        ok: true,
        deletedPaymentId: paymentId,
        warning: "تم حذف الدفعة لكن تعذر تحميل الرصيد المحدث.",
      },
      { status: 202 },
    );
  }

  return NextResponse.json({
    ok: true,
    deletedPaymentId: paymentId,
    studentId: payment.student_id,
    studentUpdate: {
      id: updatedStudent.id,
      paid_fee: updatedStudent.paid_fee,
      remaining_fee: updatedStudent.remaining_fee,
      total_fee: updatedStudent.total_fee,
      discount_value: updatedStudent.discount_value,
    },
  });
}
