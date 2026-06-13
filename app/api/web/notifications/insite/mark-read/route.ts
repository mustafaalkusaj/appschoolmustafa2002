import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { markAsRead, markAllAsRead } from "@/lib/notifications/insite-service";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(request: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin", "employee"], roleDeniedMessage: "ليس لديك صلاحية تحديث حالة الإشعارات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, actorUserId } = context.value;
  const body = await request.json().catch(() => ({}));

  if (body.all === true) {
    await markAllAsRead(actorSupabase, actorUserId);
  } else if (Array.isArray(body.notificationIds) && body.notificationIds.length > 0) {
    await markAsRead(actorSupabase, actorUserId, body.notificationIds as string[]);
  }

  return NextResponse.json({ ok: true });
}
