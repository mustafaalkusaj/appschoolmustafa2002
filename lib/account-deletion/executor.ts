/**
 * Account-deletion executor.
 *
 * See `lib/account-deletion/policy.ts` for the erasure policy this implements.
 *
 * Ordering is deliberate:
 *   1. claim (status -> processing) — a lost race means another worker owns it
 *   2. resolve the subject's linked student/teacher rows
 *   3. enumerate + delete storage objects  ← BEFORE the DB erasure, because the
 *      object paths are read from the very columns step 4 nulls out. If storage
 *      removal fails we stop here: nothing has been destroyed, the request is
 *      marked `failed`, and the next cron run retries from a clean state.
 *   4. atomic DB erasure via RPC (single transaction)
 *   5. delete the auth.users row
 *   6. status -> completed + audit
 *
 * Idempotency: an already-`completed` request short-circuits at step 0; the RPC
 * itself re-checks and returns `alreadyCompleted` rather than re-anonymizing;
 * storage removal of a missing key is a no-op; deleting an absent auth user is
 * swallowed. Running the executor twice on the same request is a no-op the
 * second time and never errors.
 */
import { buildAnonymizationToken } from "@/lib/account-deletion/policy";
import type {
  AccountDeletionGateway,
  AccountDeletionRequest,
  AccountDeletionResult,
} from "@/lib/account-deletion/types";

export type ExecuteOptions = {
  /** Who triggered it — cron, or an admin actioning the request by hand. */
  trigger: "cron" | "admin";
  actorUserId?: string | null;
};

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

export async function executeAccountDeletion(
  gateway: AccountDeletionGateway,
  request: AccountDeletionRequest,
  options: ExecuteOptions,
): Promise<AccountDeletionResult> {
  if (request.status === "completed") {
    return {
      requestId: request.id,
      status: "skipped",
      reason: "already_completed",
    };
  }

  if (
    request.status === "cancelled" ||
    request.status === "rejected" ||
    request.status === "processing"
  ) {
    return {
      requestId: request.id,
      status: "skipped",
      reason: `not_actionable:${request.status}`,
    };
  }

  const claimed = await gateway.claimRequest(request.id);
  if (!claimed) {
    return {
      requestId: request.id,
      status: "skipped",
      reason: "claim_lost",
    };
  }

  const anonymizationToken = buildAnonymizationToken(request.id);

  try {
    const subject = await gateway.loadSubject(request);

    const objects = await gateway.listSubjectStorageObjects(subject);
    const storage =
      objects.length > 0
        ? await gateway.removeStorageObjects(objects)
        : { removed: [], failed: [] };

    if (storage.failed.length > 0) {
      // Storage is part of the erasure. A request whose media survives is NOT
      // deleted, so it must never reach `completed`.
      const reason = `storage_removal_failed: ${storage.failed
        .map((item) => `${item.bucket}/${item.path} (${item.error})`)
        .slice(0, 5)
        .join("; ")}`;

      await gateway.markFailed(request.id, reason, {
        storage_failed_count: storage.failed.length,
        storage_removed_count: storage.removed.length,
      });
      await gateway.writeAudit({
        action: "account_deletion_failed",
        requestId: request.id,
        schoolId: request.school_id,
        summary: "فشل حذف ملفات المستخدم — لم يكتمل طلب الحذف.",
        metadata: {
          trigger: options.trigger,
          actor_user_id: options.actorUserId ?? null,
          failure_reason: reason,
          storage_failed: storage.failed,
        },
      });

      return {
        requestId: request.id,
        status: "failed",
        reason,
        storage,
      };
    }

    const erasure = await gateway.runDatabaseErasure(request, subject);

    if (subject.authUserId) {
      await gateway.deleteAuthUser(subject.authUserId);
    }

    const summary = {
      anonymization_token: erasure.anonymizationToken,
      already_completed: erasure.alreadyCompleted,
      storage_removed_count: storage.removed.length,
      affected: erasure.affected,
      trigger: options.trigger,
      actor_user_id: options.actorUserId ?? null,
    };

    await gateway.markCompleted(request.id, summary);
    await gateway.writeAudit({
      action: "account_deletion_completed",
      requestId: request.id,
      schoolId: request.school_id,
      summary: "تم تنفيذ حذف الحساب وإخفاء هوية السجلات المرتبطة.",
      metadata: summary,
    });

    return {
      requestId: request.id,
      status: "completed",
      anonymizationToken: erasure.anonymizationToken,
      storage,
      affected: erasure.affected,
    };
  } catch (error) {
    const reason = errorMessage(error, "unknown_erasure_error");
    await gateway.markFailed(request.id, reason);
    await gateway.writeAudit({
      action: "account_deletion_failed",
      requestId: request.id,
      schoolId: request.school_id,
      summary: "فشل تنفيذ طلب حذف الحساب.",
      metadata: {
        trigger: options.trigger,
        actor_user_id: options.actorUserId ?? null,
        failure_reason: reason,
        anonymization_token: anonymizationToken,
      },
    });

    return { requestId: request.id, status: "failed", reason };
  }
}
