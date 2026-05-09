import { NextRequest, NextResponse } from "next/server";

import {
  expenseTypeMutationSchema,
  expenseTypesListQuerySchema,
} from "@/lib/api-schemas";
import { resolveBranchScope } from "@/lib/branch-scope";
import {
  invalidateExpenseRelatedCaches,
  resolveExpenseTypesOverview,
} from "@/lib/expenses-server";
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
  excludeId?: string,
) {
  const { data, error } = await actorSupabase
    .from("expense_types")
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

export async function GET(req: NextRequest) {
  const parsed = expenseTypesListQuerySchema.safeParse({
    schoolId: req.nextUrl.searchParams.get("schoolId"),
    search: req.nextUrl.searchParams.get("search") ?? "",
  });

  if (!parsed.success) {
    return jsonValidationError(parsed.error, "معايير تحميل أنواع المصروفات غير صالحة.");
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.schoolId,
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

  const requestedBranchId = req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = await enforceRateLimit(req, {
    namespace: "expense-types-list",
    windowMs: 60_000,
    maxHits: 120,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }
  const canViewExpenses = await routeUserHasPermission(actorSupabase, actorUserId, "view_expenses");
  if (!canViewExpenses) {
    return jsonError("ليس لديك صلاحية عرض أنواع المصروفات.", 403);
  }

  try {
    const rows = await resolveExpenseTypesOverview(actorSupabase, targetSchoolId, branchScope.value, parsed.data.search);
    return NextResponse.json(
      {
        ok: true,
        rows,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    logRouteError("expense-types-list", error, {
      actorUserId,
      schoolId: targetSchoolId,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر تحميل أنواع المصروفات حالياً. حاول مرة أخرى بعد قليل.", 500);
  }
}

export async function POST(req: NextRequest) {
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
  const rateLimited = await enforceRateLimit(req, {
    namespace: "expense-types-create",
    windowMs: 60_000,
    maxHits: 30,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }
  const canAddExpenses = await routeUserHasPermission(actorSupabase, actorUserId, "add_expenses");
  if (!canAddExpenses) {
    return jsonError("ليس لديك صلاحية إضافة أنواع المصروفات.", 403);
  }

  try {
    if (await hasDuplicateTypeName(actorSupabase, targetSchoolId, parsed.data.name)) {
      return jsonError("يوجد نوع مصروف آخر بنفس الاسم ضمن المدرسة الحالية.", 409);
    }

    const { data: createdType, error } = await actorSupabase
      .from("expense_types")
      .insert({
        school_id: targetSchoolId,
        name: parsed.data.name,
        notes: parsed.data.notes,
      })
      .select("id, school_id, name, notes")
      .single();

    if (error || !createdType) {
      throw error ?? new Error("Expense type insert failed");
    }

    invalidateExpenseRelatedCaches(targetSchoolId);

    return NextResponse.json({
      ok: true,
      expenseType: {
        ...createdType,
        usage_count: 0,
        usage_total: 0,
      },
    });
  } catch (error) {
    logRouteError("expense-types-create", error, {
      actorUserId,
      schoolId: targetSchoolId,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر حفظ نوع المصروف حالياً. حاول مرة أخرى بعد قليل.", 500);
  }
}
