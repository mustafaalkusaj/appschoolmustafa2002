import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { jsonError, logRouteError } from "@/lib/route-utils";

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function resolveTeacherContext(
  req: NextRequest,
  schoolId: string | null,
  permission: "view_teachers" | "manage_teachers",
  requestedBranchId?: string | null,
) {
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "إدارة الأساتذة متاحة ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return {
      ok: false as const,
      status: "status" in context ? context.status : 500,
      message: "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
    };
  }

  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return { ok: false as const, status: branchScope.status, message: branchScope.message };
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const [rateLimited, hasPermission] = await Promise.all([
    enforceRateLimit(req, {
      namespace: `teachers-${permission}`,
      windowMs: 60_000,
      maxHits: 90,
      identifier: actorUserId,
    }),
    routeUserHasPermission(actorSupabase, actorUserId, permission),
  ]);

  if (rateLimited) {
    return { ok: false as const, status: 429, message: "تم تجاوز عدد المحاولات المسموح بها.", response: rateLimited };
  }

  if (!hasPermission) {
    const msg = permission === "manage_teachers"
      ? "ليس لديك صلاحية تعديل بيانات الأساتذة."
      : "ليس لديك صلاحية عرض الأساتذة.";
    return { ok: false as const, status: 403, message: msg };
  }

  return {
    ok: true as const,
    value: {
      actorSupabase,
      actorUserId,
      targetSchoolId,
      branchScope: branchScope.value,
    },
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  const { teacherId } = await params;
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const ctx = await resolveTeacherContext(req, schoolId, "view_teachers");
  if (!ctx.ok) {
    if ("response" in ctx && ctx.response) return ctx.response;
    return jsonError(ctx.message, ctx.status);
  }

  const { actorSupabase, targetSchoolId, branchScope } = ctx.value;

  try {
    const { data, error } = await applyBranchScopeToQuery(
      actorSupabase
        .from("teachers")
        .select("*")
        .eq("id", teacherId)
        .eq("school_id", targetSchoolId)
        .neq("status", "deleted"),
      branchScope,
    ).maybeSingle();

    if (error) {
      logRouteError("teachers-get", error, { teacherId, schoolId: targetSchoolId });
      return jsonError("تعذر تحميل بيانات المعلم.", 500);
    }

    if (!data) {
      return jsonError("المعلم غير موجود ضمن المدرسة الحالية.", 404);
    }

    return NextResponse.json({ ok: true, teacher: data });
  } catch (error) {
    logRouteError("teachers-get", error, { teacherId, schoolId: targetSchoolId });
    return jsonError("تعذر تحميل بيانات المعلم.", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  const { teacherId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id : null;
  const requestedBranchId = typeof body?.branch_id === "string" ? body.branch_id : null;

  const ctx = await resolveTeacherContext(req, schoolId, "manage_teachers", requestedBranchId);
  if (!ctx.ok) {
    if ("response" in ctx && ctx.response) return ctx.response;
    return jsonError(ctx.message, ctx.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId, branchScope } = ctx.value;

  // Verify teacher exists and belongs to this school/branch
  const { data: existing, error: fetchError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("teachers")
      .select("id, school_id")
      .eq("id", teacherId)
      .eq("school_id", targetSchoolId)
      .neq("status", "deleted"),
    branchScope,
  ).maybeSingle();

  if (fetchError || !existing) {
    return jsonError("المعلم غير موجود ضمن المدرسة الحالية.", 404);
  }

  try {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const optionalTextFields = [
      "full_name", "first_name_ar", "last_name_ar", "subject", "job_title", "specialization",
      "phone", "phone_secondary", "email", "email_work", "address", "city",
      "nationality", "marital_status", "blood_type", "national_id", "national_id_expiry",
      "employee_id", "contract_type", "hire_date", "contract_end_date",
      "qualification", "university", "bank_name", "bank_account",
      "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation",
      "notes", "date_of_birth", "status", "status_reason", "photo", "salary_type",
    ] as const;

    for (const field of optionalTextFields) {
      if (body && field in body) {
        updatePayload[field] = normalizeOptionalText(body[field]);
      }
    }

    if (body && "gender" in body) {
      updatePayload.gender = body.gender === "male" || body.gender === "female" ? body.gender : null;
    }

    const numericFields = [
      "years_experience", "max_periods_daily", "max_periods_weekly",
      "graduation_year", "base_salary", "lecture_price", "transport_allowance",
      "housing_allowance", "other_allowances", "performance_score",
    ] as const;

    for (const field of numericFields) {
      if (body && field in body) {
        const parsed = Number(body[field]);
        updatePayload[field] = Number.isFinite(parsed) ? parsed : null;
      }
    }

    // JSONB fields
    if (body && "classes_taught" in body && Array.isArray(body.classes_taught)) {
      updatePayload.classes_taught = body.classes_taught;
    }

    const booleanFields = ["messaging_paused", "notifications_require_approval"] as const;
    for (const field of booleanFields) {
      if (body && field in body) {
        updatePayload[field] = body[field] === true || body[field] === false ? body[field] : null;
      }
    }

    const { data, error } = await applyBranchScopeToQuery(
      actorSupabase
        .from("teachers")
        .update(updatePayload)
        .eq("id", teacherId)
        .eq("school_id", targetSchoolId),
      branchScope,
    )
      .select("*")
      .maybeSingle();

    if (error || !data) {
      logRouteError("teachers-patch", error, { teacherId, actorUserId, schoolId: targetSchoolId });
      return jsonError(error?.message || "تعذر تحديث بيانات المعلم.", 500);
    }

    return NextResponse.json({ ok: true, teacher: data });
  } catch (error) {
    logRouteError("teachers-patch", error, { teacherId, actorUserId, schoolId: targetSchoolId });
    return jsonError("تعذر تحديث بيانات المعلم.", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  const { teacherId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id : null;
  const requestedBranchId = typeof body?.branch_id === "string" ? body.branch_id : null;

  const ctx = await resolveTeacherContext(req, schoolId, "manage_teachers", requestedBranchId);
  if (!ctx.ok) {
    if ("response" in ctx && ctx.response) return ctx.response;
    return jsonError(ctx.message, ctx.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId, branchScope } = ctx.value;

  const { data: existing, error: fetchError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("teachers")
      .select("id, status")
      .eq("id", teacherId)
      .eq("school_id", targetSchoolId),
    branchScope,
  ).maybeSingle();

  if (fetchError || !existing) {
    return jsonError("المعلم غير موجود ضمن المدرسة الحالية.", 404);
  }

  try {
    // Soft delete: set status = 'deleted'
    const { data, error } = await applyBranchScopeToQuery(
      actorSupabase
        .from("teachers")
        .update({ status: "deleted", updated_at: new Date().toISOString() })
        .eq("id", teacherId)
        .eq("school_id", targetSchoolId),
      branchScope,
    )
      .select("id, status")
      .maybeSingle();

    if (error || !data) {
      logRouteError("teachers-delete", error, { teacherId, actorUserId, schoolId: targetSchoolId });
      return jsonError(error?.message || "تعذر حذف المعلم.", 500);
    }

    return NextResponse.json({ ok: true, teacherId });
  } catch (error) {
    logRouteError("teachers-delete", error, { teacherId, actorUserId, schoolId: targetSchoolId });
    return jsonError("تعذر حذف المعلم.", 500);
  }
}
