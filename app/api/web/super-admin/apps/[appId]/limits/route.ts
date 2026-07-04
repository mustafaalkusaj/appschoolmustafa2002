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
    logger.warn("Rate limit exceeded for GET /apps/[appId]/limits", { ip: rateLimitResult.clientId, requestId });
    return jsonError(rateLimitResult.message || "تم تجاوز حد الطلبات المسموح", rateLimitResult.status || 429);
  }

  logger.logApiRequest(`/api/web/super-admin/apps/${appId}/limits`, "GET", undefined, rateLimitResult.clientId);

  try {
    const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
    if (!context.ok) {
      logger.warn("Authentication failed for GET /apps/[appId]/limits", { requestId });
      return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
    }

    const { dataSupabase } = context.value;

    const { data, error } = await dataSupabase
      .from("app_usage_limits")
      .select("*")
      .eq("app_id", appId)
      .single();

    if (error) {
      logger.error("Failed to fetch limits", new Error(error.message), { requestId, appId });
      return jsonError(error.message || "تعذر تحميل حدود الاستخدام.", 500);
    }

    logger.logApiResponse(`/api/web/super-admin/apps/${appId}/limits`, 200, Date.now() - startTime, context.value.actorUserId);

    return NextResponse.json({ ok: true, limits: data });
  } catch (error) {
    logger.error("Unexpected error in GET /apps/[appId]/limits", error instanceof Error ? error : new Error(String(error)), { requestId });
    return jsonError("حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { appId: string } }) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  const { appId } = params;

  const rateLimitResult = await rateLimitMiddleware(req, RATE_LIMIT_CONFIG.SUPER_ADMIN);
  if (!rateLimitResult.ok) {
    logger.warn("Rate limit exceeded for PATCH /apps/[appId]/limits", { ip: rateLimitResult.clientId, requestId });
    return jsonError(rateLimitResult.message || "تم تجاوز حد الطلبات المسموح", rateLimitResult.status || 429);
  }

  logger.logApiRequest(`/api/web/super-admin/apps/${appId}/limits`, "PATCH", undefined, rateLimitResult.clientId);

  try {
    const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
    if (!context.ok) {
      logger.warn("Authentication failed for PATCH /apps/[appId]/limits", { requestId });
      return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return jsonError("البيانات المرسلة غير صالحة.", 400);

    const maxFields = ["max_students", "max_branches", "max_storage_mb", "max_users", "max_classes"];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    for (const field of maxFields) {
      if (field in body && typeof body[field] === "number") {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 1) {
      return jsonError("لا توجد حقول قابلة للتحديث.", 400);
    }

    const { dataSupabase } = context.value;

    const { data, error } = await dataSupabase
      .from("app_usage_limits")
      .update(updates)
      .eq("app_id", appId)
      .select("*")
      .single();

    if (error) {
      logger.error("Failed to update limits", new Error(error.message), { requestId, appId });
      return jsonError(error.message || "تعذر تحديث حدود الاستخدام.", 500);
    }

    logger.logDataModification("update", "app_usage_limits", appId, context.value.actorUserId, updates);
    logger.logApiResponse(`/api/web/super-admin/apps/${appId}/limits`, 200, Date.now() - startTime, context.value.actorUserId);

    return NextResponse.json({ ok: true, limits: data });
  } catch (error) {
    logger.error("Unexpected error in PATCH /apps/[appId]/limits", error instanceof Error ? error : new Error(String(error)), { requestId });
    return jsonError("حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.", 500);
  }
}
