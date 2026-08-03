import type {
  AccountDeletionStatus,
  SubjectStorageBucket,
} from "@/lib/account-deletion/policy";

/** A row of `public.account_deletion_requests`. */
export type AccountDeletionRequest = {
  id: string;
  auth_user_id: string | null;
  school_id: string;
  status: AccountDeletionStatus;
  reason: string | null;
  requested_at: string;
  verified_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  retention_deadline: string | null;
  handled_by: string | null;
  resolution_note: string | null;
  metadata: Record<string, unknown>;
};

/** Identifiers of the linked domain records the erasure has to touch. */
export type DeletionSubject = {
  authUserId: string | null;
  schoolId: string;
  studentId: string | null;
  teacherId: string | null;
  role: string | null;
};

export type StorageObjectRef = {
  bucket: SubjectStorageBucket | string;
  path: string;
};

export type StorageRemovalOutcome = {
  removed: StorageObjectRef[];
  failed: Array<StorageObjectRef & { error: string }>;
};

export type DatabaseErasureOutcome = {
  /** True when the RPC found the request already erased and did nothing. */
  alreadyCompleted: boolean;
  anonymizationToken: string;
  affected: Record<string, number>;
};

/**
 * Everything the executor needs from the outside world. Injected so the
 * executor itself stays pure and can be exercised without Supabase.
 */
export interface AccountDeletionGateway {
  /** Resolve the subject's linked student/teacher rows. */
  loadSubject(request: AccountDeletionRequest): Promise<DeletionSubject>;

  /** Every storage object attributable to the subject. */
  listSubjectStorageObjects(
    subject: DeletionSubject,
  ): Promise<StorageObjectRef[]>;

  /** Remove storage objects. Must be idempotent (missing key = success). */
  removeStorageObjects(
    objects: StorageObjectRef[],
  ): Promise<StorageRemovalOutcome>;

  /**
   * Run the atomic DB erasure (single transaction, via the
   * `execute_account_deletion_erasure` RPC).
   */
  runDatabaseErasure(
    request: AccountDeletionRequest,
    subject: DeletionSubject,
  ): Promise<DatabaseErasureOutcome>;

  /** Delete the auth.users row (last, after the DB rows are de-linked). */
  deleteAuthUser(authUserId: string): Promise<void>;

  /** pending/in_review/verified/failed -> processing. Returns false if lost race. */
  claimRequest(requestId: string): Promise<boolean>;

  /** processing -> completed, with the erasure summary. */
  markCompleted(
    requestId: string,
    summary: Record<string, unknown>,
  ): Promise<void>;

  /** processing -> failed, recording why. */
  markFailed(
    requestId: string,
    failureReason: string,
    summary?: Record<string, unknown>,
  ): Promise<void>;

  /** Service-role audit write (audit_logs RLS blocks non-super_admin). */
  writeAudit(entry: {
    action: string;
    requestId: string;
    schoolId: string;
    summary: string;
    metadata: Record<string, unknown>;
  }): Promise<void>;
}

export type AccountDeletionResult = {
  requestId: string;
  status: "completed" | "failed" | "skipped";
  /** Set when status is "skipped" or "failed". */
  reason?: string;
  anonymizationToken?: string;
  storage?: StorageRemovalOutcome;
  affected?: Record<string, number>;
};
