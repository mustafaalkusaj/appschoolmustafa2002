export interface StudentFinancials {
  total_fee: number;
  paid_fee: number;
  discount_value: number;
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
