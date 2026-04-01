// Re-export all managed-users-server functionality from the modular structure
// This file is maintained for backward compatibility with existing imports

export {
  // Types
  type RouteSupabaseClient,
  type CredentialRow,
  type TeacherAssignmentRow,
  type TeacherAssignmentLookupRow,
  type LookupRecord,
  type ManagedUsersActorContext,
  type SchoolScopedActorContext,
  type ManagedAccountLinkageStatus,
  type ManagedAccountBaseSnapshot,
  type TeacherTableCapabilities,
  
  // Context
  resolveSchoolScopedActorContext,
  resolveManagedUsersActorContext,
  
  // Credentials
  generateTemporaryPassword,
  hashPassword,
  buildManagedAuthIdentityPayload,
  syncManagedAuthIdentityMetadata,
  fetchManagedUserCredentials,
  updateManagedUserLoginIdentifier,
  upsertManagedUserCredential,
  markAccountCardPrinted,
  generateManagedLoginIdentifier,
  
  // Accounts
  normalizeManagedUserRecord,
  normalizeManagedUserRecords,
  persistManagedUserProfile,
  ensureManagedUserProfileLink,
  syncManagedUserAccountState,
  buildTeacherClassesTaught,
  buildLegacyManagedUserRecord,
  firstRelation,
  getClassLookupName,
  getSectionLookupName,
  matchesLookupText,
  normalizeMatchKey,
  parseTeacherClassesTaught,
  teacherAssignmentMatchesStudent,
  
  // Queries
  MANAGED_USER_SELECT,
  tableHasColumn,
  getTeacherTableCapabilities,
  fetchManagedUserByAuthUserId,
  resolveManagedAccountBase,
  findManagedProfileByLinkedRecord,
  fetchTeacherAssignments,
  decorateManagedUsers,
  resolveSchoolBranchId,
  resolveSubjectId,
  resolveClassAndSectionIds,
  replaceTeacherAssignments,
  findMatchingTeacherIdsForStudent,
  syncStudentTeacherLinks,
  
  // Account Cards
  fetchManagedAccountSchoolBrand,
  buildManagedUserAccountCard,
} from "./managed-users/index";
