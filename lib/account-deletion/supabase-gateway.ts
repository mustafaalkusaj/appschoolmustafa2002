import "server-only";

import { buildAnonymizationToken } from "@/lib/account-deletion/policy";
import {
  buildSubjectPrefixes,
  dedupeStorageRefs,
  extractStoragePath,
  STORAGE_BUCKETS_TO_SWEEP,
} from "@/lib/account-deletion/storage";
import type {
  AccountDeletionGateway,
  AccountDeletionRequest,
  DatabaseErasureOutcome,
  DeletionSubject,
  StorageObjectRef,
  StorageRemovalOutcome,
} from "@/lib/account-deletion/types";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

type ServiceClient = ReturnType<typeof createServiceSupabaseClient>;

/**
 * `account_deletion_requests` and the erasure RPC are newer than the generated
 * `Database` types, so these narrow escape hatches mirror the pattern already
 * used in `app/api/mobile/account/delete-request/route.ts`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function table(client: ServiceClient, name: string): any {
  return (client as unknown as { from: (t: string) => unknown }).from(
    name,
  ) as unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rpc(client: ServiceClient, fn: string, args: unknown): Promise<any> {
  return (
    client as unknown as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rpc: (name: string, params: unknown) => Promise<any>;
    }
  ).rpc(fn, args);
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function createSupabaseAccountDeletionGateway(
  client: ServiceClient = createServiceSupabaseClient(),
): AccountDeletionGateway {
  return {
    async loadSubject(
      request: AccountDeletionRequest,
    ): Promise<DeletionSubject> {
      const base: DeletionSubject = {
        authUserId: request.auth_user_id,
        schoolId: request.school_id,
        studentId: null,
        teacherId: null,
        role: null,
      };

      if (!request.auth_user_id) return base;

      const { data } = await table(client, "managed_user_profiles")
        .select("role, student_id, teacher_id")
        .eq("auth_user_id", request.auth_user_id)
        .maybeSingle();

      if (data) {
        base.role = (data.role as string | null) ?? null;
        base.studentId = (data.student_id as string | null) ?? null;
        base.teacherId = (data.teacher_id as string | null) ?? null;
      }

      // Fall back to the domain tables when the managed profile is gone
      // (a partially-completed earlier run, or a legacy bulk-imported account).
      if (!base.studentId) {
        const { data: student } = await table(client, "students")
          .select("id")
          .eq("auth_user_id", request.auth_user_id)
          .maybeSingle();
        base.studentId = (student?.id as string | undefined) ?? null;
      }
      if (!base.teacherId) {
        const { data: teacher } = await table(client, "teachers")
          .select("id")
          .eq("auth_user_id", request.auth_user_id)
          .maybeSingle();
        base.teacherId = (teacher?.id as string | undefined) ?? null;
      }

      return base;
    },

    async listSubjectStorageObjects(
      subject: DeletionSubject,
    ): Promise<StorageObjectRef[]> {
      const refs: StorageObjectRef[] = [];

      // 1. Objects referenced directly from the subject's own rows.
      if (subject.studentId) {
        const { data: student } = await table(client, "students")
          .select("photo_url")
          .eq("id", subject.studentId)
          .maybeSingle();
        for (const bucket of ["student-photos", "avatars"] as const) {
          const path = extractStoragePath(student?.photo_url, bucket);
          if (path) refs.push({ bucket, path });
        }
      }

      if (subject.teacherId) {
        const { data: teacher } = await table(client, "teachers")
          .select("photo")
          .eq("id", subject.teacherId)
          .maybeSingle();
        for (const bucket of ["avatars", "teacher-documents"] as const) {
          const path = extractStoragePath(teacher?.photo, bucket);
          if (path) refs.push({ bucket, path });
        }

        const { data: assignments } = await table(client, "assignments")
          .select("attachment_bucket, attachment_path")
          .eq("teacher_id", subject.teacherId);
        for (const row of (assignments ?? []) as Array<{
          attachment_bucket: string | null;
          attachment_path: string | null;
        }>) {
          if (row.attachment_bucket && row.attachment_path) {
            refs.push({
              bucket: row.attachment_bucket,
              path: row.attachment_path,
            });
          }
        }
      }

      if (subject.authUserId) {
        const { data: profile } = await table(client, "user_profiles")
          .select("avatar_url")
          .eq("id", subject.authUserId)
          .maybeSingle();
        const path = extractStoragePath(profile?.avatar_url, "avatars");
        if (path) refs.push({ bucket: "avatars", path });

        const { data: messages } = await table(client, "messages")
          .select("attachment_url")
          .eq("sender_id", subject.authUserId)
          .not("attachment_url", "is", null);
        for (const row of (messages ?? []) as Array<{
          attachment_url: string | null;
        }>) {
          for (const bucket of ["attachments", "school-media"] as const) {
            const messagePath = extractStoragePath(row.attachment_url, bucket);
            if (messagePath && row.attachment_url?.includes(`/${bucket}/`)) {
              refs.push({ bucket, path: messagePath });
            }
          }
        }
      }

      // 2. Prefix sweep — catches objects uploaded under the subject's id but
      //    never written back to a column (orphaned uploads still count as
      //    personal data under Art. 17).
      const prefixes = buildSubjectPrefixes({
        schoolId: subject.schoolId,
        authUserId: subject.authUserId,
        studentId: subject.studentId,
        teacherId: subject.teacherId,
      });

      for (const bucket of STORAGE_BUCKETS_TO_SWEEP) {
        for (const prefix of prefixes) {
          const { data, error } = await client.storage
            .from(bucket)
            .list(prefix, { limit: 1000 });
          if (error || !data) continue;
          for (const entry of data) {
            if (!entry.name) continue;
            // Directory placeholders have no id.
            if (!entry.id) continue;
            refs.push({ bucket, path: `${prefix}/${entry.name}` });
          }
        }
      }

      return dedupeStorageRefs(refs);
    },

    async removeStorageObjects(
      objects: StorageObjectRef[],
    ): Promise<StorageRemovalOutcome> {
      const outcome: StorageRemovalOutcome = { removed: [], failed: [] };

      const byBucket = new Map<string, string[]>();
      for (const ref of objects) {
        const list = byBucket.get(ref.bucket) ?? [];
        list.push(ref.path);
        byBucket.set(ref.bucket, list);
      }

      for (const [bucket, paths] of Array.from(byBucket.entries())) {
        const { error } = await client.storage.from(bucket).remove(paths);
        if (error) {
          for (const path of paths) {
            outcome.failed.push({
              bucket,
              path,
              error: readErrorMessage(error, "storage remove failed"),
            });
          }
          continue;
        }
        for (const path of paths) outcome.removed.push({ bucket, path });
      }

      return outcome;
    },

    async runDatabaseErasure(
      request: AccountDeletionRequest,
      subject: DeletionSubject,
    ): Promise<DatabaseErasureOutcome> {
      const { data, error } = await rpc(
        client,
        "execute_account_deletion_erasure",
        {
          p_request_id: request.id,
          p_auth_user_id: subject.authUserId,
          p_student_id: subject.studentId,
          p_teacher_id: subject.teacherId,
          p_anonymization_token: buildAnonymizationToken(request.id),
        },
      );

      if (error) {
        throw new Error(
          readErrorMessage(error, "execute_account_deletion_erasure failed"),
        );
      }

      const payload = (data ?? {}) as {
        already_completed?: boolean;
        anonymization_token?: string;
        affected?: Record<string, number>;
      };

      return {
        alreadyCompleted: payload.already_completed === true,
        anonymizationToken:
          payload.anonymization_token ?? buildAnonymizationToken(request.id),
        affected: payload.affected ?? {},
      };
    },

    async deleteAuthUser(authUserId: string): Promise<void> {
      const { error } = await client.auth.admin.deleteUser(authUserId);
      if (!error) return;
      // Already gone (a retried run) is success, anything else is not.
      const message = readErrorMessage(error, "");
      if (/not found/i.test(message) || /User not found/i.test(message)) return;
      throw new Error(`auth user delete failed: ${message}`);
    },

    async claimRequest(requestId: string): Promise<boolean> {
      const { data, error } = await table(client, "account_deletion_requests")
        .update({
          status: "processing",
          processing_started_at: new Date().toISOString(),
          failure_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .in("status", ["pending", "in_review", "verified", "failed"])
        .select("id");

      if (error) throw new Error(readErrorMessage(error, "claim failed"));
      return Array.isArray(data) && data.length > 0;
    },

    async markCompleted(
      requestId: string,
      summary: Record<string, unknown>,
    ): Promise<void> {
      const now = new Date().toISOString();
      const { error } = await table(client, "account_deletion_requests")
        .update({
          status: "completed",
          completed_at: now,
          updated_at: now,
          failure_reason: null,
          resolution_note: "تم تنفيذ الحذف وإخفاء الهوية تلقائياً.",
          erasure_summary: summary,
        })
        .eq("id", requestId);
      if (error) throw new Error(readErrorMessage(error, "complete failed"));
    },

    async markFailed(
      requestId: string,
      failureReason: string,
      summary?: Record<string, unknown>,
    ): Promise<void> {
      const now = new Date().toISOString();
      await table(client, "account_deletion_requests")
        .update({
          status: "failed",
          updated_at: now,
          failure_reason: failureReason.slice(0, 2000),
          ...(summary ? { erasure_summary: summary } : {}),
        })
        .eq("id", requestId);
    },

    async writeAudit(entry): Promise<void> {
      // audit_logs RLS restricts INSERT/UPDATE to super_admin, so this must go
      // through the service-role client, never the actor's session client.
      try {
        await table(client, "audit_logs").insert({
          actor_source: "api",
          action_type: entry.action,
          entity_type: "account_deletion_request",
          entity_id: entry.requestId,
          school_id: entry.schoolId,
          summary: entry.summary,
          metadata: entry.metadata,
        });
      } catch {
        // Audit must never break the erasure itself.
      }
    },
  };
}
