import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin", "student", "teacher"] },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return NextResponse.json({ error: context.message }, { status: context.status });
  }

  const { actorUserId, targetSchoolId } = context.value;

  const body = await request.json().catch(() => null);
  if (!body?.subscription?.endpoint || !body?.subscription?.keys) {
    return NextResponse.json(
      { error: "subscription with endpoint and keys required" },
      { status: 400 },
    );
  }

  const subscriptionJson = {
    type: "web" as const,
    endpoint: body.subscription.endpoint,
    keys: body.subscription.keys,
  };

  const svc = createServiceSupabaseClient();

  const { data: existing } = await svc
    .from("user_push_subscriptions")
    .select("id")
    .eq("user_id", actorUserId)
    .eq("school_id", targetSchoolId)
    .contains("subscription_json", { endpoint: subscriptionJson.endpoint })
    .limit(1)
    .maybeSingle();

  if (existing) {
    await svc
      .from("user_push_subscriptions")
      .update({ subscription_json: subscriptionJson, is_active: true })
      .eq("id", existing.id);
  } else {
    await svc.from("user_push_subscriptions").insert({
      user_id: actorUserId,
      school_id: targetSchoolId,
      subscription_json: subscriptionJson,
      is_active: true,
    });
  }

  return NextResponse.json({ ok: true });
}
