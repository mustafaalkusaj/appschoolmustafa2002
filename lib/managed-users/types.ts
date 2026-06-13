import type { User as AuthUser } from "@supabase/supabase-js";
import type {
  ManagedUserRole,
  ManagedUserRecord,
} from "@/lib/managed-users";
import type { UserRole } from "@/types/roles";
import type { createRouteSupabaseClient } from "@/lib/supabase-server";

export type RouteSupabaseClient = Awaited<ReturnType<typeof createRouteSupabaseClient>>;

export type CredentialRow = {
  auth_user_id: string;
  login_identifier: string;
  temporary_password_hash: string | null;
  temporary_password_plain: string | null;
  has_pending_setup: boolean;
  password_last_reset_at: string | null;
  card_last_printed_at: string | null;
};

export type TeacherAssignmentRow = {
  id: string;
  teacher_id: string;
  subject_id: string | null;
  class_id: string | null;
  section_id: string | null;
  is_active: boolean | null;
};

export type TeacherAssignmentLookupRow = {
  id: string;
  name: string;
};

export type LookupRecord = Record<string, unknown>;

export type ManagedUsersActorContext = {
  actorSupabase: RouteSupabaseClient;
  actorUserId: string;
  actorRole: "super_admin" | "admin";
  targetSchoolId: string;
  actorBranchId: string | null;
  allowedBranchIds: string[];
};

export type SchoolScopedActorContext = {
  actorSupabase: RouteSupabaseClient;
  actorUserId: string;
  actorRole: UserRole;
  targetSchoolId: string;
  actorBranchId: string | null;
  allowedBranchIds: string[];
  scopeLevel: "super_admin" | "group_admin" | "branch_user" | "restricted" | null;
  isSinglePageUser: boolean;
  permissionsVersion: number;
};

export type ManagedAccountLinkageStatus = "ok" | "missing";

export interface ManagedAccountBaseSnapshot {
  authUser: AuthUser;
  user: ManagedUserRecord | null;
  managedProfileExists: boolean;
  authUserIsActive: boolean;
  schoolId: string | null;
  role: ManagedUserRole | null;
  loginIdentifier: string | null;
  identity: {
    auth_user_id: string;
    role: ManagedUserRole | null;
    school_id: string | null;
    login_identifier: string | null;
    is_active: boolean;
  };
  linkage: {
    managed_profile_exists: boolean;
    linked_record_type: ManagedUserRole | null;
    linked_record_id: string | null;
    linked_record_status: ManagedAccountLinkageStatus;
  };
}

export type TeacherTableCapabilities = {
  specialization: boolean;
  subject: boolean;
  notes: boolean;
  is_active: boolean;
  status: boolean;
  classes_taught: boolean;
};
