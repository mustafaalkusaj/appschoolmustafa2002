import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/middleware/auth-middleware";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import {
  createInsiteNotification,
  listNotifications,
  listSentNotifications,
} from "@/lib/notifications/insite-service";
import type { CreateNotificationInput } from "@/lib/notifications/types";

const ENDPOINT = "GET /api/web/notifications/insite";

// ----------------------------------------------------------------
// GET — dual mode:
//   ?view=history  → قائمة المُرسَلة (admin)
//   (default)      → صندوق وارد المستخدم
// ----------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { auth, response } = requireAuth(request, ENDPOINT);
  if (response) return response;

  const { searchParams } = request.nextUrl;
  // School isolation: super_admin may specify any schoolId; others locked to their own
  const requestedSchoolId = searchParams.get("schoolId");
  const schoolId = auth.role === "super_admin" && requestedSchoolId ? requestedSchoolId : auth.schoolId;
  const view = searchParams.get("view");
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "20");

  const supabase = createServiceSupabaseClient();

  if (view === "history") {
    const { allowed, response: roleRes } = requireRole(
      auth,
      ["admin", "super_admin"],
      `${ENDPOINT}?view=history`,
    );
    if (roleRes) return roleRes;
    if (!allowed) return roleRes;

    const search = searchParams.get("search") ?? undefined;
    const result = await listSentNotifications(supabase, schoolId, {
      page,
      pageSize,
      search,
      branchId: auth.role === "super_admin" ? null : auth.branchId,
    });

    // snake_case for mobile clients
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
  const rawItems = await listNotifications(supabase, auth.userId, schoolId, {
    page,
    pageSize,
  });

  // camelCase shape for web dashboard
  const items = rawItems;

  // snake_case shape for mobile clients
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
// POST — إرسال إشعار جديد (admin فقط)
// ----------------------------------------------------------------
export async function POST(request: NextRequest) {
  const { auth, response } = requireAuth(request, "POST /api/web/notifications/insite");
  if (response) return response;

  const { allowed, response: roleRes } = requireRole(
    auth,
    ["admin", "super_admin"],
    "POST /api/web/notifications/insite",
  );
  if (roleRes) return roleRes;
  if (!allowed) return roleRes;

  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.body || !body?.target?.targetType) {
    return NextResponse.json(
      { ok: false, error: "title, body, and target.targetType are required" },
      { status: 400 },
    );
  }

  const supabase = createServiceSupabaseClient();

  // School isolation: super_admin may specify any schoolId; others locked to their own
  const postSchoolId = auth.role === "super_admin" && body.schoolId ? body.schoolId : auth.schoolId;
  const postBranchId = body.branchId && (auth.role === "super_admin" || !auth.branchId)
    ? body.branchId
    : (auth.branchId ?? null);

  const input: CreateNotificationInput = {
    schoolId: postSchoolId,
    branchId: postBranchId,
    type: "insite",
    title: body.title,
    body: body.body,
    target: body.target,
    priority: body.priority ?? "normal",
    category: body.category ?? "general",
    sentByUserId: auth.userId,
  };

  const result = await createInsiteNotification(supabase, input);
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
