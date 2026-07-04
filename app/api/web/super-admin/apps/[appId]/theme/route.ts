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
    logger.warn("Rate limit exceeded for GET /apps/[appId]/theme", { ip: rateLimitResult.clientId, requestId });
    return jsonError(rateLimitResult.message || "تم تجاوز حد الطلبات المسموح", rateLimitResult.status || 429);
  }

  logger.logApiRequest(`/api/web/super-admin/apps/${appId}/theme`, "GET", undefined, rateLimitResult.clientId);

  try {
    const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
    if (!context.ok) {
      logger.warn("Authentication failed for GET /apps/[appId]/theme", { requestId });
      return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
    }

    const { dataSupabase } = context.value;

    const { data, error } = await dataSupabase
      .from("app_themes")
      .select("*")
      .eq("app_id", appId)
      .single();

    if (error) {
      logger.error("Failed to fetch theme", new Error(error.message), { requestId, appId });
      return jsonError(error.message || "تعذر تحميل الثيم.", 500);
    }

    logger.logApiResponse(`/api/web/super-admin/apps/${appId}/theme`, 200, Date.now() - startTime, context.value.actorUserId);

    return NextResponse.json({ ok: true, theme: data });
  } catch (error) {
    logger.error("Unexpected error in GET /apps/[appId]/theme", error instanceof Error ? error : new Error(String(error)), { requestId });
    return jsonError("حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.", 500);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { appId: string } }) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  const { appId } = params;

  const rateLimitResult = await rateLimitMiddleware(req, RATE_LIMIT_CONFIG.SUPER_ADMIN);
  if (!rateLimitResult.ok) {
    logger.warn("Rate limit exceeded for PUT /apps/[appId]/theme", { ip: rateLimitResult.clientId, requestId });
    return jsonError(rateLimitResult.message || "تم تجاوز حد الطلبات المسموح", rateLimitResult.status || 429);
  }

  logger.logApiRequest(`/api/web/super-admin/apps/${appId}/theme`, "PUT", undefined, rateLimitResult.clientId);

  try {
    const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
    if (!context.ok) {
      logger.warn("Authentication failed for PUT /apps/[appId]/theme", { requestId });
      return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return jsonError("البيانات المرسلة غير صالحة.", 400);

    const themeFields = [
      "name", "type", "preset_id", "primary_color", "secondary_color", "accent_color",
      "text_color", "sidebar_color", "topbar_color", "font_family", "logo_url",
      "dark_mode_enabled", "border_radius", "custom_css",
    ];

    const upsertPayload: Record<string, unknown> = {
      app_id: appId,
      updated_at: new Date().toISOString(),
    };

    for (const field of themeFields) {
      if (field in body) {
        upsertPayload[field] = body[field];
      }
    }

    const { dataSupabase } = context.value;

    const { data, error } = await dataSupabase
      .from("app_themes")
      .upsert(upsertPayload, { onConflict: "app_id" })
      .select("*")
      .single();

    if (error) {
      logger.error("Failed to upsert theme", new Error(error.message), { requestId, appId });
      return jsonError(error.message || "تعذر تحديث الثيم.", 500);
    }

    logger.logDataModification("update", "app_themes", appId, context.value.actorUserId);
    logger.logApiResponse(`/api/web/super-admin/apps/${appId}/theme`, 200, Date.now() - startTime, context.value.actorUserId);

    return NextResponse.json({ ok: true, theme: data });
  } catch (error) {
    logger.error("Unexpected error in PUT /apps/[appId]/theme", error instanceof Error ? error : new Error(String(error)), { requestId });
    return jsonError("حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.", 500);
  }
}
