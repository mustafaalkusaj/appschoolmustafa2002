import { NextRequest, NextResponse } from "next/server";

import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { buildSchoolCacheTag, invalidateCacheTags } from "@/lib/server-cache";

const ENDPOINT_PUT = "PUT /api/web/mobile-app/config";
const APP_VERSION_KEY = "app_version";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

type AppVersionValue = {
  min_supported_version: string;
  latest_version: string;
  force_update: boolean;
};

function normalizeVersionValue(raw: unknown): AppVersionValue {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    min_supported_version:
      typeof obj.min_supported_version === "string" ? obj.min_supported_version.trim() : "",
    latest_version: typeof obj.latest_version === "string" ? obj.latest_version.trim() : "",
    force_update: Boolean(obj.force_update),
  };
}

/**
 * GET /api/web/mobile-app/config?schoolId=...
 * schoolId omitted/empty → global config. Returns the app_version value
 * (with the global fallback applied when reading a school override).
 */
export async function GET(request: NextRequest) {
  const context = await resolveSuperAdminActorContext(request.headers.get("authorization"));
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const schoolIdParam = (new URL(request.url).searchParams.get("schoolId") ?? "").trim();
  const schoolId = schoolIdParam || null;

  const supabase = createServiceSupabaseClient();
  let query = supabase.from("app_config").select("school_id, value").eq("key", APP_VERSION_KEY);
  query = schoolId
    ? query.or(`school_id.eq.${schoolId},school_id.is.null`)
    : query.is("school_id", null);

  const { data, error } = await query;
  if (error) {
    return jsonError(`تعذر تحميل إعدادات الإصدار: ${error.message}`, 500);
  }

  const rows = (data ?? []) as Array<{ school_id: string | null; value: unknown }>;
  const scoped = schoolId ? rows.find((r) => r.school_id === schoolId) : undefined;
  const global = rows.find((r) => r.school_id === null);
  const chosen = scoped ?? global;

  return NextResponse.json({
    ok: true,
    schoolId,
    config: normalizeVersionValue(chosen?.value),
    has_override: Boolean(scoped),
  });
}

/**
 * PUT /api/web/mobile-app/config
 * Body: { schoolId?: string|null, min_supported_version, latest_version, force_update }
 * Upserts the app_version config row (global when schoolId is empty/null).
 */
export async function PUT(request: NextRequest) {
  const context = await resolveSuperAdminActorContext(request.headers.get("authorization"));
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const body = (await request.json().catch(() => null)) as
    | (Partial<AppVersionValue> & { schoolId?: string | null })
    | null;
  if (!body) {
    return jsonError(`${ENDPOINT_PUT}: جسم الطلب غير صالح.`, 400);
  }

  const schoolId = body.schoolId && String(body.schoolId).trim() ? String(body.schoolId).trim() : null;
  const value = normalizeVersionValue(body);

  if (!value.latest_version) {
    return jsonError(`${ENDPOINT_PUT}: latest_version مطلوب.`, 400);
  }

  const supabase = createServiceSupabaseClient();

  // Manual upsert: partial unique indexes (one for school rows, one for the
  // global row) are not addressable by a single onConflict target, so we
  // check-then-write to keep a single row per (school_id, key).
  let existingQuery = supabase.from("app_config").select("id").eq("key", APP_VERSION_KEY);
  existingQuery = schoolId
    ? existingQuery.eq("school_id", schoolId)
    : existingQuery.is("school_id", null);
  const { data: existing } = await existingQuery.maybeSingle();

  const nowIso = new Date().toISOString();
  if (existing?.id) {
    const { error } = await supabase
      .from("app_config")
      .update({ value, updated_at: nowIso })
      .eq("id", (existing as { id: string }).id);
    if (error) return jsonError(`تعذر حفظ إعدادات الإصدار: ${error.message}`, 500);
  } else {
    const { error } = await supabase
      .from("app_config")
      .insert({ school_id: schoolId, key: APP_VERSION_KEY, value, updated_at: nowIso });
    if (error) return jsonError(`تعذر حفظ إعدادات الإصدار: ${error.message}`, 500);
  }

  // Clear cached app-config reads (global + this school's override path).
  invalidateCacheTags([
    `app-config-global:${APP_VERSION_KEY}`,
    ...(schoolId ? [buildSchoolCacheTag(schoolId, "app-config")] : []),
  ]);

  return NextResponse.json({ ok: true, schoolId, config: value });
}
