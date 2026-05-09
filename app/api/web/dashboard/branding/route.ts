import { NextRequest, NextResponse } from "next/server";

import { sanitizeImageUrl } from "@/lib/brand/asset-url";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { detectAppSchemaCompatWithClient } from "@/lib/schema-compat";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function normalizeLogoUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  return sanitizeImageUrl(value) ?? null;
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إعدادات الهوية البصرية متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "dashboard-branding-read",
    windowMs: 60_000,
    maxHits: 60,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  const schemaCompat = await detectAppSchemaCompatWithClient(context.value.actorSupabase);
  const schoolQuery = schemaCompat.schoolColors
    ? context.value.actorSupabase
        .from("schools")
        .select(`id, name, logo_url, primary_color, secondary_color${schemaCompat.schoolThemePreset ? ", theme_preset" : ""}`)
    : context.value.actorSupabase
        .from("schools")
        .select(`id, name, logo_url${schemaCompat.schoolThemePreset ? ", theme_preset" : ""}`);

  const { data: school, error } = await schoolQuery.eq("id", context.value.targetSchoolId).maybeSingle();
  if (error || !school) {
    return jsonError("تعذر تحميل بيانات الهوية البصرية.", 500);
  }

  return NextResponse.json({
    ok: true,
    schemaCompat,
    school,
  });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!schoolId) {
    return jsonError("معرف المدرسة مطلوب.", 400);
  }

  if (!name) {
    return jsonError("اسم المدرسة مطلوب.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "تعديل الهوية البصرية متاح للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "dashboard-branding-write",
    windowMs: 60_000,
    maxHits: 20,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  const schemaCompat = await detectAppSchemaCompatWithClient(context.value.actorSupabase);
  const payload = {
    name,
    logo_url: normalizeLogoUrl(body?.logo_url),
    ...(schemaCompat.schoolColors
      ? {
          primary_color:
            typeof body?.primary_color === "string" && body.primary_color.trim() ? body.primary_color.trim() : null,
          secondary_color:
            typeof body?.secondary_color === "string" && body.secondary_color.trim() ? body.secondary_color.trim() : null,
          ...(schemaCompat.schoolThemePreset
            ? {
                theme_preset:
                  typeof body?.theme_preset === "string" && body.theme_preset.trim() ? body.theme_preset.trim() : null,
              }
            : {}),
        }
      : {}),
  };

  const schoolQuery = schemaCompat.schoolColors
    ? context.value.actorSupabase
        .from("schools")
        .update(payload)
        .eq("id", context.value.targetSchoolId)
        .select(`id, name, logo_url, primary_color, secondary_color${schemaCompat.schoolThemePreset ? ", theme_preset" : ""}`)
    : context.value.actorSupabase
        .from("schools")
        .update(payload)
        .eq("id", context.value.targetSchoolId)
        .select(`id, name, logo_url${schemaCompat.schoolThemePreset ? ", theme_preset" : ""}`);

  const { data: school, error } = await schoolQuery.maybeSingle();
  if (error || !school) {
    return jsonError("تعذر حفظ الهوية البصرية.", 500);
  }

  return NextResponse.json({
    ok: true,
    schemaCompat,
    school,
  });
}
