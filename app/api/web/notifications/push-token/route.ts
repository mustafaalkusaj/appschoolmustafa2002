import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(request: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin", "employee"], roleDeniedMessage: "ليس لديك صلاحية تسجيل رمز الإشعار." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const body = await request.json().catch(() => null);
  if (!body?.token || typeof body.token !== "string") {
    return NextResponse.json(
      { ok: false, error: "token is required" },
      { status: 400 },
    );
  }

  const platform: string = body.platform ?? "unknown";
  const token: string = body.token;

  // Validate Expo token format
  if (
    !token.startsWith("ExponentPushToken[") &&
    !token.startsWith("ExpoPushToken[")
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid Expo push token format" },
      { status: 400 },
    );
  }

  const { error } = await actorSupabase.from("user_push_subscriptions").upsert(
    {
      user_id: actorUserId,
      school_id: targetSchoolId,
      subscription_json: { type: "expo", token },
      platform,
      is_active: true,
    },
    {
      onConflict: "user_id,school_id",
    },
  );

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to register push token" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
