import { NextRequest, NextResponse } from "next/server";

import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";
import { sendPushNotification } from "@/lib/push-notifications";

type Params = { params: Promise<{ id: string }> };

// Generated database types are updated after migrations are applied.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function table(client: unknown, name: string): any {
  return (client as { from: (table: string) => unknown }).from(name);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const status = typeof body?.status === "string" ? body.status.trim() : "";
    const note =
      typeof body?.resolution_note === "string"
        ? body.resolution_note.trim().slice(0, 1000)
        : "";
    if (!new Set(["reviewing", "resolved", "dismissed"]).has(status)) {
      return NextResponse.json(
        { ok: false, error: "إجراء المراجعة غير صالح." },
        { status: 400 },
      );
    }

    const { serviceSupabase, schoolId, authUserId } = context.value;

    // Load the report first: resolving it acts on the reported message and the
    // reported user, so the handler needs both ids before it writes anything.
    const { data: report, error: loadError } = await table(
      serviceSupabase,
      "messaging_reports",
    )
      .select("id, message_id, reported_user_id, reporter_user_id")
      .eq("id", id)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (loadError)
      return NextResponse.json(
        { ok: false, error: "تعذر تحديث البلاغ." },
        { status: 500 },
      );
    if (!report)
      return NextResponse.json(
        { ok: false, error: "البلاغ غير موجود." },
        { status: 404 },
      );

    const { data, error } = await table(serviceSupabase, "messaging_reports")
      .update({
        status,
        resolution_note: note || null,
        reviewed_by: authUserId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("school_id", schoolId)
      .select("id, status, reviewed_at")
      .maybeSingle();

    if (error)
      return NextResponse.json(
        { ok: false, error: "تعذر تحديث البلاغ." },
        { status: 500 },
      );
    if (!data)
      return NextResponse.json(
        { ok: false, error: "البلاغ غير موجود." },
        { status: 404 },
      );

    // Apple 1.2 requires acting on an upheld report, not just recording a
    // verdict. Upholding one (status "resolved") removes the message, stops the
    // reported user from reaching the reporter again, and tells the reporter
    // what happened. Each step is best-effort and reported back, so a partial
    // failure is visible to the admin instead of silently leaving abuse live.
    const enforcement = {
      message_removed: false,
      user_blocked: false,
      reporter_notified: false,
    };

    if (status === "resolved") {
      const messageId =
        typeof report.message_id === "string" ? report.message_id : null;
      const reportedUserId =
        typeof report.reported_user_id === "string"
          ? report.reported_user_id
          : null;
      const reporterUserId =
        typeof report.reporter_user_id === "string"
          ? report.reporter_user_id
          : null;

      if (messageId) {
        const { error: removeError } = await table(serviceSupabase, "messages")
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: authUserId,
            deletion_reason: "moderation_report_upheld",
          })
          .eq("id", messageId)
          // The id comes from a school-scoped report row already; the tenant
          // predicate is defense-in-depth on a service-role write.
          .eq("school_id", schoolId);
        enforcement.message_removed = !removeError;
      }

      // The block is stored under the reporter as blocker: enforcement is
      // symmetric in both the read and the send path, so one row severs the
      // pair, and the reporter can lift it later from their own blocked list.
      if (reportedUserId && reporterUserId) {
        const { error: blockError } = await table(
          serviceSupabase,
          "messaging_blocks",
        ).upsert(
          {
            school_id: schoolId,
            blocker_user_id: reporterUserId,
            blocked_user_id: reportedUserId,
            reason: "admin_moderation",
          },
          { onConflict: "school_id,blocker_user_id,blocked_user_id" },
        );
        enforcement.user_blocked = !blockError;
      }

      if (reporterUserId) {
        const result = await sendPushNotification(serviceSupabase, {
          schoolId,
          userIds: [reporterUserId],
          type: "moderation",
          title: "تم اتخاذ إجراء بشأن بلاغك",
          message:
            "راجعت الإدارة بلاغك وتم حذف المحتوى المخالف ومنع المستخدم من مراسلتك.",
          link: "/messages",
        });
        enforcement.reporter_notified = result.inAppSaved > 0;
      }
    }

    return NextResponse.json({ ok: true, data: { ...data, enforcement } });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
