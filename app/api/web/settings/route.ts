import { NextRequest, NextResponse } from "next/server";

import { settingsMutationSchema, settingsQuerySchema } from "@/lib/api-schemas";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonValidationError, logRouteError } from "@/lib/route-utils";

export async function GET(req: NextRequest) {
  const parsed = settingsQuerySchema.safeParse({
    schoolId: req.nextUrl.searchParams.get("schoolId"),
  });

  if (!parsed.success) {
    return jsonValidationError(parsed.error, "معرّف المدرسة غير صالح.");
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إعدادات المدرسة متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "settings-get",
    windowMs: 60_000,
    maxHits: 60,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  try {
    const { data: school, error } = await actorSupabase
      .from("schools")
      .select("id, name, address, phone, city, logo_url, primary_color, secondary_color")
      .eq("id", targetSchoolId)
      .maybeSingle();

    if (error) throw error;
    if (!school) return jsonError("لم يتم العثور على المدرسة.", 404);

    return NextResponse.json(
      { ok: true, school },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    logRouteError("settings-get", error, { actorUserId, schoolId: targetSchoolId });
    return jsonError("تعذر تحميل إعدادات المدرسة. حاول مرة أخرى بعد قليل.", 500);
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = settingsMutationSchema.safeParse(body);

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "تعديل إعدادات المدرسة متاح للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "settings-patch",
    windowMs: 60_000,
    maxHits: 20,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  // Build partial update — only include fields that were provided
  const updatePayload: Record<string, string | null | undefined> = {};
  if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name;
  if (parsed.data.address !== undefined) updatePayload.address = parsed.data.address;
  if (parsed.data.phone !== undefined) updatePayload.phone = parsed.data.phone;
  if (parsed.data.city !== undefined) updatePayload.city = parsed.data.city;
  if (parsed.data.logo_url !== undefined) updatePayload.logo_url = parsed.data.logo_url;
  if (parsed.data.primary_color !== undefined) updatePayload.primary_color = parsed.data.primary_color;
  if (parsed.data.secondary_color !== undefined) updatePayload.secondary_color = parsed.data.secondary_color;

  if (Object.keys(updatePayload).length === 0) {
    return jsonError("لم يتم تقديم أي حقل للتحديث.", 400);
  }

  try {
    const { data: updatedSchool, error } = await actorSupabase
      .from("schools")
      .update(updatePayload)
      .eq("id", targetSchoolId)
      .select("id, name, address, phone, city, logo_url, primary_color, secondary_color")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, school: updatedSchool });
  } catch (error) {
    logRouteError("settings-patch", error, { actorUserId, schoolId: targetSchoolId });
    return jsonError("تعذر حفظ إعدادات المدرسة. حاول مرة أخرى بعد قليل.", 500);
  }
}
