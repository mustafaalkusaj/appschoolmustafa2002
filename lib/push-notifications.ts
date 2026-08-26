// ============================================================
// Push Notifications Helper (Phase 3)
// ------------------------------------------------------------
// Reusable server helper that:
//   1. Always inserts in-app history rows so notifications work
//      even without a registered device token:
//        - `notifications`  (per-user table the mobile app reads)
//        - `app_notifications` (task-required in-app history table)
//   2. Looks up active Expo push tokens in `user_push_subscriptions`
//      and sends them via the Expo Push API (batched <= 100).
//   3. Marks tokens inactive on DeviceNotRegistered.
//
// Additive only: reuses the existing `sendExpoPushToTokens` transport
// from lib/notifications/push-service.ts. Never throws — always returns
// a { sent, failed, ... } summary so callers can wrap safely.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/types/database.types";

import type { ExpoPushPayload } from "@/lib/notifications/push-service";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const TOKEN_BATCH_SIZE = 100;

export interface PushNotificationInput {
  schoolId: string;
  branchId?: string | null;
  /** Resolved recipient user ids (auth_user_id values). */
  userIds: string[];
  type?: string;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown>;
  /** Optional role tag stored on app_notifications rows. */
  recipientRole?: string | null;
}

export interface PushNotificationResult {
  /** Recipients targeted (unique user ids). */
  targeted: number;
  /** In-app rows successfully written to `notifications`. */
  inAppSaved: number;
  /** Push tickets accepted by Expo. */
  sent: number;
  /** Push tickets rejected by Expo (or tokens that errored). */
  failed: number;
  /** Tokens deactivated due to DeviceNotRegistered. */
  deactivatedTokens: number;
  errors: string[];
}

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean)),
  );
}

function extractExpoToken(subscriptionJson: unknown): string | null {
  if (
    subscriptionJson &&
    typeof subscriptionJson === "object" &&
    "token" in (subscriptionJson as Record<string, unknown>)
  ) {
    const token = (subscriptionJson as Record<string, unknown>).token;
    if (typeof token === "string" && token.trim()) {
      return token.trim();
    }
  }
  return null;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/**
 * Send a push notification + persist in-app history.
 * Never throws; always returns a summary.
 */
export async function sendPushNotification(
  supabase: SupabaseClient,
  input: PushNotificationInput,
): Promise<PushNotificationResult> {
  const result: PushNotificationResult = {
    targeted: 0,
    inAppSaved: 0,
    sent: 0,
    failed: 0,
    deactivatedTokens: 0,
    errors: [],
  };

  const userIds = uniqueNonEmpty(input.userIds);
  result.targeted = userIds.length;

  if (userIds.length === 0) {
    return result;
  }

  // RLS on `notifications` enforces user_id = auth.uid(), so admin
  // can't insert rows for students. Use service-role to bypass.
  const svc = createServiceSupabaseClient();

  const type = input.type ?? "general";
  const metadata = (input.metadata ?? {}) as Record<string, Json>;
  const link = input.link ?? null;

  // ----------------------------------------------------------------
  // 1. In-app history — `notifications` (what mobile reads)
  // ----------------------------------------------------------------
  try {
    const rows = userIds.map((userId) => ({
      user_id: userId,
      school_id: input.schoolId,
      type,
      title: input.title,
      message: input.message,
      is_read: false,
      link,
      metadata,
    }));
    const { error, data } = await svc.from("notifications").insert(rows).select("id");
    if (error) {
      result.errors.push(`notifications insert: ${error.message}`);
    } else {
      result.inAppSaved = data?.length ?? rows.length;
    }
  } catch (error) {
    result.errors.push(
      `notifications insert: ${error instanceof Error ? error.message : "unknown"}`,
    );
  }

  // ----------------------------------------------------------------
  // 1b. In-app history — `app_notifications` (task-required table)
  //     Best-effort; failure here never blocks the push.
  // ----------------------------------------------------------------
  try {
    const appRows = userIds.map((userId) => ({
      recipient_user_id: userId,
      recipient_role: input.recipientRole ?? null,
      school_id: input.schoolId,
      branch_id: input.branchId ?? null,
      type,
      title: input.title,
      message: input.message,
      status: "unread",
      metadata: link ? { ...metadata, link } : metadata,
    }));
    const { error } = await svc.from("app_notifications").insert(appRows);
    if (error) {
      result.errors.push(`app_notifications insert: ${error.message}`);
    }
  } catch (error) {
    result.errors.push(
      `app_notifications insert: ${error instanceof Error ? error.message : "unknown"}`,
    );
  }

  // ----------------------------------------------------------------
  // 2. Look up active Expo tokens for the recipients
  // ----------------------------------------------------------------
  let tokenRows: Array<{ subscription_json: unknown }> = [];
  try {
    const { data, error } = await svc
      .from("user_push_subscriptions")
      .select("subscription_json")
      .in("user_id", userIds)
      .eq("school_id", input.schoolId)
      .eq("is_active", true);
    if (error) {
      result.errors.push(`token lookup: ${error.message}`);
    } else {
      tokenRows = (data ?? []) as Array<{ subscription_json: unknown }>;
    }
  } catch (error) {
    result.errors.push(`token lookup: ${error instanceof Error ? error.message : "unknown"}`);
  }

  const tokens = uniqueNonEmpty(
    tokenRows.map((row) => extractExpoToken(row.subscription_json) ?? ""),
  );

  if (tokens.length === 0) {
    return result;
  }

  // ----------------------------------------------------------------
  // 3. Send via Expo, detecting DeviceNotRegistered per-token so we
  //    can deactivate dead tokens. We send per batch and map tickets
  //    back to tokens by index.
  // ----------------------------------------------------------------
  const payload: ExpoPushPayload = {
    title: input.title,
    body: input.message,
    data: { type, link, ...metadata },
  };

  const deadTokens: string[] = [];

  for (const batch of chunk(tokens, TOKEN_BATCH_SIZE)) {
    try {
      const messages = batch.map((to) => ({
        to,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        priority: "high" as const,
        sound: "default" as const,
        channelId: "default",
      }));

      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => `HTTP ${response.status}`);
        result.failed += batch.length;
        result.errors.push(`Expo API ${response.status}: ${text.slice(0, 200)}`);
        continue;
      }

      const json = (await response.json()) as {
        data?: Array<{
          status: "ok" | "error";
          message?: string;
          details?: { error?: string };
        }>;
      };
      const tickets = Array.isArray(json?.data) ? json.data : [];

      tickets.forEach((ticket, index) => {
        if (ticket.status === "ok") {
          result.sent += 1;
        } else {
          result.failed += 1;
          if (ticket.message) result.errors.push(ticket.message);
          if (ticket.details?.error === "DeviceNotRegistered") {
            const token = batch[index];
            if (token) deadTokens.push(token);
          }
        }
      });

      const unaccounted = batch.length - tickets.length;
      if (unaccounted > 0) result.failed += unaccounted;
    } catch (error) {
      result.failed += batch.length;
      result.errors.push(error instanceof Error ? error.message : "push send error");
    }
  }

  // ----------------------------------------------------------------
  // 4. Deactivate dead tokens (DeviceNotRegistered)
  // ----------------------------------------------------------------
  const uniqueDead = uniqueNonEmpty(deadTokens);
  if (uniqueDead.length > 0) {
    for (const token of uniqueDead) {
      try {
        const { error } = await svc
          .from("user_push_subscriptions")
          .update({ is_active: false })
          .eq("school_id", input.schoolId)
          .contains("subscription_json", { token });
        if (!error) result.deactivatedTokens += 1;
      } catch {
        // best-effort cleanup; ignore
      }
    }
  }

  return result;
}
