import "server-only";

import {
  ERASABLE_STATUSES,
  GRACE_PERIOD_HOURS,
  isOverdue,
} from "@/lib/account-deletion/policy";
import type { AccountDeletionRequest } from "@/lib/account-deletion/types";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

type ServiceClient = ReturnType<typeof createServiceSupabaseClient>;

const REQUEST_COLUMNS =
  "id, auth_user_id, school_id, status, reason, requested_at, verified_at, completed_at, cancelled_at, retention_deadline, handled_by, resolution_note, metadata";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function requestsTable(client: ServiceClient): any {
  return (client as unknown as { from: (t: string) => unknown }).from(
    "account_deletion_requests",
  );
}

/**
 * Requests whose 72h cancellation window has closed and that still need
 * erasing. `failed` rows are included so a transient storage outage retries.
 */
export async function loadDueDeletionRequests(
  client: ServiceClient,
  limit = 25,
): Promise<AccountDeletionRequest[]> {
  const cutoff = new Date(
    Date.now() - GRACE_PERIOD_HOURS * 3_600_000,
  ).toISOString();

  const { data, error } = await requestsTable(client)
    .select(REQUEST_COLUMNS)
    .in("status", [...ERASABLE_STATUSES])
    .lte("requested_at", cutoff)
    .order("requested_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as AccountDeletionRequest[];
}

export async function loadDeletionRequestById(
  client: ServiceClient,
  requestId: string,
): Promise<AccountDeletionRequest | null> {
  const { data, error } = await requestsTable(client)
    .select(REQUEST_COLUMNS)
    .eq("id", requestId)
    .maybeSingle();

  if (error) throw error;
  return (data as AccountDeletionRequest | null) ?? null;
}

export async function loadSchoolDeletionRequests(
  client: ServiceClient,
  schoolId: string,
  limit = 100,
): Promise<AccountDeletionRequest[]> {
  const { data, error } = await requestsTable(client)
    .select(REQUEST_COLUMNS)
    .eq("school_id", schoolId)
    .order("requested_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as AccountDeletionRequest[];
}

/** Requests already past the published 7-business-day promise. */
export function selectOverdue(
  requests: AccountDeletionRequest[],
  now: Date = new Date(),
): AccountDeletionRequest[] {
  return requests.filter(
    (request) =>
      request.status !== "completed" &&
      request.status !== "cancelled" &&
      request.status !== "rejected" &&
      isOverdue(request.retention_deadline, now),
  );
}
