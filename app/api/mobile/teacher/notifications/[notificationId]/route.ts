import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

/**
 * Mark one of the teacher's own notifications as read.
 *
 * The teacher notifications tab used to keep "read" purely in component state,
 * so every pull-to-refresh resurrected notifications the teacher had already
 * cleared. Both storage paths are handled because the reader
 * (queryTeacherNotifications) serves rows from both: the newer
 * notification_recipients fan-out table and the legacy notifications table.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ notificationId: string }> },
) {
  const resolved = await resolveMobileRouteContext(req, "teacher");
  if (resolved.ok === false) {
    return resolved.response;
  }

  const { notificationId } = await context.params;
  const { serviceSupabase, authUserId, schoolId } = resolved.value;

  if (!notificationId || !authUserId) {
    return NextResponse.json(
      { ok: false, error: { message: "معرّف الإشعار مطلوب." } },
      { status: 400 },
    );
  }

  // Fan-out table first: that is where the reader gets ids from when the
  // school is on the newer notification pipeline. queryTeacherNotifications
  // surfaces `notification_id` (not the recipient row id), so match on that.
  const recipient = await serviceSupabase
    .from("notification_recipients")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("notification_id", notificationId)
    .eq("user_id", authUserId)
    .select("id");

  if (recipient.error) {
    return NextResponse.json(
      { ok: false, error: { message: recipient.error.message } },
      { status: 500 },
    );
  }

  if (recipient.data?.length) {
    return NextResponse.json({ ok: true });
  }

  // Legacy path: queryTeacherNotifications selects these rows by
  // metadata->teacher_id (they are the teacher's own broadcasts), so the row
  // is scoped the same way here rather than by user_id, which on a broadcast
  // row points at a recipient and never at the teacher.
  const teacherId = resolved.value.account.teacher?.id;
  if (!teacherId) {
    return NextResponse.json(
      { ok: false, error: { message: "الإشعار غير موجود." } },
      { status: 404 },
    );
  }

  const legacy = await serviceSupabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("school_id", schoolId)
    .contains("metadata", { teacher_id: teacherId })
    .select("id");

  if (legacy.error) {
    return NextResponse.json(
      { ok: false, error: { message: legacy.error.message } },
      { status: 500 },
    );
  }

  if (!legacy.data?.length) {
    return NextResponse.json(
      { ok: false, error: { message: "الإشعار غير موجود." } },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
