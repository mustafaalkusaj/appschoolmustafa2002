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
    logger.warn("Rate limit exceeded for GET /apps/[appId]", { ip: rateLimitResult.clientId, requestId });
    return jsonError(rateLimitResult.message || "تم تجاوز حد الطلبات المسموح", rateLimitResult.status || 429);
  }

  logger.logApiRequest(`/api/web/super-admin/apps/${appId}`, "GET", undefined, rateLimitResult.clientId);

  try {
    const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
    if (!context.ok) {
      logger.warn("Authentication failed for GET /apps/[appId]", { requestId });
      return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
    }

    const { dataSupabase } = context.value;

    const { data, error } = await dataSupabase
      .from("apps")
      .select("*, schools(name_ar, name_en), app_themes(*), app_features(*), app_usage_limits(*)")
      .eq("id", appId)
      .single();

    if (error) {
      logger.error("Failed to fetch app", new Error(error.message), { requestId, appId });
      return jsonError(error.message || "تعذر تحميل التطبيق.", 500);
    }

    if (!data) return jsonError("التطبيق غير موجود.", 404);

    logger.logApiResponse(`/api/web/super-admin/apps/${appId}`, 200, Date.now() - startTime, context.value.actorUserId);

    return NextResponse.json({ ok: true, app: data });
  } catch (error) {
    logger.error("Unexpected error in GET /apps/[appId]", error instanceof Error ? error : new Error(String(error)), { requestId });
    return jsonError("حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { appId: string } }) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  const { appId } = params;

  const rateLimitResult = await rateLimitMiddleware(req, RATE_LIMIT_CONFIG.SUPER_ADMIN);
  if (!rateLimitResult.ok) {
    logger.warn("Rate limit exceeded for PATCH /apps/[appId]", { ip: rateLimitResult.clientId, requestId });
    return jsonError(rateLimitResult.message || "تم تجاوز حد الطلبات المسموح", rateLimitResult.status || 429);
  }

  logger.logApiRequest(`/api/web/super-admin/apps/${appId}`, "PATCH", undefined, rateLimitResult.clientId);

  try {
    const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
    if (!context.ok) {
      logger.warn("Authentication failed for PATCH /apps/[appId]", { requestId });
      return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return jsonError("البيانات المرسلة غير صالحة.", 400);

    const allowedFields = ["name", "platform", "bundle_id", "package_name", "app_store_url", "play_store_url", "web_url", "is_active"];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 1) {
      return jsonError("لا توجد حقول قابلة للتحديث.", 400);
    }

    const { dataSupabase } = context.value;

    const { data, error } = await dataSupabase
      .from("apps")
      .update(updates)
      .eq("id", appId)
      .select("*")
      .single();

    if (error) {
      logger.error("Failed to update app", new Error(error.message), { requestId, appId });
      return jsonError(error.message || "تعذر تحديث التطبيق.", 500);
    }

    logger.logDataModification("update", "apps", appId, context.value.actorUserId, updates);
    logger.logApiResponse(`/api/web/super-admin/apps/${appId}`, 200, Date.now() - startTime, context.value.actorUserId);

    return NextResponse.json({ ok: true, app: data });
  } catch (error) {
    logger.error("Unexpected error in PATCH /apps/[appId]", error instanceof Error ? error : new Error(String(error)), { requestId });
    return jsonError("حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { appId: string } }) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  const { appId } = params;

  const rateLimitResult = await rateLimitMiddleware(req, RATE_LIMIT_CONFIG.SUPER_ADMIN);
  if (!rateLimitResult.ok) {
    logger.warn("Rate limit exceeded for DELETE /apps/[appId]", { ip: rateLimitResult.clientId, requestId });
    return jsonError(rateLimitResult.message || "تم تجاوز حد الطلبات المسموح", rateLimitResult.status || 429);
  }

  logger.logApiRequest(`/api/web/super-admin/apps/${appId}`, "DELETE", undefined, rateLimitResult.clientId);

  try {
    const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
    if (!context.ok) {
      logger.warn("Authentication failed for DELETE /apps/[appId]", { requestId });
      return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
    }

    const { dataSupabase } = context.value;

    const { error } = await dataSupabase.from("apps").delete().eq("id", appId);

    if (error) {
      logger.error("Failed to delete app", new Error(error.message), { requestId, appId });
      return jsonError(error.message || "تعذر حذف التطبيق.", 500);
    }

    logger.logDataModification("delete", "apps", appId, context.value.actorUserId);
    logger.logApiResponse(`/api/web/super-admin/apps/${appId}`, 200, Date.now() - startTime, context.value.actorUserId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Unexpected error in DELETE /apps/[appId]", error instanceof Error ? error : new Error(String(error)), { requestId });
    return jsonError("حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.", 500);
  }
}
