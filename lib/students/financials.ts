export interface StudentFinancials {
  total_fee: number;
  paid_fee: number;
  discount_value: number;
}

export interface ResolvedStudentFinancials extends StudentFinancials {
  resolved_total_fee: number;
  remaining_fee: number;
}

/**
 * Shared logic for calculating student balance.
 * This ensures consistency across API endpoints and reports.
 */
export function calculateStudentRemainingFee(student: StudentFinancials): number {
  const total = Number(student.total_fee ?? 0);
  const paid = Number(student.paid_fee ?? 0);
  const discount = Number(student.discount_value ?? 0);

  return Math.max(total - paid - discount, 0);
}

export function calculateStudentPaidPercentage(student: StudentFinancials): number {
  const total = Number(student.total_fee ?? 0);
  const paid = Number(student.paid_fee ?? 0);
  const discount = Number(student.discount_value ?? 0);
  const afterDiscount = Math.max(total - discount, 0);

  return afterDiscount > 0 ? Math.round((paid / afterDiscount) * 100) : 0;
}

export function resolveStudentFeeTotal(
  studentTotalFee: number | null | undefined,
  classFeeTotal: number | null | undefined,
) {
  const classFee = Number(classFeeTotal ?? 0);
  if (Number.isFinite(classFee) && classFee > 0) {
    return classFee;
  }

  const totalFee = Number(studentTotalFee ?? 0);
  return Number.isFinite(totalFee) && totalFee > 0 ? totalFee : 0;
}

export function buildResolvedStudentFinancials(student: {
  total_fee: number | null | undefined;
  paid_fee: number | null | undefined;
  discount_value: number | null | undefined;
}, classFeeTotal?: number | null): ResolvedStudentFinancials {
  const resolvedTotalFee = resolveStudentFeeTotal(student.total_fee, classFeeTotal);
  const paidFee = Number(student.paid_fee ?? 0);
  const discountValue = Number(student.discount_value ?? 0);

  return {
    total_fee: resolvedTotalFee,
    paid_fee: Number.isFinite(paidFee) ? paidFee : 0,
    discount_value: Number.isFinite(discountValue) ? discountValue : 0,
    resolved_total_fee: resolvedTotalFee,
    remaining_fee: calculateStudentRemainingFee({
      total_fee: resolvedTotalFee,
      paid_fee: Number.isFinite(paidFee) ? paidFee : 0,
      discount_value: Number.isFinite(discountValue) ? discountValue : 0,
    }),
  };
}
