import { NextRequest, NextResponse } from "next/server";

import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";
import { rateLimitMiddleware, RATE_LIMIT_CONFIG } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

const DEFAULT_MODULES = [
  "attendance",
  "accounting",
  "salaries",
  "grades",
  "reports",
  "messaging",
  "transport",
  "library",
  "exams",
  "timetable",
];

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  const rateLimitResult = await rateLimitMiddleware(req, RATE_LIMIT_CONFIG.SUPER_ADMIN);
  if (!rateLimitResult.ok) {
    logger.warn("Rate limit exceeded for GET /apps", { ip: rateLimitResult.clientId, requestId });
    return jsonError(rateLimitResult.message || "تم تجاوز حد الطلبات المسموح", rateLimitResult.status || 429);
  }

  logger.logApiRequest("/api/web/super-admin/apps", "GET", undefined, rateLimitResult.clientId);

  try {
    const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
    if (!context.ok) {
      logger.warn("Authentication failed for GET /apps", { requestId });
      return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
    }

    const { dataSupabase } = context.value;

    const { data, error } = await dataSupabase
      .from("apps")
      .select("*, schools(name_ar, name_en), app_themes(*), app_features(*), app_usage_limits(*)")
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Failed to fetch apps", new Error(error.message), { requestId });
      return jsonError(error.message || "تعذر تحميل التطبيقات.", 500);
    }

    logger.logApiResponse("/api/web/super-admin/apps", 200, Date.now() - startTime, context.value.actorUserId);

    return NextResponse.json({ ok: true, apps: data ?? [] });
  } catch (error) {
    logger.error("Unexpected error in GET /apps", error instanceof Error ? error : new Error(String(error)), { requestId });
    return jsonError("حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.", 500);
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  const rateLimitResult = await rateLimitMiddleware(req, RATE_LIMIT_CONFIG.SUPER_ADMIN);
  if (!rateLimitResult.ok) {
    logger.warn("Rate limit exceeded for POST /apps", { ip: rateLimitResult.clientId, requestId });
    return jsonError(rateLimitResult.message || "تم تجاوز حد الطلبات المسموح", rateLimitResult.status || 429);
  }

  logger.logApiRequest("/api/web/super-admin/apps", "POST", undefined, rateLimitResult.clientId);

  try {
    const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
    if (!context.ok) {
      logger.warn("Authentication failed for POST /apps", { requestId });
      return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
    }

    const body = (await req.json().catch(() => null)) as {
      school_id?: unknown;
      name?: unknown;
      platform?: unknown;
    } | null;

    const school_id = typeof body?.school_id === "string" ? body.school_id.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const platform = typeof body?.platform === "string" ? body.platform.trim() : "web";

    if (!school_id) return jsonError("معرّف المدرسة مطلوب.", 400);
    if (!name) return jsonError("اسم التطبيق مطلوب.", 400);

    const { dataSupabase } = context.value;

    const { data: app, error: appError } = await dataSupabase
      .from("apps")
      .insert({ school_id, name, platform, is_active: true })
      .select("*")
      .single();

    if (appError || !app) {
      logger.error("Failed to create app", new Error(appError?.message ?? "unknown"), { requestId });
      return jsonError(appError?.message || "تعذر إنشاء التطبيق.", 500);
    }

    const appId = (app as { id: string }).id;

    const [themeResult, featuresResult, limitsResult] = await Promise.all([
      dataSupabase.from("app_themes").insert({ app_id: appId, name: "Default", type: "light" }).select("*").single(),
      dataSupabase
        .from("app_features")
        .insert(DEFAULT_MODULES.map((module_key) => ({ app_id: appId, module_key, is_enabled: true })))
        .select("*"),
      dataSupabase
        .from("app_usage_limits")
        .insert({
          app_id: appId,
          max_students: 1000,
          max_branches: 5,
          max_storage_mb: 10240,
          max_users: 100,
          max_classes: 50,
          current_students: 0,
          current_branches: 0,
          current_storage_mb: 0,
          current_users: 0,
          current_classes: 0,
        })
        .select("*")
        .single(),
    ]);

    if (themeResult.error) {
      logger.warn("Failed to create default theme", { requestId, appId, error: themeResult.error.message });
    }
    if (featuresResult.error) {
      logger.warn("Failed to create default features", { requestId, appId, error: featuresResult.error.message });
    }
    if (limitsResult.error) {
      logger.warn("Failed to create default limits", { requestId, appId, error: limitsResult.error.message });
    }

    logger.logDataModification("create", "apps", appId, context.value.actorUserId, { school_id, name, platform });
    logger.logApiResponse("/api/web/super-admin/apps", 201, Date.now() - startTime, context.value.actorUserId);

    return NextResponse.json(
      {
        ok: true,
        app,
        theme: themeResult.data ?? null,
        features: featuresResult.data ?? [],
        limits: limitsResult.data ?? null,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Unexpected error in POST /apps", error instanceof Error ? error : new Error(String(error)), { requestId });
    return jsonError("حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.", 500);
  }
}
