import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/middleware/auth-middleware";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { createInsiteNotification } from "@/lib/notifications/insite-service";
import { getTargetUsers } from "@/lib/notifications/targeting";
import { sendExpoPushToTokens } from "@/lib/notifications/push-service";
import type { CreateNotificationInput } from "@/lib/notifications/types";

const ENDPOINT = "POST /api/web/notifications/send-all";

export async function POST(request: NextRequest) {
  const { auth, response } = requireAuth(request, ENDPOINT);
  if (response) return response;

  const { allowed, response: roleRes } = requireRole(auth, ["admin", "super_admin"], ENDPOINT);
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
  const schoolId: string = auth.role === "super_admin" && body.schoolId ? body.schoolId : auth.schoolId;
  const branchId = body.branchId && (auth.role === "super_admin" || !auth.branchId)
    ? body.branchId
    : (auth.branchId ?? null);
  const channels: string[] = Array.isArray(body.channels) ? body.channels : ["insite"];

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
    sentByUserId: auth.userId,
  };

  // إرسال داخل الموقع — دائماً
  const insiteResult = await createInsiteNotification(supabase, input);

  // Web Push — اختياري
  let pushResult: { sent: number; failed: number; errors?: string[] } | undefined;

  if (channels.includes("push") && insiteResult.ok) {
    const userIds = await getTargetUsers(supabase, schoolId, body.target);
    if (userIds.length > 0) {
      const { data: subs } = await supabase
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
