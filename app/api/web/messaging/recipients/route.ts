import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const ALLOWED_ROLES = ["admin", "super_admin", "employee"] as const;

export async function GET(request: NextRequest) {
  const schoolId = request.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: [...ALLOWED_ROLES],
      roleDeniedMessage: "البحث عن المستخدمين متاح للإدارة فقط.",
    },
    request.headers.get("authorization"),
  );

  if (!context.ok) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "message" in context
            ? context.message
            : "تعذر التحقق من الصلاحيات.",
      },
      { status: "status" in context ? context.status : 500 },
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(request, {
    namespace: "messaging-recipients",
    windowMs: 60_000,
    maxHits: 60,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const roleFilter = request.nextUrl.searchParams.get("role");

  let query = actorSupabase
    .from("managed_user_profiles")
    .select("auth_user_id, full_name, role")
    .eq("school_id", targetSchoolId)
    .eq("is_active", true)
    .neq("auth_user_id", actorUserId)
    .ilike("full_name", `%${q}%`)
    .order("full_name")
    .limit(20);

  if (roleFilter) {
    query = query.eq("role", roleFilter);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, error: "تعذر البحث عن المستخدمين." },
      { status: 500 },
    );
  }

  const items = (data ?? []).map((row) => ({
    id: row.auth_user_id,
    name: row.full_name,
    role: row.role,
    class_name: null,
  }));

  return NextResponse.json({ ok: true, items });
}
