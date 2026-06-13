/**
 * E2E test data helpers - ensures safe cleanup of test-created records
 */

export function e2eTag(prefix: string): string {
  return `E2E_${prefix}_${Date.now()}`;
}

export interface TestDataState {
  studentIds: string[];
  expenseIds: string[];
  paymentIds: string[];
}

export function createTestDataState(): TestDataState {
  return {
    studentIds: [],
    expenseIds: [],
    paymentIds: [],
  };
}
