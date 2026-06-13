/**
 * Deep permission check utilities.
 * Works with DeepPermissionMap from the 5-level permissions system.
 *
 * Usage:
 *   checkPermission(permMap, "students.create")   → true/false
 *   getDataScope(permMap, "students")             → "own_class" | "all" | null
 *   filterFields(obj, permMap, "students", map)   → obj with forbidden fields removed
 */

import type { DeepPermissionMap } from "@/types/deep-permissions";

// ---------------------------------------------------------------------------
// Check a single permission key
// ---------------------------------------------------------------------------

/**
 * Check if a permission is granted.
 * @param map  The DeepPermissionMap from the RBAC session
 * @param key  Dotted key: "students.create", "students.view_phone", "students.export"
 */
export function checkPermission(
  map: DeepPermissionMap | null | undefined,
  key: string,
): boolean {
  if (!map) return false;

  const dotIndex = key.indexOf(".");
  if (dotIndex < 0) return false;

  const pageKey = key.slice(0, dotIndex);
  const subKey = key.slice(dotIndex + 1);
  const pagePerm = map[pageKey];
  if (!pagePerm) return false;

  if (subKey in pagePerm.actions) return pagePerm.actions[subKey] === true;
  if (subKey in pagePerm.fields) return pagePerm.fields[subKey] === true;
  if (subKey in pagePerm.special) return pagePerm.special[subKey] === true;

  return false;
}

/**
 * Check if the user can read a page at all.
 */
export function canReadPage(
  map: DeepPermissionMap | null | undefined,
  pageKey: string,
): boolean {
  return checkPermission(map, `${pageKey}.read`);
}

// ---------------------------------------------------------------------------
// Data scope
// ---------------------------------------------------------------------------

/**
 * Returns the effective data scope for a page.
 * e.g. "own_class" | "own_grade" | "all" | null
 */
export function getDataScope(
  map: DeepPermissionMap | null | undefined,
  pageKey: string,
): string | null {
  return map?.[pageKey]?.data_scope ?? null;
}

// ---------------------------------------------------------------------------
// Field filtering — removes forbidden fields from a response object
// ---------------------------------------------------------------------------

/**
 * Removes fields from `data` that the user is not allowed to see.
 *
 * @param data      The object to filter
 * @param map       DeepPermissionMap from session
 * @param pageKey   Page key: "students", "teachers", etc.
 * @param fieldMap  { fieldName: permSubKey } e.g. { "phone": "view_phone" }
 */
export function filterFields<T extends Record<string, unknown>>(
  data: T,
  map: DeepPermissionMap | null | undefined,
  pageKey: string,
  fieldMap: Record<string, string>,
): Partial<T> {
  const result = { ...data };
  const pagePerm = map?.[pageKey];

  for (const [fieldName, permSubKey] of Object.entries(fieldMap)) {
    const allowed = pagePerm?.fields[permSubKey] === true;
    if (!allowed) {
      delete result[fieldName];
    }
  }

  return result;
}

/**
 * Filter an array of objects, removing forbidden fields from each.
 */
export function filterFieldsArray<T extends Record<string, unknown>>(
  data: T[],
  map: DeepPermissionMap | null | undefined,
  pageKey: string,
  fieldMap: Record<string, string>,
): Partial<T>[] {
  return data.map((item) => filterFields(item, map, pageKey, fieldMap));
}

// ---------------------------------------------------------------------------
// Common field maps (reusable across API routes)
// ---------------------------------------------------------------------------

export const STUDENT_FIELD_MAP: Record<string, string> = {
  phone: "view_phone",
  guardian_phone: "view_guardian_phone",
  national_id: "view_national_id",
  medical_info: "view_medical",
  address: "view_address",
  prev_school: "view_prev_school",
  fees: "view_fees",
  total_fees: "view_fees",
  paid_amount: "view_fees",
  remaining_fees: "view_fees",
};

export const TEACHER_FIELD_MAP: Record<string, string> = {
  phone: "view_phone",
  salary: "view_salary",
  base_salary: "view_salary",
  national_id: "view_national_id",
  bank_account: "view_bank_account",
  contract_details: "view_contract",
  qualifications: "view_qualifications",
};

export const PAYMENT_FIELD_MAP: Record<string, string> = {
  amount: "view_amount",
  discount: "view_discount",
  balance: "view_balance",
  remaining: "view_balance",
  payment_method: "view_payment_method",
};

export const SALARY_FIELD_MAP: Record<string, string> = {
  base_salary: "view_basic",
  basic_salary: "view_basic",
  allowances: "view_allowances",
  deductions: "view_deductions",
  net_salary: "view_net",
  bank_account: "view_bank_account",
};
