import { NextRequest, NextResponse } from "next/server";

import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { MOBILE_FEATURE_KEYS, type MobileFeatureKey } from "@/lib/mobile-api-server";
import { invalidateSchoolCacheDomains } from "@/lib/server-cache";

const ENDPOINT_GET = "GET /api/web/mobile-app/features";
const ENDPOINT_PUT = "PUT /api/web/mobile-app/features";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function isFeatureKey(value: unknown): value is MobileFeatureKey {
  return typeof value === "string" && (MOBILE_FEATURE_KEYS as readonly string[]).includes(value);
}

function defaultsRecord(): Record<MobileFeatureKey, boolean> {
  return Object.fromEntries(MOBILE_FEATURE_KEYS.map((k) => [k, true])) as Record<
    MobileFeatureKey,
    boolean
  >;
}

/** GET /api/web/mobile-app/features?schoolId=...  → flags for one school. */
export async function GET(request: NextRequest) {
  const context = await resolveSuperAdminActorContext(request.headers.get("authorization"));
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const schoolId = (new URL(request.url).searchParams.get("schoolId") ?? "").trim();
  if (!schoolId) {
    return jsonError(`${ENDPOINT_GET}: schoolId مطلوب.`, 400);
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("school_app_features")
    .select("feature_key, is_enabled")
    .eq("school_id", schoolId);

  if (error) {
    return jsonError(`تعذر تحميل إعدادات الميزات: ${error.message}`, 500);
  }

  const features = defaultsRecord();
  for (const row of (data ?? []) as Array<{ feature_key: string; is_enabled: boolean }>) {
    if (isFeatureKey(row.feature_key)) {
      features[row.feature_key] = Boolean(row.is_enabled);
    }
  }

  return NextResponse.json({ ok: true, schoolId, features });
}

/**
 * PUT /api/web/mobile-app/features
 * Body: { schoolId: string, features: Partial<Record<MobileFeatureKey, boolean>> }
 * Upserts each provided flag for the school.
 */
export async function PUT(request: NextRequest) {
  const context = await resolveSuperAdminActorContext(request.headers.get("authorization"));
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const body = (await request.json().catch(() => null)) as {
    schoolId?: string;
    features?: Record<string, unknown>;
  } | null;

  const schoolId = (body?.schoolId ?? "").trim();
  if (!schoolId) {
    return jsonError(`${ENDPOINT_PUT}: schoolId مطلوب.`, 400);
  }
  if (!body?.features || typeof body.features !== "object") {
    return jsonError(`${ENDPOINT_PUT}: features مطلوبة.`, 400);
  }

  const rows = Object.entries(body.features)
    .filter(([key]) => isFeatureKey(key))
    .map(([key, value]) => ({
      school_id: schoolId,
      feature_key: key,
      is_enabled: Boolean(value),
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    return jsonError(`${ENDPOINT_PUT}: لا توجد ميزات صالحة للتحديث.`, 400);
  }

  const supabase = createServiceSupabaseClient();
  const { error } = await supabase
    .from("school_app_features")
    .upsert(rows, { onConflict: "school_id,feature_key" });

  if (error) {
    return jsonError(`تعذر حفظ إعدادات الميزات: ${error.message}`, 500);
  }

  // Clear cached feature flags so the mobile app picks up the change at once.
  invalidateSchoolCacheDomains(schoolId, ["mobile-features"]);

  // Return the resolved full set after the write.
  const { data } = await supabase
    .from("school_app_features")
    .select("feature_key, is_enabled")
    .eq("school_id", schoolId);

  const features = defaultsRecord();
  for (const row of (data ?? []) as Array<{ feature_key: string; is_enabled: boolean }>) {
    if (isFeatureKey(row.feature_key)) {
      features[row.feature_key] = Boolean(row.is_enabled);
    }
  }

  return NextResponse.json({ ok: true, schoolId, features });
}
