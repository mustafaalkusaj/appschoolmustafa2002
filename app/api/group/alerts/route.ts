import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { jsonError } from "@/lib/route-utils";

function getService() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function resolveAuthorizedGroupId(req: NextRequest, requestedGroupId: string | null) {
  if (!requestedGroupId) {
    return { ok: false as const, status: 400, message: "groupId مطلوب" };
  }

  const context = await resolveSchoolScopedActorContext(
    null,
    {
      allowedRoles: ["admin"],
      roleDeniedMessage: "هذه الواجهة مخصصة لمدير المدرسة على مستوى المدرسة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return {
      ok: false as const,
      status: "status" in context ? context.status : 500,
      message: "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
    };
  }

  if (context.value.scopeLevel !== "group_admin") {
    return { ok: false as const, status: 403, message: "لا تملك صلاحية الوصول إلى تنبيهات المجموعة." };
  }

  const { data: school, error } = await context.value.actorSupabase
    .from("schools")
    .select("id, group_id")
    .eq("id", context.value.targetSchoolId)
    .maybeSingle();

  if (error || !school?.id || !school.group_id) {
    return { ok: false as const, status: 404, message: "المجموعة الحالية غير متاحة لهذا المستخدم." };
  }

  if (school.group_id !== requestedGroupId) {
    return { ok: false as const, status: 403, message: "لا يمكنك الوصول إلى مجموعة أخرى." };
  }

  return { ok: true as const, groupId: school.group_id };
}

export async function GET(req: NextRequest) {
  const auth = await resolveAuthorizedGroupId(req, req.nextUrl.searchParams.get("groupId"));
  if (!auth.ok) {
    return jsonError(auth.message, auth.status);
  }

  const service = getService();
  const { data, error } = await service
    .from("group_alerts")
    .select("*")
    .eq("group_id", auth.groupId)
    .eq("is_read", false)
    .order("created_at", { ascending: false });

  if (error) {
    return jsonError("تعذر جلب التنبيهات", 500);
  }

  return NextResponse.json({ ok: true, alerts: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { id?: string; groupId?: string } | null;
  const auth = await resolveAuthorizedGroupId(req, body?.groupId ?? null);
  if (!auth.ok) {
    return jsonError(auth.message, auth.status);
  }

  if (!body?.id) {
    return jsonError("id مطلوب", 400);
  }

  const service = getService();
  const { error } = await service
    .from("group_alerts")
    .update({ is_read: true })
    .eq("id", body.id)
    .eq("group_id", auth.groupId);

  if (error) {
    return jsonError("تعذر تحديث التنبيه", 500);
  }

  return NextResponse.json({ ok: true });
}

