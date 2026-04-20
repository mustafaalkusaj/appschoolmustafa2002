import { NextRequest, NextResponse } from "next/server";

import { expenseTypeMutationSchema, schoolScopedDeleteSchema } from "@/lib/api-schemas";
import { invalidateExpenseRelatedCaches } from "@/lib/expenses-server";
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
    .from("expense_types")
    .select("id, name")
    .eq("school_id", schoolId)
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
  const parsed = expenseTypeMutationSchema.safeParse(body);

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.school_id,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إدارة المصروفات متاحة للإدارة فقط.",
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
  const canAddExpenses = await routeUserHasPermission(actorSupabase, actorUserId, "add_expenses");
  if (!canAddExpenses) {
    return jsonError("ليس لديك صلاحية تعديل أنواع المصروفات.", 403);
  }
  const rateLimited = await enforceRateLimit(req, {
    namespace: "expense-types-update",
    windowMs: 60_000,
    maxHits: 30,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  try {
    const { data: existingType, error: existingTypeError } = await actorSupabase
      .from("expense_types")
      .select("id")
      .eq("id", typeId)
      .eq("school_id", targetSchoolId)
      .maybeSingle();

    if (existingTypeError || !existingType?.id) {
      return jsonError("نوع المصروف المطلوب غير موجود ضمن المدرسة الحالية.", 404);
    }

    if (await hasDuplicateTypeName(actorSupabase, targetSchoolId, parsed.data.name, typeId)) {
      return jsonError("يوجد نوع مصروف آخر بنفس الاسم ضمن المدرسة الحالية.", 409);
    }

    const { data: updatedType, error } = await actorSupabase
      .from("expense_types")
      .update({
        name: parsed.data.name,
        notes: parsed.data.notes,
      })
      .eq("id", typeId)
      .eq("school_id", targetSchoolId)
      .select("id, school_id, name, notes")
      .single();

    if (error || !updatedType) {
      throw error ?? new Error("Expense type update failed");
    }

    invalidateExpenseRelatedCaches(targetSchoolId);

    return NextResponse.json({
      ok: true,
      expenseType: updatedType,
    });
  } catch (error) {
    logRouteError("expense-types-update", error, {
      actorUserId,
      schoolId: targetSchoolId,
      typeId,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر تحديث نوع المصروف حالياً. حاول مرة أخرى بعد قليل.", 500);
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
      roleDeniedMessage: "إدارة المصروفات متاحة للإدارة فقط.",
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
  const canDeleteExpenses = await routeUserHasPermission(actorSupabase, actorUserId, "delete_expenses");
  if (!canDeleteExpenses) {
    return jsonError("ليس لديك صلاحية حذف أنواع المصروفات.", 403);
  }
  const rateLimited = await enforceRateLimit(req, {
    namespace: "expense-types-delete",
    windowMs: 60_000,
    maxHits: 20,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  try {
    const [{ data: existingType, error: existingTypeError }, { count, error: usageError }] = await Promise.all([
      actorSupabase
        .from("expense_types")
        .select("id")
        .eq("id", typeId)
        .eq("school_id", targetSchoolId)
        .maybeSingle(),
      actorSupabase
        .from("expenses")
        .select("id", { count: "exact", head: true })
        .eq("school_id", targetSchoolId)
        .eq("expense_type_id", typeId),
    ]);

    if (existingTypeError || !existingType?.id) {
      return jsonError("نوع المصروف المطلوب غير موجود ضمن المدرسة الحالية.", 404);
    }

    if (usageError) {
      throw usageError;
    }

    if ((count ?? 0) > 0) {
      return jsonError("لا يمكن حذف نوع مصروف مستخدم في سجلات قائمة.", 409);
    }

    const { error } = await actorSupabase
      .from("expense_types")
      .delete()
      .eq("id", typeId)
      .eq("school_id", targetSchoolId);

    if (error) {
      throw error;
    }

    invalidateExpenseRelatedCaches(targetSchoolId);

    return NextResponse.json({
      ok: true,
      deletedTypeId: typeId,
    });
  } catch (error) {
    logRouteError("expense-types-delete", error, {
      actorUserId,
      schoolId: targetSchoolId,
      typeId,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر حذف نوع المصروف حالياً. حاول مرة أخرى بعد قليل.", 500);
  }
}
