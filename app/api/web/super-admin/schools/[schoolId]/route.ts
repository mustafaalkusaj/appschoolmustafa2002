import { NextRequest, NextResponse } from "next/server";

import { sanitizeImageUrl } from "@/lib/brand/asset-url";
import { detectAdminInfrastructure } from "@/lib/admin-infrastructure";
import { detectAppSchemaCompatWithClient } from "@/lib/schema-compat";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";
import { rateLimitMiddleware, RATE_LIMIT_CONFIG } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

type UpdateSchoolBody = {
  mode?: unknown;
  name?: unknown;
  address?: unknown;
  phone?: unknown;
  owner_email?: unknown;
  city?: unknown;
  logo_url?: unknown;
  primary_color?: unknown;
  secondary_color?: unknown;
  plan?: unknown;
  is_active?: unknown;
};

function buildSchoolSelect(schemaCompat: Awaited<ReturnType<typeof detectAppSchemaCompatWithClient>>) {
  return schemaCompat.schoolColors
    ? "id, name, address, phone, owner_email, city, logo_url, primary_color, secondary_color, plan, is_active, created_at"
    : "id, name, address, phone, owner_email, city, logo_url, plan, is_active, created_at";
}

function normalizeLogoUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  return sanitizeImageUrl(value) ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  const { schoolId } = await params;
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const normalizedSchoolId = schoolId.trim();
  if (!normalizedSchoolId) {
    return jsonError("معرف المدرسة غير صالح.", 400);
  }

  const body = (await req.json().catch(() => null)) as UpdateSchoolBody | null;
  const mode = body?.mode === "toggle" ? "toggle" : "update";
  const { dataSupabase } = context.value;
  const schemaCompat = await detectAppSchemaCompatWithClient(dataSupabase);
  const schoolSelect = buildSchoolSelect(schemaCompat);

  if (mode === "toggle") {
    if (typeof body?.is_active !== "boolean") {
      return jsonError("حالة المدرسة الجديدة مطلوبة.", 400);
    }

    const { data: school, error: schoolError } = await dataSupabase
      .from("schools")
      .update({ is_active: body.is_active })
      .eq("id", normalizedSchoolId)
      .select(schoolSelect)
      .maybeSingle();

    if (schoolError) {
      return jsonError(schoolError.message || "تعذر تحديث حالة المدرسة.", 500);
    }

    if (!school) {
      return jsonError("المدرسة المطلوبة غير موجودة.", 404);
    }

    const { data: latestSubscription, error: subscriptionLookupError } = await dataSupabase
      .from("subscriptions")
      .select("id")
      .eq("school_id", normalizedSchoolId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionLookupError) {
      return jsonError(subscriptionLookupError.message || "تعذر مزامنة حالة الاشتراك.", 500);
    }

    if (latestSubscription?.id) {
      const { error: subscriptionError } = await dataSupabase
        .from("subscriptions")
        .update({ status: body.is_active ? "active" : "suspended" })
        .eq("id", latestSubscription.id)
        .eq("school_id", normalizedSchoolId);

      if (subscriptionError) {
        return jsonError(subscriptionError.message || "تعذر مزامنة حالة الاشتراك.", 500);
      }
    }

    return NextResponse.json({ ok: true, school });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return jsonError("اسم المدرسة مطلوب.", 400);
  }

  const payload = {
    name,
    address: typeof body?.address === "string" && body.address.trim() ? body.address.trim() : null,
    phone: typeof body?.phone === "string" && body.phone.trim() ? body.phone.trim() : null,
    owner_email: typeof body?.owner_email === "string" && body.owner_email.trim() ? body.owner_email.trim() : null,
    city: typeof body?.city === "string" && body.city.trim() ? body.city.trim() : null,
    logo_url: normalizeLogoUrl(body?.logo_url),
    ...(schemaCompat.schoolColors
      ? {
          primary_color:
            typeof body?.primary_color === "string" && body.primary_color.trim() ? body.primary_color.trim() : null,
          secondary_color:
            typeof body?.secondary_color === "string" && body.secondary_color.trim() ? body.secondary_color.trim() : null,
        }
      : {}),
    plan: body?.plan === "premium" || body?.plan === "enterprise" ? body.plan : "basic",
  };

  const { data: school, error: schoolError } = await dataSupabase
    .from("schools")
    .update(payload)
    .eq("id", normalizedSchoolId)
    .select(schoolSelect)
    .maybeSingle();

  if (schoolError) {
    return jsonError(schoolError.message || "تعذر تحديث بيانات المدرسة.", 500);
  }

  if (!school) {
    return jsonError("المدرسة المطلوبة غير موجودة.", 404);
  }

  return NextResponse.json({
    ok: true,
    school,
    schemaCompat,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  // Rate limiting check
  const rateLimitResult = await rateLimitMiddleware(req, RATE_LIMIT_CONFIG.SUPER_ADMIN);
  if (!rateLimitResult.ok) {
    logger.warn("Rate limit exceeded for DELETE /schools/{schoolId}", {
      ip: rateLimitResult.clientId,
      requestId,
    });
    return jsonError(
      rateLimitResult.message || "تم تجاوز حد الطلبات المسموح",
      rateLimitResult.status || 429
    );
  }

  const { schoolId } = await params;
  logger.logApiRequest(`/api/web/super-admin/schools/${schoolId}`, "DELETE", undefined, rateLimitResult.clientId);

  try {
    const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
    if (!context.ok) {
      logger.warn("Authentication failed for DELETE /schools/{schoolId}", {
        requestId,
        schoolId,
      });
      return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
    }

    const normalizedSchoolId = schoolId.trim();
    if (!normalizedSchoolId) {
      return jsonError("معرف المدرسة غير صالح.", 400);
    }

    // Check if this is a permanent delete request
    const hardDelete = req.nextUrl.searchParams.get("hardDelete") === "true";

    if (hardDelete) {
      // Permanent delete — remove the record completely
      logger.info(`Permanent delete requested for school ${normalizedSchoolId}`, {
        requestId,
        userId: context.value.actorUserId,
      });

      const { data: school, error } = await context.value.dataSupabase
        .from("schools")
        .delete()
        .eq("id", normalizedSchoolId)
        .select("id, name")
        .maybeSingle();

      if (error) {
        logger.error("Failed to permanently delete school", new Error(error.message), {
          requestId,
          schoolId: normalizedSchoolId,
        });
        return jsonError(error.message || "تعذر حذف المدرسة.", 500);
      }

      if (!school) {
        return jsonError("المدرسة المطلوبة غير موجودة.", 404);
      }

      // Log the deletion
      logger.logDataModification("delete", "schools", normalizedSchoolId, context.value.actorUserId);

      logger.logApiResponse(`/api/web/super-admin/schools/${normalizedSchoolId}`, 200, Date.now() - startTime, context.value.actorUserId);

      return NextResponse.json({
        ok: true,
        school,
      });
    } else {
      // Soft delete — archive the school
      logger.info(`Soft delete (archive) requested for school ${normalizedSchoolId}`, {
        requestId,
        userId: context.value.actorUserId,
      });

      const infrastructure = await detectAdminInfrastructure(context.value.dataSupabase);
      if (!infrastructure.softDeleteSchools) {
        return jsonError(
          "أرشفة المدارس تتطلب تشغيل admin_infrastructure.sql لإضافة deleted_at و deleted_by إلى جدول schools.",
          400,
        );
      }

      const { data: school, error } = await context.value.dataSupabase
        .from("schools")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: context.value.actorUserId,
        })
        .eq("id", normalizedSchoolId)
        .select("id, name")
        .maybeSingle();

      if (error) {
        logger.error("Failed to archive school", new Error(error.message), {
          requestId,
          schoolId: normalizedSchoolId,
        });
        return jsonError(error.message || "تعذر أرشفة المدرسة.", 500);
      }

      if (!school) {
        return jsonError("المدرسة المطلوبة غير موجودة.", 404);
      }

      // Log the archival
      logger.logDataModification("update", "schools", normalizedSchoolId, context.value.actorUserId, {
        action: "archived",
      });

      logger.logApiResponse(`/api/web/super-admin/schools/${normalizedSchoolId}`, 200, Date.now() - startTime, context.value.actorUserId);

      return NextResponse.json({
        ok: true,
        school,
      });
    }
  } catch (error) {
    logger.error(
      "Unexpected error in DELETE /schools/{schoolId}",
      error instanceof Error ? error : new Error(String(error)),
      { requestId }
    );
    return jsonError("حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.", 500);
  }
}
