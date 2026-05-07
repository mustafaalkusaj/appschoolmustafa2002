import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { applyBranchScopeToQuery, type ResolvedBranchScope } from "@/lib/branch-scope";

type RouteSupabaseClient = Awaited<ReturnType<typeof createRouteSupabaseClient>>;

type PaymentAmountRow = {
  amount?: unknown;
};

function normalizeMoney(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sumPaymentAmounts(paymentRows: PaymentAmountRow[]) {
  return paymentRows.reduce((sum, row) => sum + normalizeMoney(row.amount), 0);
}

export function pickAuthoritativePaidFee(paymentRows: PaymentAmountRow[], fallbackPaidFee: unknown) {
  return paymentRows.length > 0 ? sumPaymentAmounts(paymentRows) : normalizeMoney(fallbackPaidFee);
}

async function loadStudentPaymentRows(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  studentId: string,
  branchScope?: ResolvedBranchScope,
) {
  const query = actorSupabase
    .from("payments")
    .select("amount")
    .eq("school_id", schoolId)
    .eq("student_id", studentId)
    .is("deleted_at", null);

  // Apply branch scope if provided (matches frontend behavior)
  let finalQuery = query;
  if (branchScope) {
    finalQuery = applyBranchScopeToQuery(query, branchScope);
  }

  const { data: paymentRows, error: paymentsError } = await finalQuery;

  if (paymentsError) {
    throw paymentsError;
  }

  return (paymentRows ?? []) as PaymentAmountRow[];
}

async function loadActiveStudentPaymentRows(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  studentId: string,
) {
  const { data: paymentRows, error: paymentsError } = await actorSupabase
    .from("payments")
    .select("amount")
    .eq("school_id", schoolId)
    .eq("student_id", studentId)
    .is("deleted_at", null);

  if (paymentsError) {
    throw paymentsError;
  }

  return (paymentRows ?? []) as PaymentAmountRow[];
}

export async function resolveAuthoritativeStudentPaidFee(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  studentId: string,
  fallbackPaidFee: unknown,
  branchScope?: ResolvedBranchScope,
) {
  const paymentRows = await loadStudentPaymentRows(actorSupabase, schoolId, studentId, branchScope);
  return pickAuthoritativePaidFee(paymentRows, fallbackPaidFee);
}

export async function recomputeStudentPaidFee(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  studentId: string,
) {
  const paymentRows = await loadStudentPaymentRows(actorSupabase, schoolId, studentId);
  const nextPaidFee = sumPaymentAmounts(paymentRows);
  const { error: updateError } = await actorSupabase
    .from("students")
    .update({ paid_fee: nextPaidFee })
    .eq("id", studentId)
    .eq("school_id", schoolId);

  if (updateError) {
    throw updateError;
  }

  return nextPaidFee;
}

export async function recomputeStudentPaymentTotalsAfterDelete(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  studentId: string,
) {
  // Load active (non-deleted) payments only
  const activePaymentRows = await loadActiveStudentPaymentRows(actorSupabase, schoolId, studentId);
  const activePaidFee = sumPaymentAmounts(activePaymentRows);

  // Load student to get total_fee and discount_value
  const { data: student, error: studentError } = await actorSupabase
    .from("students")
    .select("id, total_fee, discount_value, class_name, school_id")
    .eq("id", studentId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (studentError || !student) {
    const err = studentError || new Error("Student not found");
    console.error("[recompute] Student load error:", {
      studentId,
      schoolId,
      error: studentError?.message || "Student not found",
      errorCode: studentError?.code,
    });
    throw err;
  }

  // Resolve effective total_fee from class_fees if available
  let effectiveTotalFee = Number(student.total_fee ?? 0);
  if (student.class_name && student.school_id) {
    const { data: classFeeRow, error: classFeeError } = await actorSupabase
      .from("class_fees")
      .select("total_fee")
      .eq("school_id", student.school_id)
      .eq("class_name", student.class_name)
      .maybeSingle();
    if (classFeeError) {
      console.error("[recompute] Class fee load error:", {
        studentId,
        className: student.class_name,
        error: classFeeError.message,
        errorCode: classFeeError.code,
      });
    }
    if (classFeeRow?.total_fee) {
      effectiveTotalFee = Number(classFeeRow.total_fee);
    }
  }

  // Calculate remaining_fee
  const discountValue = Number(student.discount_value ?? 0);
  const remainingFee = Math.max(effectiveTotalFee - activePaidFee - discountValue, 0);

  console.log("[recompute] Before UPDATE students:", {
    studentId,
    schoolId,
    activePaidFee,
    effectiveTotalFee,
    discountValue,
    remainingFee,
  });

  // Update students table with recalculated values
  const { error: updateError } = await actorSupabase
    .from("students")
    .update({
      paid_fee: activePaidFee,
      remaining_fee: remainingFee,
      updated_at: new Date().toISOString(),
    })
    .eq("id", studentId)
    .eq("school_id", schoolId);

  if (updateError) {
    console.error("[recompute] UPDATE students error:", {
      studentId,
      schoolId,
      error: updateError.message,
      errorCode: updateError.code,
      details: updateError,
    });
    throw updateError;
  }

  console.log("[recompute] UPDATE students succeeded:", {
    studentId,
    paid_fee: activePaidFee,
    remaining_fee: remainingFee,
  });

  return {
    paid_fee: activePaidFee,
    remaining_fee: remainingFee,
    total_fee: effectiveTotalFee,
    discount_value: discountValue,
  };
}
