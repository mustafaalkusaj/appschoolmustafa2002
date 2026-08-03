/**
 * ============================================================================
 * ERASURE POLICY — account deletion (GDPR Art. 17 / Apple 5.1.1(v) / Play)
 * ============================================================================
 *
 * WHY ANONYMIZATION AND NOT A CASCADING DELETE
 * --------------------------------------------
 * A student or teacher in this system is not a standalone account. Payments,
 * attendance registers, grades and salary rows hang off the subject and are
 * the school's own accounting and statutory academic records. A cascading row
 * delete would:
 *   1. destroy the school's books (payments/salaries are the ledger — deleting
 *      them is both an accounting-integrity failure and, in most jurisdictions,
 *      unlawful destruction of records the school is required to keep);
 *   2. break referential integrity on rows co-owned by other data subjects
 *      (a conversation has two participants; a teacher's grade row is also the
 *      teacher's professional record);
 *   3. be irreversible against a request that may later turn out to be fraud.
 *
 * GDPR Art. 17(3)(b) and (e) explicitly carve out processing required for
 * compliance with a legal obligation and for the establishment/exercise of
 * legal claims. So the correct erasure is: **destroy the identifiers and the
 * free text/media, keep the de-identified financial and statutory rows.**
 * After erasure, the retained rows can no longer be linked back to a natural
 * person by anyone with access to this database.
 *
 * EXACT SPLIT
 * -----------
 * A. HARD DELETE (rows removed entirely — no retention basis at all)
 *    - auth.users row (email, phone, password hash, provider identities)
 *    - managed_user_profiles, user_profiles, public.users  (login identity)
 *    - user_push_subscriptions                              (device tokens)
 *    - notifications                                        (personal, transient)
 *    - messages authored by the subject                     (free text + media)
 *    - conversation_participants rows for the subject       (display name)
 *    - behavior_logs for the subject  (free-text disciplinary notes; a school
 *      has no statutory duty to retain these once the subject leaves)
 *    - every storage object owned by the subject            (see storage.ts)
 *
 * B. ANONYMIZE (row kept, identifiers nulled or tokenized)
 *    - students:  full_name -> token; NULL on phone, phone2, guardian_name,
 *      guardian_phone, parent_name, parent_phone, address, date_of_birth,
 *      gender, photo_url, registration_number, previous_school, prev_school,
 *      auth_user_id.  status -> 'deleted'.
 *      KEPT: id, school_id, branch_id, class_name, total_fee, paid_fee,
 *      discount_value, remaining_fee  (the fee ledger).
 *    - teachers:  full_name -> token; NULL on every name part, phone,
 *      phone_secondary, email, email_personal, email_work, national_id,
 *      national_id_expiry, address, city, nationality, date_of_birth, gender,
 *      marital_status, blood_type, photo, bank_name, bank_account, all
 *      emergency_contact_*, app_username, app_password_hash, auth_user_id,
 *      notes.  is_active -> false.
 *      KEPT: base_salary and allowances (payroll ledger), id, school_id.
 *    - payments:      NULL on notes (free text). Everything else retained.
 *    - attendance_records: NULL on note. status/date retained (register).
 *    - grades:        NULL on note. score/max_score retained (academic record).
 *    - assignments authored by the subject: NULL on description and the
 *      attachment_* columns (the blob itself is hard-deleted from storage).
 *    - messaging_reports touching the subject: NULL on reporter_user_id,
 *      reported_user_id, message_body_snapshot, details. Row retained because
 *      Apple requires the school to keep evidence of moderation action.
 *    - audit_logs: NULL on actor_name, actor_email. The log line itself is an
 *      integrity record and stays.
 *
 * C. RETAINED UNTOUCHED, AND WHY
 *    - payments.amount / receipt_number / payment_method / created_at, and the
 *      salaries ledger: the school's accounts. Deleting them would falsify the
 *      books. They now point at a de-identified student/teacher row.
 *    - attendance status and grade scores: statutory school records.
 *    - the account_deletion_requests row itself: it is the *proof* that the
 *      deletion was performed, and its auth_user_id FK is ON DELETE SET NULL so
 *      it survives the auth.users delete.
 *
 * RETENTION WINDOW
 * ----------------
 *  - GRACE_PERIOD_HOURS (72h): a cooling-off window during which the subject
 *    can cancel. Nothing is erased before it elapses. This is what makes an
 *    account-takeover-driven deletion recoverable.
 *  - retention_deadline = requested_at + 7 BUSINESS days — the promise made in
 *    the published privacy policy. The cron picks requests up as soon as the
 *    grace window closes and must clear them before this deadline; anything
 *    still pending past the deadline is overdue and reported as such.
 *
 * ============================================================================
 */

export const GRACE_PERIOD_HOURS = 72;
export const RETENTION_BUSINESS_DAYS = 7;

/** Statuses a request can be picked up from by the executor. */
export const ERASABLE_STATUSES = [
  "pending",
  "in_review",
  "verified",
  "failed",
] as const;

export type AccountDeletionStatus =
  | "pending"
  | "in_review"
  | "verified"
  | "processing"
  | "completed"
  | "failed"
  | "rejected"
  | "cancelled";

/**
 * Buckets that can hold personal media for a data subject. `student-photos`,
 * `avatars`, `attachments` and `school-media` are the required minimum;
 * the rest are included because they demonstrably hold subject media too.
 */
export const SUBJECT_STORAGE_BUCKETS = [
  "student-photos",
  "avatars",
  "attachments",
  "school-media",
  "teacher-documents",
  "exam-photos",
  "notification-media",
] as const;

export type SubjectStorageBucket = (typeof SUBJECT_STORAGE_BUCKETS)[number];

/**
 * Deterministic pseudonym. Derived from the request id (not the user id) so
 * the token cannot be used to re-link the row to the original auth user, and
 * so re-running the executor produces exactly the same value (idempotency).
 */
export function buildAnonymizationToken(requestId: string): string {
  const compact = requestId.replace(/-/g, "").slice(0, 12);
  return `deleted-user-${compact}`;
}

function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from.getTime());
  let remaining = days;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const day = result.getUTCDay();
    // Working week in the deployment region is Sun–Thu; Fri/Sat are the weekend.
    if (day !== 5 && day !== 6) {
      remaining -= 1;
    }
  }
  return result;
}

/** The 7-business-day promise, as an absolute timestamp. */
export function computeRetentionDeadline(requestedAt: Date | string): Date {
  const base =
    typeof requestedAt === "string" ? new Date(requestedAt) : requestedAt;
  return addBusinessDays(base, RETENTION_BUSINESS_DAYS);
}

/** True once the 72h cancellation window has elapsed. */
export function isGracePeriodElapsed(
  requestedAt: Date | string,
  now: Date = new Date(),
): boolean {
  const base =
    typeof requestedAt === "string" ? new Date(requestedAt) : requestedAt;
  return now.getTime() - base.getTime() >= GRACE_PERIOD_HOURS * 3_600_000;
}

/** True when the promised deadline has already passed (compliance breach). */
export function isOverdue(
  retentionDeadline: Date | string | null,
  now: Date = new Date(),
): boolean {
  if (!retentionDeadline) return false;
  const deadline =
    typeof retentionDeadline === "string"
      ? new Date(retentionDeadline)
      : retentionDeadline;
  return now.getTime() > deadline.getTime();
}

/**
 * Declarative anonymization plan. Kept as data rather than inline SQL so the
 * mapping can be asserted directly in tests and reviewed without reading the
 * migration. The SQL RPC `execute_account_deletion_erasure` implements exactly
 * this plan; `tests/account-deletion-executor.test.ts` pins the mapping.
 */
export type AnonymizationRule = {
  table: string;
  /** Column on this table that carries the subject identifier. */
  subjectColumn: string;
  /** Which subject identifier feeds `subjectColumn`. */
  subjectKey: "auth_user_id" | "student_id" | "teacher_id";
  /** Columns replaced with the anonymization token. */
  tokenColumns?: string[];
  /** Columns set to NULL. */
  nullColumns?: string[];
  /** Literal column assignments (e.g. status -> 'deleted'). */
  setColumns?: Record<string, string | boolean | null>;
};

export const HARD_DELETE_TABLES = [
  "user_push_subscriptions",
  "notifications",
  "conversation_participants",
  "messages",
  "behavior_logs",
  "managed_user_profiles",
  "user_profiles",
  "users",
] as const;

export const ANONYMIZATION_PLAN: readonly AnonymizationRule[] = [
  {
    table: "students",
    subjectColumn: "id",
    subjectKey: "student_id",
    tokenColumns: ["full_name"],
    nullColumns: [
      "phone",
      "phone2",
      "guardian_name",
      "guardian_phone",
      "parent_name",
      "parent_phone",
      "address",
      "date_of_birth",
      "gender",
      "photo_url",
      "registration_number",
      "previous_school",
      "prev_school",
      "auth_user_id",
    ],
    setColumns: { status: "deleted" },
  },
  {
    table: "teachers",
    subjectColumn: "id",
    subjectKey: "teacher_id",
    tokenColumns: ["full_name"],
    nullColumns: [
      "first_name_ar",
      "second_name_ar",
      "third_name_ar",
      "last_name_ar",
      "first_name_en",
      "last_name_en",
      "phone",
      "phone_secondary",
      "email",
      "email_personal",
      "email_work",
      "national_id",
      "national_id_expiry",
      "address",
      "city",
      "nationality",
      "date_of_birth",
      "gender",
      "marital_status",
      "blood_type",
      "photo",
      "bank_name",
      "bank_account",
      "emergency_contact_name",
      "emergency_contact_phone",
      "emergency_contact_relation",
      "app_username",
      "app_password_hash",
      "notes",
      "auth_user_id",
    ],
    setColumns: { is_active: false },
  },
  {
    table: "payments",
    subjectColumn: "student_id",
    subjectKey: "student_id",
    nullColumns: ["notes"],
  },
  {
    table: "attendance_records",
    subjectColumn: "student_id",
    subjectKey: "student_id",
    nullColumns: ["note"],
  },
  {
    table: "grades",
    subjectColumn: "student_id",
    subjectKey: "student_id",
    nullColumns: ["note"],
  },
  {
    table: "assignments",
    subjectColumn: "teacher_id",
    subjectKey: "teacher_id",
    nullColumns: [
      "description",
      "attachment_bucket",
      "attachment_path",
      "attachment_name",
      "attachment_mime_type",
      "attachment_size_bytes",
    ],
  },
  {
    table: "messaging_reports",
    subjectColumn: "reporter_user_id",
    subjectKey: "auth_user_id",
    nullColumns: [
      "reporter_user_id",
      "reported_user_id",
      "message_body_snapshot",
      "details",
    ],
  },
  {
    table: "audit_logs",
    subjectColumn: "actor_id",
    subjectKey: "auth_user_id",
    nullColumns: ["actor_name", "actor_email"],
  },
];
