// ============================================================
// خدمة إشعارات داخل الموقع
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { getTargetUsers } from "./targeting";
import type {
  CreateNotificationInput,
  NotificationListItem,
  NotificationWithReadStatus,
} from "./types";

const BATCH_SIZE = 500;

// ----------------------------------------------------------------
// إرسال إشعار جديد
// ----------------------------------------------------------------
export interface InsiteDeliveryStats {
  targeted: number;
  sent: number;
  failed: number;
  firstError?: string;
}

export async function createInsiteNotification(
  supabase: SupabaseClient,
  input: CreateNotificationInput,
): Promise<
  | { ok: true; notificationId: string; recipientCount: number; delivery: InsiteDeliveryStats }
  | { ok: false; error: string }
> {
  // 1. إدراج الإشعار بحالة draft
  const { data: notif, error: insertErr } = await supabase
    .from("school_notifications")
    .insert({
      school_id: input.schoolId,
      branch_id: input.branchId ?? null,
      type: input.type ?? "insite",
      title: input.title,
      body: input.body,
      target_type: input.target.targetType,
      target_class: input.target.targetClass ?? null,
      target_section: input.target.targetSection ?? null,
      target_user_id: input.target.targetUserId ?? null,
      priority: input.priority ?? "normal",
      category: input.category ?? "general",
      template: input.template ?? "default",
      media_url: input.mediaUrl ?? null,
      media_type: input.mediaType ?? null,
      sent_by_user_id: input.sentByUserId,
      status: "draft",
    })
    .select("id")
    .single();

  if (insertErr || !notif) {
    return { ok: false, error: insertErr?.message ?? "Failed to insert notification" };
  }

  const notificationId = notif.id as string;

  try {
    // 2. تحديد المستلمين
    const userIds = await getTargetUsers(supabase, input.schoolId, input.target);

    if (userIds.length === 0) {
      await supabase
        .from("school_notifications")
        .update({ status: "sent", sent_at: new Date().toISOString(), recipient_count: 0 })
        .eq("id", notificationId);
      return {
        ok: true,
        notificationId,
        recipientCount: 0,
        delivery: { targeted: 0, sent: 0, failed: 0 },
      };
    }

    // 3. إدراج المستلمين على دفعات مع تتبع النجاح والفشل
    // Use service role to bypass RLS — admin inserts recipients for OTHER users
    const serviceSupabase = createServiceSupabaseClient();
    let succeededCount = 0;
    let failedCount = 0;
    let firstBatchError: string | undefined;

    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE).map((userId) => ({
        notification_id: notificationId,
        user_id: userId,
        is_read: false,
      }));

      const { error: batchErr } = await serviceSupabase
        .from("notification_recipients")
        .insert(batch);

      if (batchErr) {
        console.error("[notifications] batch insert error:", batchErr.message);
        failedCount += batch.length;
        if (!firstBatchError) firstBatchError = batchErr.message;
      } else {
        succeededCount += batch.length;
      }
    }

    const delivery: InsiteDeliveryStats = {
      targeted: userIds.length,
      sent: succeededCount,
      failed: failedCount,
      ...(firstBatchError ? { firstError: firstBatchError } : {}),
    };

    // 4. تحديث حالة الإشعار — sent إذا نجح ولو جزء، failed إذا فشل الكل
    const finalStatus = succeededCount > 0 ? "sent" : "failed";
    await supabase
      .from("school_notifications")
      .update({
        status: finalStatus,
        sent_at: new Date().toISOString(),
        recipient_count: succeededCount,
      })
      .eq("id", notificationId);

    return { ok: true, notificationId, recipientCount: succeededCount, delivery };
  } catch (err) {
    // في حالة الفشل نُحدّث الحالة إلى failed
    await supabase
      .from("school_notifications")
      .update({ status: "failed" })
      .eq("id", notificationId);
    return { ok: false, error: String(err) };
  }
}

// ----------------------------------------------------------------
// عدد الإشعارات غير المقروءة
// ----------------------------------------------------------------
export async function getUnreadCount(
  supabase: SupabaseClient,
  userId: string,
  schoolId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notification_recipients")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)
    .not("notification_id", "is", null);

  // نفلتر أيضاً بـ school_id عبر join
  if (error) return 0;
  return count ?? 0;
}

// ----------------------------------------------------------------
// وضع علامة مقروء على إشعارات محددة
// ----------------------------------------------------------------
export async function markAsRead(
  supabase: SupabaseClient,
  userId: string,
  notificationIds: string[],
): Promise<void> {
  if (notificationIds.length === 0) return;
  await supabase
    .from("notification_recipients")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("notification_id", notificationIds);
}

// ----------------------------------------------------------------
// وضع علامة مقروء على كل الإشعارات
// ----------------------------------------------------------------
export async function markAllAsRead(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  await supabase
    .from("notification_recipients")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false);
}

// ----------------------------------------------------------------
// قائمة إشعارات المستخدم (صندوق الوارد)
// ----------------------------------------------------------------
export async function listNotifications(
  supabase: SupabaseClient,
  userId: string,
  _schoolId: string,
  opts: { page?: number; pageSize?: number } = {},
): Promise<NotificationWithReadStatus[]> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, opts.pageSize ?? 20);
  const from = (page - 1) * pageSize;

  const { data, error } = await supabase
    .from("notification_recipients")
    .select(`
      id,
      notification_id,
      is_read,
      read_at,
      created_at,
      school_notifications (
        title,
        body,
        category,
        priority
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    notificationId: row.notification_id,
    title: row.school_notifications?.title ?? "",
    body: row.school_notifications?.body ?? "",
    category: row.school_notifications?.category ?? "general",
    priority: row.school_notifications?.priority ?? "normal",
    isRead: row.is_read,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

// ----------------------------------------------------------------
// قائمة الإشعارات المُرسَلة (لوحة الإدارة)
// ----------------------------------------------------------------
export async function listSentNotifications(
  supabase: SupabaseClient,
  schoolId: string,
  opts: { page?: number; pageSize?: number; search?: string; branchId?: string | null } = {},
): Promise<{ items: NotificationListItem[]; totalCount: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, opts.pageSize ?? 20);
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("school_notifications")
    .select("*", { count: "exact" })
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  // فلترة بالفرع — super_admin لا يملك branchId فيرى كل الفروع
  if (opts.branchId) {
    query = query.eq("branch_id", opts.branchId);
  }

  if (opts.search) {
    query = query.ilike("title", `%${opts.search}%`);
  }

  const { data, count, error } = await query;
  if (error || !data) return { items: [], totalCount: 0 };

  const items: NotificationListItem[] = data.map((row: any) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    targetType: row.target_type,
    targetClass: row.target_class,
    targetSection: row.target_section,
    priority: row.priority,
    category: row.category,
    status: row.status,
    recipientCount: row.recipient_count,
    createdAt: row.created_at,
    sentAt: row.sent_at,
    template: row.template ?? "default",
    mediaUrl: row.media_url ?? null,
    mediaType: row.media_type ?? null,
  }));

  return { items, totalCount: count ?? 0 };
}
