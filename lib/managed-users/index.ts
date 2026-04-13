// Types
export type {
  RouteSupabaseClient,
  CredentialRow,
  TeacherAssignmentRow,
  TeacherAssignmentLookupRow,
  LookupRecord,
  ManagedUsersActorContext,
  SchoolScopedActorContext,
  ManagedAccountLinkageStatus,
  ManagedAccountBaseSnapshot,
  TeacherTableCapabilities,
} from "./types";

export type { ManagedTeacherAssignmentRecord, ManagedUserRecord } from "../managed-users";

// Cache constants
export {
  SCHEMA_CAPABILITY_TTL_MS,
  AUTH_CREDENTIAL_CACHE_TTL_MS,
} from "./cache";

// Context module
export {
  resolveSchoolScopedActorContext,
  resolveManagedUsersActorContext,
} from "./context";

// Credentials module
export {
  generateTemporaryPassword,
  hashPassword,
  buildManagedAuthIdentityPayload,
  syncManagedAuthIdentityMetadata,
  fetchManagedUserCredentials,
  updateManagedUserLoginIdentifier,
  upsertManagedUserCredential,
  markAccountCardPrinted,
  generateManagedLoginIdentifier,
} from "./credentials";

// Accounts module
export {
  normalizeManagedUserRecord,
  normalizeManagedUserRecords,
  persistManagedUserProfile,
  ensureManagedUserProfileLink,
  syncManagedUserAccountState,
  buildTeacherClassesTaught,
  // Re-exported utilities
  buildLegacyManagedUserRecord,
  firstRelation,
  getClassLookupName,
  getSectionLookupName,
  matchesLookupText,
  normalizeMatchKey,
  parseTeacherClassesTaught,
  teacherAssignmentMatchesStudent,
} from "./accounts";

// Queries module
export {
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
} from "./queries";

// Account cards module
export {
  fetchManagedAccountSchoolBrand,
  buildManagedUserAccountCard,
} from "./account-cards";
