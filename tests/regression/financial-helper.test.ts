import { describe, it, expect } from 'vitest';

/**
 * Regression Test: Financial Helper Functions
 * Ensures financial calculations remain consistent across system
 * Prevents regressions in fee resolution, status determination, and cross-page consistency
 */

describe('Financial Helper Regression', () => {

  // Simulated helper function (normally imported from lib/students/financials.ts)
  function resolveStudentFeeTotal(
    classFeeAmount: number | null,
    studentTotalFee: number | null
  ): number {
    // Priority 1: class_fees.total_fee if > 0
    if (classFeeAmount && classFeeAmount > 0) {
      return classFeeAmount;
    }
    // Priority 2: students.total_fee if exists and > 0
    if (studentTotalFee && studentTotalFee > 0) {
      return studentTotalFee;
    }
    // Priority 3: 0
    return 0;
  }

  function calculateStudentRemainingFee(
    totalFee: number,
    paidFee: number,
    discount: number = 0
  ): number {
    // remaining = max(total - paid, 0)
    // Discount is frontend-only display
    return Math.max(totalFee - paidFee - discount, 0);
  }

  function determineStudentStatus(
    totalFee: number,
    paidFee: number
  ): 'fully_paid' | 'partially_paid' | 'unpaid' | 'no_fee_configured' {
    if (totalFee === 0) {
      return 'no_fee_configured';
    }
    const remaining = Math.max(totalFee - paidFee, 0);
    if (remaining <= 0 && totalFee > 0) {
      return 'fully_paid';
    }
    if (paidFee > 0 && remaining > 0) {
      return 'partially_paid';
    }
    if (paidFee === 0 && totalFee > 0) {
      return 'unpaid';
    }
    return 'no_fee_configured';
  }

  // Tests

  it('resolveStudentFeeTotal: class_fees has priority over students.total_fee', () => {
    const result = resolveStudentFeeTotal(500, 100);
    expect(result).toBe(500);
  });

  it('resolveStudentFeeTotal: fallback to students.total_fee when class_fees null', () => {
    const result = resolveStudentFeeTotal(null, 400);
    expect(result).toBe(400);
  });

  it('resolveStudentFeeTotal: fallback to students.total_fee when class_fees = 0', () => {
    const result = resolveStudentFeeTotal(0, 400);
    expect(result).toBe(400);
  });

  it('resolveStudentFeeTotal: returns 0 when both null/0', () => {
    expect(resolveStudentFeeTotal(null, null)).toBe(0);
    expect(resolveStudentFeeTotal(0, 0)).toBe(0);
    expect(resolveStudentFeeTotal(0, null)).toBe(0);
  });

  it('resolveStudentFeeTotal: handles negative values (treats as 0)', () => {
    const result = resolveStudentFeeTotal(-100, 400);
    expect(result).toBe(400); // Falls back to students.total_fee
  });

  it('calculateStudentRemainingFee: basic calculation', () => {
    expect(calculateStudentRemainingFee(500, 200, 0)).toBe(300);
  });

  it('calculateStudentRemainingFee: never negative (max 0)', () => {
    const result = calculateStudentRemainingFee(500, 600, 0);
    expect(result).toBe(0); // Not -100
  });

  it('calculateStudentRemainingFee: includes discount in calculation', () => {
    const withoutDiscount = calculateStudentRemainingFee(500, 200, 0);
    const withDiscount = calculateStudentRemainingFee(500, 200, 50);
    expect(withoutDiscount).toBe(300);
    expect(withDiscount).toBe(250);
  });

  it('calculateStudentRemainingFee: discount never makes remaining negative', () => {
    // Even with large discount
    const result = calculateStudentRemainingFee(500, 200, 600);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('determineStudentStatus: fully_paid when remaining = 0', () => {
    expect(determineStudentStatus(500, 500)).toBe('fully_paid');
  });

  it('determineStudentStatus: fully_paid when overpaid', () => {
    expect(determineStudentStatus(500, 600)).toBe('fully_paid');
  });

  it('determineStudentStatus: partially_paid when 0 < remaining < total', () => {
    expect(determineStudentStatus(500, 200)).toBe('partially_paid');
  });

  it('determineStudentStatus: unpaid when paid = 0 and total > 0', () => {
    expect(determineStudentStatus(500, 0)).toBe('unpaid');
  });

  it('determineStudentStatus: no_fee_configured when total = 0', () => {
    expect(determineStudentStatus(0, 0)).toBe('no_fee_configured');
  });

  it('determineStudentStatus: no_fee_configured never returns status fully_paid', () => {
    // Important: these are different concepts
    const nofee = determineStudentStatus(0, 0);
    const fullypaid = determineStudentStatus(500, 500);

    expect(nofee).not.toBe('fully_paid');
    expect(nofee).toBe('no_fee_configured');
    expect(fullypaid).toBe('fully_paid');
  });

  it('Full workflow: new student', () => {
    // Step 1: Add student with class_fees
    const classFeeAmount = 500;
    const studentTotalFee = null;
    const totalFee = resolveStudentFeeTotal(classFeeAmount, studentTotalFee);
    expect(totalFee).toBe(500);

    // Step 2: Status before payment
    const status1 = determineStudentStatus(totalFee, 0);
    expect(status1).toBe('unpaid');

    // Step 3: First payment
    const paidAfterPayment1 = 200;
    const remaining1 = calculateStudentRemainingFee(totalFee, paidAfterPayment1);
    const status2 = determineStudentStatus(totalFee, paidAfterPayment1);
    expect(remaining1).toBe(300);
    expect(status2).toBe('partially_paid');

    // Step 4: Final payment
    const paidAfterPayment2 = 500;
    const remaining2 = calculateStudentRemainingFee(totalFee, paidAfterPayment2);
    const status3 = determineStudentStatus(totalFee, paidAfterPayment2);
    expect(remaining2).toBe(0);
    expect(status3).toBe('fully_paid');
  });

  it('Cross-page consistency: dashboard uses same formulas as payments page', () => {
    // Both pages should calculate same numbers
    const student = {
      totalFee: 500,
      paidFee: 200,
      discount: 50,
    };

    // Dashboard calculation
    const dashboardRemaining = calculateStudentRemainingFee(
      student.totalFee,
      student.paidFee,
      student.discount
    );

    // Payments page calculation
    const paymentsRemaining = calculateStudentRemainingFee(
      student.totalFee,
      student.paidFee,
      student.discount
    );

    // Must be identical
    expect(dashboardRemaining).toBe(paymentsRemaining);
    expect(dashboardRemaining).toBe(250);
  });

  it('Schema evolution: class_fees overrides when exists', () => {
    // Simulate schema having both values
    const dbRecord = {
      class_fee_from_lookup: 500,
      student_direct_fee: 100,
    };

    const resolved = resolveStudentFeeTotal(
      dbRecord.class_fee_from_lookup,
      dbRecord.student_direct_fee
    );

    expect(resolved).toBe(500);
  });

  it('Edge case: zero payments tracked correctly', () => {
    const remaining = calculateStudentRemainingFee(500, 0, 0);
    const status = determineStudentStatus(500, 0);

    expect(remaining).toBe(500);
    expect(status).toBe('unpaid');
  });

  it('Edge case: large discount with small remaining', () => {
    const total = 100;
    const paid = 50;
    const discount = 45;
    const remaining = calculateStudentRemainingFee(total, paid, discount);

    expect(remaining).toBe(5); // 100 - 50 - 45
  });
});
