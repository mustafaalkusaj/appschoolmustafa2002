import { createRouteSupabaseClient } from "@/lib/supabase-server";

type RouteSupabaseClient = Awaited<ReturnType<typeof createRouteSupabaseClient>>;

export async function recomputeStudentPaidFee(
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

  const nextPaidFee = (paymentRows ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
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
