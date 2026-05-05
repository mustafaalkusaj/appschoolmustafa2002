import { NextRequest, NextResponse } from "next/server";

import { deletePaymentSchema } from "@/lib/api-schemas";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonValidationError, logRouteError } from "@/lib/route-utils";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { invalidateSchoolCacheDomains } from "@/lib/server-cache";
import { calculateStudentRemainingFee } from "@/lib/students/financials";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const { paymentId } = await params;
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
      .select("id, student_id")
      .eq("id", paymentId)
      .eq("school_id", targetSchoolId),
    branchScope.value,
  );
  const { data: payment, error: paymentError } = await paymentQuery.maybeSingle();

  if (paymentError || !payment?.id || typeof payment.student_id !== "string") {
    return jsonError("تعذر العثور على الدفعة المطلوبة ضمن المدرسة الحالية.", 404);
  }

  const deleteQuery = applyBranchScopeToQuery(
    actorSupabase
      .from("payments")
      .delete()
      .eq("id", paymentId)
      .eq("school_id", targetSchoolId),
    branchScope.value,
  );
  const { error: deleteError } = await deleteQuery;

  if (deleteError) {
    logRouteError("payments-records-delete", deleteError, {
      actorUserId,
      schoolId: targetSchoolId,
      paymentId,
    });
    return jsonError("تعذر حذف الدفعة حالياً. حاول مرة أخرى بعد قليل.", 500);
  }

  const refreshedStudentQuery = applyBranchScopeToQuery(
    actorSupabase
      .from("students")
      .select("id, paid_fee, total_fee, discount_value, class_name, school_id")
      .eq("id", payment.student_id)
      .eq("school_id", targetSchoolId),
    branchScope.value,
  );
  const { data: refreshedStudent, error: refreshedStudentError } = await refreshedStudentQuery.maybeSingle();

  if (refreshedStudentError) {
    logRouteError("payments-records-delete-refresh-student", refreshedStudentError, {
      actorUserId,
      schoolId: targetSchoolId,
      studentId: payment.student_id,
      paymentId,
    });
    return NextResponse.json(
      {
        ok: true,
        deletedPaymentId: paymentId,
        warning: "تم حذف الدفعة لكن تعذر تحميل الرصيد المحدث للطالب.",
      },
      { status: 202 },
    );
  }

  invalidateSchoolCacheDomains(targetSchoolId, [
    "dashboard-overview",
    "payments-meta",
    "reports-overview",
  ]);

  // Resolve effective total_fee from class_fees (same logic as POST)
  let classFeeTotal: number | undefined;
  if (refreshedStudent?.class_name && refreshedStudent.school_id) {
    const { data: classFeeRow } = await actorSupabase
      .from("class_fees")
      .select("total_fee")
      .eq("school_id", refreshedStudent.school_id)
      .eq("class_name", refreshedStudent.class_name)
      .maybeSingle();
    if (classFeeRow?.total_fee) {
      classFeeTotal = Number(classFeeRow.total_fee);
    }
  }

  return NextResponse.json({
    ok: true,
    deletedPaymentId: paymentId,
    studentUpdate: refreshedStudent
      ? {
          id: refreshedStudent.id,
          paid_fee: Number(refreshedStudent.paid_fee ?? 0),
          remaining_fee: calculateStudentRemainingFee({
            total_fee: classFeeTotal || Number(refreshedStudent.total_fee ?? 0),
            paid_fee: Number(refreshedStudent.paid_fee ?? 0),
            discount_value: Number(refreshedStudent.discount_value ?? 0),
          }),
          discount_value: Number(refreshedStudent.discount_value ?? 0),
        }
      : null,
  });
}
