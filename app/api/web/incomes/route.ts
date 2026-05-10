import { NextRequest, NextResponse } from "next/server";

import {
  incomeMutationSchema,
  incomesListQuerySchema,
} from "@/lib/api-schemas";
import { resolveBranchIdForWrite, resolveBranchScope } from "@/lib/branch-scope";
import {
  invalidateIncomeRelatedCaches,
  resolveIncomesPage,
} from "@/lib/incomes-server";
import {
  resolveSchoolScopedActorContext,
} from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getCacheHeaders, CACHE_STRATEGIES } from "@/lib/cache-strategies";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { jsonError, jsonValidationError, logRouteError } from "@/lib/route-utils";

export async function GET(req: NextRequest) {
  const parsed = incomesListQuerySchema.safeParse({
    schoolId: req.nextUrl.searchParams.get("schoolId"),
    page: req.nextUrl.searchParams.get("page") ?? "1",
    pageSize: req.nextUrl.searchParams.get("pageSize") ?? "20",
    search: req.nextUrl.searchParams.get("search") ?? "",
    incomeTypeId: req.nextUrl.searchParams.get("incomeTypeId"),
    fromDate: req.nextUrl.searchParams.get("fromDate"),
    toDate: req.nextUrl.searchParams.get("toDate"),
  });

  if (!parsed.success) {
    return jsonValidationError(parsed.error, "معايير تحميل الإيرادات غير صالحة.");
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.schoolId,
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

  const requestedBranchId = req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const [rateLimited, canViewIncomes] = await Promise.all([
    enforceRateLimit(req, {
      namespace: "incomes-list",
      windowMs: 60_000,
      maxHits: 120,
      identifier: actorUserId,
    }),
    routeUserHasPermission(actorSupabase, actorUserId, "view_incomes"),
  ]);
  if (rateLimited) {
    return rateLimited;
  }
  if (!canViewIncomes) {
    return jsonError("ليس لديك صلاحية عرض الإيرادات.", 403);
  }

  try {
    const payload = await resolveIncomesPage(actorSupabase, targetSchoolId, branchScope.value, {
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      search: parsed.data.search,
      incomeTypeId: parsed.data.incomeTypeId ?? null,
      fromDate: parsed.data.fromDate ?? null,
      toDate: parsed.data.toDate ?? null,
    });

    return NextResponse.json(
      {
        ok: true,
        ...payload,
      },
      {
        headers: getCacheHeaders(CACHE_STRATEGIES.INCOMES_LIST),
      },
    );
  } catch (error) {
    logRouteError("incomes-list", error, {
      actorUserId,
      schoolId: targetSchoolId,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر تحميل الإيرادات حالياً. حاول مرة أخرى بعد قليل.", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = incomeMutationSchema.safeParse(body);

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

  const branchScope = resolveBranchScope(context.value, parsed.data.branch_id ?? null);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = await enforceRateLimit(req, {
    namespace: "incomes-create",
    windowMs: 60_000,
    maxHits: 40,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }
  const canAddIncomes = await routeUserHasPermission(actorSupabase, actorUserId, "add_incomes");
  if (!canAddIncomes) {
    return jsonError("ليس لديك صلاحية إضافة الإيرادات.", 403);
  }

  const { data: incomeType, error: incomeTypeError } = await actorSupabase
    .from("income_types")
    .select("id, name")
    .eq("id", parsed.data.income_type_id)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (incomeTypeError || !incomeType?.id) {
    return jsonError("نوع الإيراد المحدد غير موجود ضمن المدرسة الحالية.", 404);
  }

  try {
    const writeBranch = resolveBranchIdForWrite(branchScope.value, parsed.data.branch_id ?? null);
    if (!writeBranch.ok) {
      return jsonError(writeBranch.message, writeBranch.status);
    }

    const branchId = writeBranch.value ?? branchScope.value.branchId;
    const { data: createdIncome, error } = await actorSupabase
      .from("incomes")
      .insert({
        school_id: targetSchoolId,
        branch_id: branchId,
        income_type_id: parsed.data.income_type_id,
        amount: parsed.data.amount,
        income_date: parsed.data.income_date,
        source: parsed.data.source,
        receipt_number: parsed.data.receipt_number,
        notes: parsed.data.notes,
      })
      .select("id, school_id, income_type_id, amount, income_date, source, receipt_number, notes, created_at, income_types(name)")
      .single();

    if (error || !createdIncome) {
      throw error ?? new Error("Income insert failed");
    }

    invalidateIncomeRelatedCaches(targetSchoolId);

    return NextResponse.json({
      ok: true,
      income: createdIncome,
    });
  } catch (error) {
    logRouteError("incomes-create", error, {
      actorUserId,
      schoolId: targetSchoolId,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر حفظ الإيراد حالياً. حاول مرة أخرى بعد قليل.", 500);
  }
}
