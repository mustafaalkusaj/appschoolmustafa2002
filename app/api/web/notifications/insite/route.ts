import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import {
  createInsiteNotification,
  listNotifications,
  listSentNotifications,
} from "@/lib/notifications/insite-service";
import type { CreateNotificationInput } from "@/lib/notifications/types";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

// ----------------------------------------------------------------
// GET -- dual mode:
//   ?view=history  -> sent list (admin)
//   (default)      -> user inbox
// ----------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const view = searchParams.get("view");

  const allowedRoles = view === "history"
    ? (["admin", "super_admin"] as const)
    : (["admin", "super_admin", "employee"] as const);

  const context = await resolveSchoolScopedActorContext(
    searchParams.get("schoolId"),
    { allowedRoles: [...allowedRoles], roleDeniedMessage: "ليس لديك صلاحية عرض الإشعارات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId, actorBranchId, actorRole } = context.value;
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "20");

  if (view === "history") {
    const search = searchParams.get("search") ?? undefined;
    const result = await listSentNotifications(actorSupabase, targetSchoolId, {
      page,
      pageSize,
      search,
      branchId: actorRole === "super_admin" ? null : actorBranchId,
    });

    const notifications = result.items.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      priority: n.priority,
      category: n.category,
      target_type: n.targetType,
      recipient_count: n.recipientCount,
      status: n.status,
      created_at: n.createdAt,
      sent_at: n.sentAt,
    }));

    return NextResponse.json({ ok: true, ...result, notifications });
  }

  // User inbox
  const rawItems = await listNotifications(actorSupabase, actorUserId, targetSchoolId, {
    page,
    pageSize,
  });

  const items = rawItems;

  const notifications = rawItems.map((n) => ({
    id: n.id,
    notification_id: n.notificationId,
    title: n.title,
    body: n.body,
    priority: n.priority,
    category: n.category,
    is_read: n.isRead,
    created_at: n.createdAt,
    sent_at: null as string | null,
  }));

  return NextResponse.json({ ok: true, items, notifications });
}

// ----------------------------------------------------------------
// POST -- send new notification (admin only)
// ----------------------------------------------------------------
export async function POST(request: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin"], roleDeniedMessage: "ليس لديك صلاحية إرسال الإشعارات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId, actorBranchId, actorRole } = context.value;

  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.body || !body?.target?.targetType) {
    return NextResponse.json(
      { ok: false, error: "title, body, and target.targetType are required" },
      { status: 400 },
    );
  }

  const postBranchId = body.branchId && (actorRole === "super_admin" || !actorBranchId)
    ? body.branchId
    : (actorBranchId ?? null);

  const input: CreateNotificationInput = {
    schoolId: targetSchoolId,
    branchId: postBranchId,
    type: "insite",
    title: body.title,
    body: body.body,
    target: body.target,
    priority: body.priority ?? "normal",
    category: body.category ?? "general",
    sentByUserId: actorUserId,
  };

  const result = await createInsiteNotification(actorSupabase, input);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  const partial = result.delivery.failed > 0;
  return NextResponse.json(
    {
      ok: true,
      notificationId: result.notificationId,
      recipientCount: result.recipientCount,
      delivery: result.delivery,
      ...(partial ? { partial: true } : {}),
    },
    { status: partial ? 207 : 201 },
  );
}
