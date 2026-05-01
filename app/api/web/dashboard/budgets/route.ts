import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { fetchBudgetSummaries } from "@/lib/school-manager/budget-summary";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

/**
 * GET /api/web/dashboard/budgets
 * Fetch budget summaries (planned vs actual) for current and next fiscal year
 */
export async function GET(req: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    null,
    {
      allowedRoles: ["admin"],
      roleDeniedMessage: "لا يمكن الوصول إلى الموازنات من هذا الحساب.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من الصلاحيات.",
      "status" in context ? context.status : 500,
    );
  }

  // Allow group_admin scope to access budgets
  if (context.value.scopeLevel !== "group_admin") {
    return jsonError("لا يمكن الوصول إلى الموازنات من هذا الحساب.", 403);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "budgets-list",
    windowMs: 60_000,
    maxHits: 60,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  try {
    const { current, next } = await fetchBudgetSummaries(actorSupabase, targetSchoolId);

    return NextResponse.json(
      {
        ok: true,
        current,
        next,
        currentYear: current.fiscalYear,
        nextYear: next.fiscalYear,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("[Budgets] Unexpected error:", error);
    return jsonError("حدث خطأ غير متوقع.", 500);
  }
}

/**
 * POST /api/web/dashboard/budgets
 * Create a new budget
 */
export async function POST(req: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    null,
    {
      allowedRoles: ["admin"],
      roleDeniedMessage: "لا يمكنك إنشاء موازنات من هذا الحساب.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من الصلاحيات.",
      "status" in context ? context.status : 500,
    );
  }

  // Allow group_admin scope to create budgets
  if (context.value.scopeLevel !== "group_admin") {
    return jsonError("لا يمكنك إنشاء موازنات من هذا الحساب.", 403);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return jsonError("البيانات المرسلة غير صحيحة.", 400);
  }

  const { fiscal_year, notes, items } = body as {
    fiscal_year?: unknown;
    notes?: string;
    items?: Array<{
      category: string;
      item_type: string;
      description: string;
      planned_amount: number;
      branch_id?: string;
    }>;
  };

  if (typeof fiscal_year !== "number" || fiscal_year < 2020 || fiscal_year > 2100) {
    return jsonError("السنة المالية غير صحيحة.", 400);
  }

  try {
    // Check if budget exists for this year
    const { data: existing } = await actorSupabase
      .from("budgets")
      .select("id")
      .eq("school_id", targetSchoolId)
      .eq("fiscal_year", fiscal_year)
      .maybeSingle();

    if (existing) {
      return jsonError("توجد موازنة موجودة لهذه السنة بالفعل.", 409);
    }

    // Create budget
    const { data: budget, error: budgetError } = await actorSupabase
      .from("budgets")
      .insert({
        school_id: targetSchoolId,
        fiscal_year,
        status: "draft",
        notes: notes?.trim() || null,
        created_by: actorUserId,
      })
      .select("id, school_id, fiscal_year, status, created_at")
      .single();

    if (budgetError || !budget) {
      console.error("[Budgets] Insert error:", budgetError);
      return jsonError("تعذر إنشاء الموازنة.", 500);
    }

    // Insert budget items if provided
    if (Array.isArray(items) && items.length > 0) {
      const itemsPayload = items.map((item) => ({
        budget_id: budget.id,
        school_id: targetSchoolId,
        category: String(item.category).trim(),
        item_type: String(item.item_type).trim(),
        description: item.description ? String(item.description).trim() : null,
        planned_amount: Math.max(0, Number(item.planned_amount) || 0),
        branch_id: item.branch_id ? String(item.branch_id).trim() : null,
      }));

      const { error: itemsError } = await actorSupabase
        .from("budget_items")
        .insert(itemsPayload);

      if (itemsError) {
        console.error("[Budgets] Items insert error:", itemsError);
        // Don't fail the whole operation, just log
      }
    }

    return NextResponse.json({
      ok: true,
      budget,
    });
  } catch (error) {
    console.error("[Budgets] Create error:", error);
    return jsonError("حدث خطأ غير متوقع.", 500);
  }
}
