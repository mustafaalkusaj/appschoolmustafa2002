import { NextRequest, NextResponse } from "next/server";

import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";
import { rateLimitMiddleware, RATE_LIMIT_CONFIG } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest, { params }: { params: { appId: string } }) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  const { appId } = params;

  const rateLimitResult = await rateLimitMiddleware(req, RATE_LIMIT_CONFIG.SUPER_ADMIN);
  if (!rateLimitResult.ok) {
    logger.warn("Rate limit exceeded for GET /apps/[appId]/features", { ip: rateLimitResult.clientId, requestId });
    return jsonError(rateLimitResult.message || "تم تجاوز حد الطلبات المسموح", rateLimitResult.status || 429);
  }

  logger.logApiRequest(`/api/web/super-admin/apps/${appId}/features`, "GET", undefined, rateLimitResult.clientId);

  try {
    const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
    if (!context.ok) {
      logger.warn("Authentication failed for GET /apps/[appId]/features", { requestId });
      return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
    }

    const { dataSupabase } = context.value;

    const { data, error } = await dataSupabase
      .from("app_features")
      .select("*")
      .eq("app_id", appId)
      .order("module_key", { ascending: true });

    if (error) {
      logger.error("Failed to fetch features", new Error(error.message), { requestId, appId });
      return jsonError(error.message || "تعذر تحميل الميزات.", 500);
    }

    logger.logApiResponse(`/api/web/super-admin/apps/${appId}/features`, 200, Date.now() - startTime, context.value.actorUserId);

    return NextResponse.json({ ok: true, features: data ?? [] });
  } catch (error) {
    logger.error("Unexpected error in GET /apps/[appId]/features", error instanceof Error ? error : new Error(String(error)), { requestId });
    return jsonError("حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { appId: string } }) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  const { appId } = params;

  const rateLimitResult = await rateLimitMiddleware(req, RATE_LIMIT_CONFIG.SUPER_ADMIN);
  if (!rateLimitResult.ok) {
    logger.warn("Rate limit exceeded for PATCH /apps/[appId]/features", { ip: rateLimitResult.clientId, requestId });
    return jsonError(rateLimitResult.message || "تم تجاوز حد الطلبات المسموح", rateLimitResult.status || 429);
  }

  logger.logApiRequest(`/api/web/super-admin/apps/${appId}/features`, "PATCH", undefined, rateLimitResult.clientId);

  try {
    const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
    if (!context.ok) {
      logger.warn("Authentication failed for PATCH /apps/[appId]/features", { requestId });
      return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
    }

    const body = (await req.json().catch(() => null)) as {
      features?: Array<{ module_key: string; is_enabled: boolean; config?: object }>;
    } | null;

    if (!body?.features || !Array.isArray(body.features) || body.features.length === 0) {
      return jsonError("قائمة الميزات مطلوبة.", 400);
    }

    const { dataSupabase } = context.value;

    const upsertPayloads = body.features.map((f) => ({
      app_id: appId,
      module_key: f.module_key,
      is_enabled: f.is_enabled,
      ...(f.config !== undefined ? { config: f.config } : {}),
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await dataSupabase
      .from("app_features")
      .upsert(upsertPayloads, { onConflict: "app_id,module_key" })
      .select("*");

    if (error) {
      logger.error("Failed to upsert features", new Error(error.message), { requestId, appId });
      return jsonError(error.message || "تعذر تحديث الميزات.", 500);
    }

    logger.logDataModification("update", "app_features", appId, context.value.actorUserId, { count: upsertPayloads.length });
    logger.logApiResponse(`/api/web/super-admin/apps/${appId}/features`, 200, Date.now() - startTime, context.value.actorUserId);

    return NextResponse.json({ ok: true, features: data ?? [] });
  } catch (error) {
    logger.error("Unexpected error in PATCH /apps/[appId]/features", error instanceof Error ? error : new Error(String(error)), { requestId });
    return jsonError("حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.", 500);
  }
}
