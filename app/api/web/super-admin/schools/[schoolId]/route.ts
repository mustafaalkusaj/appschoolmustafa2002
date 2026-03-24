import { NextRequest, NextResponse } from "next/server";

import { detectAdminInfrastructure } from "@/lib/admin-infrastructure";
import { detectAppSchemaCompatWithClient } from "@/lib/schema-compat";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

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

const SCHOOL_SELECT =
  "id, name, address, phone, owner_email, city, logo_url, primary_color, secondary_color, plan, is_active, created_at";

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
  const { actorSupabase } = context.value;

  if (mode === "toggle") {
    if (typeof body?.is_active !== "boolean") {
      return jsonError("حالة المدرسة الجديدة مطلوبة.", 400);
    }

    const { data: school, error: schoolError } = await actorSupabase
      .from("schools")
      .update({ is_active: body.is_active })
      .eq("id", normalizedSchoolId)
      .select(SCHOOL_SELECT)
      .maybeSingle();

    if (schoolError) {
      return jsonError(schoolError.message || "تعذر تحديث حالة المدرسة.", 500);
    }

    if (!school) {
      return jsonError("المدرسة المطلوبة غير موجودة.", 404);
    }

    const { data: latestSubscription, error: subscriptionLookupError } = await actorSupabase
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
      const { error: subscriptionError } = await actorSupabase
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

  const schemaCompat = await detectAppSchemaCompatWithClient(actorSupabase);
  const payload = {
    name,
    address: typeof body?.address === "string" && body.address.trim() ? body.address.trim() : null,
    phone: typeof body?.phone === "string" && body.phone.trim() ? body.phone.trim() : null,
    owner_email: typeof body?.owner_email === "string" && body.owner_email.trim() ? body.owner_email.trim() : null,
    city: typeof body?.city === "string" && body.city.trim() ? body.city.trim() : null,
    logo_url: typeof body?.logo_url === "string" && body.logo_url.trim() ? body.logo_url.trim() : null,
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

  const { data: school, error: schoolError } = await actorSupabase
    .from("schools")
    .update(payload)
    .eq("id", normalizedSchoolId)
    .select(SCHOOL_SELECT)
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
  const { schoolId } = await params;
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const normalizedSchoolId = schoolId.trim();
  if (!normalizedSchoolId) {
    return jsonError("معرف المدرسة غير صالح.", 400);
  }

  const infrastructure = await detectAdminInfrastructure(context.value.actorSupabase);
  if (!infrastructure.softDeleteSchools) {
    return jsonError(
      "أرشفة المدارس تتطلب تشغيل admin_infrastructure.sql لإضافة deleted_at و deleted_by إلى جدول schools.",
      400,
    );
  }

  const { data: school, error } = await context.value.actorSupabase
    .from("schools")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: context.value.actorUserId,
    })
    .eq("id", normalizedSchoolId)
    .select("id, name")
    .maybeSingle();

  if (error) {
    return jsonError(error.message || "تعذر أرشفة المدرسة.", 500);
  }

  if (!school) {
    return jsonError("المدرسة المطلوبة غير موجودة.", 404);
  }

  return NextResponse.json({
    ok: true,
    school,
  });
}
