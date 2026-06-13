import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { getUnreadCount } from "@/lib/notifications/insite-service";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(request: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin", "employee"], roleDeniedMessage: "ليس لديك صلاحية عرض الإشعارات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const count = await getUnreadCount(actorSupabase, actorUserId, targetSchoolId);

  return NextResponse.json({ ok: true, count });
}
