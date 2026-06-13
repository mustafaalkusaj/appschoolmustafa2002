/**
 * @deprecated — This module is kept for backward compatibility.
 * The grading system now uses flexible grade types instead of fixed-column schemes.
 * Use grade-types-server.ts for new code.
 */
import "server-only"

// Re-export the new module so existing imports keep working during migration
export {
  type GradeFeatureGate,
  type GradeTypesResult,
  type GradeTypeMutationResult,
  type GradeTypeDeleteResult,
  fetchGradeTypes,
  fetchGradeTypes as fetchGradeSchemes,
  upsertGradeType,
  deleteGradeType,
} from './grade-types-server'
