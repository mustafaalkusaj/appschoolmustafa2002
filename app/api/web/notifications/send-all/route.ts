import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createInsiteNotification } from "@/lib/notifications/insite-service";
import { getTargetUsers } from "@/lib/notifications/targeting";
import { sendExpoPushToTokens } from "@/lib/notifications/push-service";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import type { CreateNotificationInput } from "@/lib/notifications/types";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(request: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin"], roleDeniedMessage: "ليس لديك صلاحية إرسال الإشعارات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId, actorBranchId } = context.value;

  const rateLimited = await enforceRateLimit(request, {
    namespace: "notifications-send-all",
    windowMs: 60_000,
    maxHits: 5,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.body || !body?.target?.targetType) {
    return NextResponse.json(
      { ok: false, error: "title, body, and target.targetType are required" },
      { status: 400 },
    );
  }

  // School isolation: super_admin may specify any schoolId via resolveSchoolScopedActorContext
  const schoolId = targetSchoolId;
  const branchId = body.branchId && (context.value.actorRole === "super_admin" || !actorBranchId)
    ? body.branchId
    : (actorBranchId ?? null);
  const channels: string[] = Array.isArray(body.channels) ? body.channels : ["insite", "push"];

  const input: CreateNotificationInput = {
    schoolId,
    branchId,
    type: "insite",
    title: body.title,
    body: body.body,
    target: body.target,
    priority: body.priority ?? "normal",
    category: body.category ?? "general",
    template: body.template ?? "default",
    mediaUrl: body.mediaUrl ?? undefined,
    mediaType: body.mediaType ?? undefined,
    sentByUserId: actorUserId,
  };

  const insiteResult = await createInsiteNotification(actorSupabase, input);

  let pushResult: { sent: number; failed: number; errors?: string[] } | undefined;

  if (channels.includes("push") && insiteResult.ok) {
    const userIds = await getTargetUsers(actorSupabase, schoolId, body.target);
    if (userIds.length > 0) {
      const serviceSupabase = createServiceSupabaseClient();
      const { data: subs } = await serviceSupabase
        .from("user_push_subscriptions")
        .select("subscription_json")
        .in("user_id", userIds)
        .eq("school_id", schoolId)
        .eq("is_active", true);

      const tokens: string[] = (subs ?? [])
        .filter(
          (s) =>
            s.subscription_json &&
            typeof s.subscription_json === "object" &&
            (s.subscription_json as Record<string, unknown>).type === "expo",
        )
        .map(
          (s) =>
            ((s.subscription_json as Record<string, unknown>).token as string) ?? "",
        )
        .filter(Boolean);

      pushResult = await sendExpoPushToTokens(tokens, {
        title: body.title,
        body: body.body,
        data: {
          category: input.category,
          priority: input.priority,
          notificationId: insiteResult.notificationId,
        },
      });
    } else {
      pushResult = { sent: 0, failed: 0, errors: [] };
    }
  }

  if (!insiteResult.ok) {
    return NextResponse.json({ ok: false, error: insiteResult.error }, { status: 500 });
  }

  const partial = insiteResult.delivery.failed > 0;
  return NextResponse.json(
    {
      ok: true,
      notificationId: insiteResult.notificationId,
      recipientCount: insiteResult.recipientCount,
      delivery: insiteResult.delivery,
      push: pushResult,
      ...(partial ? { partial: true } : {}),
    },
    { status: partial ? 207 : 201 },
  );
}
