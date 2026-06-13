/**
 * Branch validation helper
 * Ensures that branch_id belongs to user's allowed branches and school
 */

import type { SchoolScopedActorContext } from "@/lib/managed-users/types";

/**
 * Validate that a branch_id belongs to the user's context
 * Throws 403 error if validation fails
 *
 * @param branchId - Branch ID to validate (from request body/query)
 * @param context - User's SchoolScopedActorContext
 * @param fieldName - Name of field for error message (default: "branch_id")
 * @returns {void} Throws error if invalid, otherwise returns silently
 *
 * @throws Error with status 403 if:
 * - branchId is provided but user has no branch access
 * - branchId is not in user's allowedBranchIds
 * - user is branch-scoped and branchId doesn't match their branch
 */
export function assertBranchBelongsToUserContext(
  branchId: string | null | undefined,
  context: SchoolScopedActorContext,
  fieldName: string = "branch_id"
): void {
  // If no branch specified, always OK
  if (!branchId) {
    return;
  }

  const trimmedBranchId = String(branchId).trim();
  if (!trimmedBranchId) {
    return;
  }

  // User has no branch access (e.g., school-level user trying to set branch)
  if (context.allowedBranchIds.length === 0) {
    throw new Error(
      `User does not have branch-level access. Cannot set ${fieldName}.`
    );
  }

  // Branch is not in user's allowed list
  if (!context.allowedBranchIds.includes(trimmedBranchId)) {
    throw new Error(
      `${fieldName} does not belong to your allowed branches. Access denied.`
    );
  }
}

/**
 * Validate that ALL branches in a list belong to user's context
 *
 * @param branchIds - Array of branch IDs to validate
 * @param context - User's SchoolScopedActorContext
 * @param fieldName - Name of field for error message
 * @throws Error with status 403 if any branchId is invalid
 */
export function assertAllBranchesBelongToUserContext(
  branchIds: (string | null | undefined)[],
  context: SchoolScopedActorContext,
  fieldName: string = "branch_ids"
): void {
  for (const id of branchIds) {
    assertBranchBelongsToUserContext(id, context, fieldName);
  }
}

/**
 * Get validated branch ID or throw error
 * Returns trimmed branch_id or null
 */
export function getValidatedBranchId(
  branchId: string | null | undefined,
  context: SchoolScopedActorContext
): string | null {
  assertBranchBelongsToUserContext(branchId, context);
  return branchId ? String(branchId).trim() : null;
}
