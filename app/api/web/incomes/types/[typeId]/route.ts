import { NextRequest, NextResponse } from "next/server";

import { incomeTypeMutationSchema, schoolScopedDeleteSchema } from "@/lib/api-schemas";
import { invalidateIncomeRelatedCaches } from "@/lib/incomes-server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { jsonError, jsonValidationError, logRouteError } from "@/lib/route-utils";

type RouteSupabaseClient = Awaited<ReturnType<typeof createRouteSupabaseClient>>;

async function hasDuplicateTypeName(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  name: string,
  excludeId: string,
) {
  const { data, error } = await actorSupabase
    .from("income_types")
    .select("id, name")
    .eq("school_id", schoolId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  const normalizedName = name.trim().toLocaleLowerCase();
  return ((data ?? []) as Array<{ id?: string | null; name?: string | null }>).some((row) => {
    if (!row.id || row.id === excludeId) {
      return false;
    }

    return String(row.name ?? "").trim().toLocaleLowerCase() === normalizedName;
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ typeId: string }> },
) {
  const { typeId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = incomeTypeMutationSchema.safeParse(body);

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.school_id,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إدارة الإيرادات متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = await enforceRateLimit(req, {
    namespace: "income-types-update",
    windowMs: 60_000,
    maxHits: 30,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }
  const canAddIncomes = await routeUserHasPermission(actorSupabase, actorUserId, "add_incomes");
  if (!canAddIncomes) {
    return jsonError("ليس لديك صلاحية تعديل أنواع الإيرادات.", 403);
  }

  try {
    const { data: existingType, error: existingTypeError } = await actorSupabase
      .from("income_types")
      .select("id")
      .eq("id", typeId)
      .eq("school_id", targetSchoolId)
      .maybeSingle();

    if (existingTypeError || !existingType?.id) {
      return jsonError("نوع الإيراد المطلوب غير موجود ضمن المدرسة الحالية.", 404);
    }

    if (await hasDuplicateTypeName(actorSupabase, targetSchoolId, parsed.data.name, typeId)) {
      return jsonError("يوجد نوع إيراد آخر بنفس الاسم ضمن المدرسة الحالية.", 409);
    }

    const { data: updatedType, error } = await actorSupabase
      .from("income_types")
      .update({
        name: parsed.data.name,
        notes: parsed.data.notes,
      })
      .eq("id", typeId)
      .eq("school_id", targetSchoolId)
      .select("id, school_id, name, notes")
      .single();

    if (error || !updatedType) {
      throw error ?? new Error("Income type update failed");
    }

    invalidateIncomeRelatedCaches(targetSchoolId);

    return NextResponse.json({
      ok: true,
      incomeType: updatedType,
    });
  } catch (error) {
    logRouteError("income-types-update", error, {
      actorUserId,
      schoolId: targetSchoolId,
      typeId,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر تحديث نوع الإيراد حالياً. حاول مرة أخرى بعد قليل.", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ typeId: string }> },
) {
  const { typeId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schoolScopedDeleteSchema.safeParse(body);

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.school_id,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إدارة الإيرادات متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = await enforceRateLimit(req, {
    namespace: "income-types-delete",
    windowMs: 60_000,
    maxHits: 20,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }
  const canDeleteIncomes = await routeUserHasPermission(actorSupabase, actorUserId, "delete_incomes");
  if (!canDeleteIncomes) {
    return jsonError("ليس لديك صلاحية حذف أنواع الإيرادات.", 403);
  }

  try {
    const [{ data: existingType, error: existingTypeError }, { count, error: usageError }] = await Promise.all([
      actorSupabase
        .from("income_types")
        .select("id")
        .eq("id", typeId)
        .eq("school_id", targetSchoolId)
        .maybeSingle(),
      actorSupabase
        .from("incomes")
        .select("id", { count: "exact", head: true })
        .eq("school_id", targetSchoolId)
        .eq("income_type_id", typeId),
    ]);

    if (existingTypeError || !existingType?.id) {
      return jsonError("نوع الإيراد المطلوب غير موجود ضمن المدرسة الحالية.", 404);
    }

    if (usageError) {
      throw usageError;
    }

    if ((count ?? 0) > 0) {
      return jsonError("لا يمكن حذف نوع إيراد مستخدم في سجلات قائمة.", 409);
    }

    const { error } = await actorSupabase
      .from("income_types")
      .delete()
      .eq("id", typeId)
      .eq("school_id", targetSchoolId);

    if (error) {
      throw error;
    }

    invalidateIncomeRelatedCaches(targetSchoolId);

    return NextResponse.json({
      ok: true,
      deletedTypeId: typeId,
    });
  } catch (error) {
    logRouteError("income-types-delete", error, {
      actorUserId,
      schoolId: targetSchoolId,
      typeId,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر حذف نوع الإيراد حالياً. حاول مرة أخرى بعد قليل.", 500);
  }
}
