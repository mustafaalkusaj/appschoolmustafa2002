import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchIdForWrite, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError, logRouteError } from "@/lib/route-utils";
import { routeUserHasPermission } from "@/lib/route-permissions";

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "أسعار المحاضرات متاحة للإدارة فقط.",
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
    namespace: "payroll-subject-prices",
    windowMs: 60_000,
    maxHits: 120,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_salaries");
  if (!canManage) {
    return jsonError("ليس لديك صلاحية الوصول إلى أسعار المواد.", 403);
  }

  const { data, error } = await applyBranchScopeToQuery(
    actorSupabase
      .from("subject_lecture_prices")
      .select("id, school_id, branch_id, subject_name, price_per_lecture, overtime_price, notes")
      .eq("school_id", targetSchoolId)
      .order("subject_name", { ascending: true }),
    branchScope.value,
  );

  if (error) {
    return jsonError(error.message || "تعذر تحميل أسعار المواد.", 500);
  }

  return NextResponse.json({ ok: true, subjectPrices: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return jsonError("البيانات المرسلة غير صالحة.", 400);

  const schoolId = body.school_id as string | undefined;

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "تعديل أسعار المحاضرات متاح للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const requestedBranchId = body.branch_id as string | undefined;
  const branchScope = resolveBranchScope(context.value, requestedBranchId ?? null);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "payroll-subject-prices-write",
    windowMs: 60_000,
    maxHits: 40,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_salaries");
  if (!canManage) {
    return jsonError("ليس لديك صلاحية تعديل أسعار المواد.", 403);
  }

  const entries = Array.isArray(body.entries) ? body.entries : [];
  if (entries.length === 0) {
    return jsonError("قائمة الأسعار فارغة.", 400);
  }

  const writeBranch = resolveBranchIdForWrite(branchScope.value, requestedBranchId ?? null);
  if (!writeBranch.ok) {
    return jsonError(writeBranch.message, writeBranch.status);
  }

  const rows = (entries as Array<{ subject_name: string; price_per_lecture: number; overtime_price?: number; notes?: string }>)
    .filter((e) => typeof e.subject_name === "string" && e.subject_name.trim())
    .map((e) => ({
      school_id: targetSchoolId,
      branch_id: writeBranch.value ?? null,
      subject_name: e.subject_name.trim(),
      price_per_lecture: Number(e.price_per_lecture) || 0,
      overtime_price: Number(e.overtime_price) || 0,
      notes: typeof e.notes === "string" ? e.notes.trim() || null : null,
    }));

  if (rows.length === 0) {
    return jsonError("لا توجد بيانات صالحة للحفظ.", 400);
  }

  const { data, error } = await actorSupabase
    .from("subject_lecture_prices")
    .upsert(rows, { onConflict: "school_id,branch_id,subject_name" })
    .select();

  if (error) {
    logRouteError("payroll-subject-prices-put", error, { actorUserId, schoolId: targetSchoolId });
    return jsonError(error.message || "تعذر حفظ أسعار المواد.", 500);
  }

  return NextResponse.json({ ok: true, subjectPrices: data ?? [] });
}
