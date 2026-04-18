import { createRouteSupabaseClient } from "@/lib/supabase-server";

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
) {
  const { data: paymentRows, error: paymentsError } = await actorSupabase
    .from("payments")
    .select("amount")
    .eq("school_id", schoolId)
    .eq("student_id", studentId);

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
) {
  const paymentRows = await loadStudentPaymentRows(actorSupabase, schoolId, studentId);
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
