import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchIdForWrite, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/route-utils";
import { routeUserHasPermission } from "@/lib/route-permissions";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_SESSION_TYPES = new Set(["morning", "afternoon"]);
const VALID_DAYS = new Set(["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"]);

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const grade = req.nextUrl.searchParams.get("grade")?.trim() || "";
  const section = req.nextUrl.searchParams.get("section")?.trim() || "";

  if (!grade) {
    return jsonError("الصف مطلوب.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin"], roleDeniedMessage: "إدارة الجداول متاحة للإدارة فقط." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const requestedBranchId = req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) return jsonError(branchScope.message, branchScope.status);

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "salaries-schedule-read",
    windowMs: 60_000,
    maxHits: 120,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_salaries");
  if (!canManage) return jsonError("ليس لديك صلاحية الوصول إلى الجدول.", 403);

  let query = applyBranchScopeToQuery(
    actorSupabase
      .from("weekly_schedule")
      .select("day, period, session_type, teacher_id")
      .eq("school_id", targetSchoolId)
      .eq("grade", grade),
    branchScope.value,
  );
  if (section) query = query.eq("section", section);

  const { data, error } = await query;
  if (error) return jsonError(error.message || "تعذر تحميل الجدول.", 500);

  return NextResponse.json({ ok: true, schedule: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";
  const grade = typeof body?.grade === "string" ? body.grade.trim() : "";
  const section = typeof body?.section === "string" ? body.section.trim() : "";
  const branchIdFromBody = typeof body?.branch_id === "string" && body.branch_id.trim() ? body.branch_id.trim() : null;
  const rows = Array.isArray(body?.rows) ? body.rows : [];

  if (!schoolId || !grade) {
    return jsonError("المدرسة والصف مطلوبان.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin"], roleDeniedMessage: "إدارة الجداول متاحة للإدارة فقط." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const branchScope = resolveBranchScope(context.value, branchIdFromBody);
  if (!branchScope.ok) return jsonError(branchScope.message, branchScope.status);

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "salaries-schedule-write",
    windowMs: 60_000,
    maxHits: 30,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_salaries");
  if (!canManage) return jsonError("ليس لديك صلاحية إدارة الجداول.", 403);

  const writeBranch = resolveBranchIdForWrite(branchScope.value, branchIdFromBody);
  if (!writeBranch.ok) return jsonError(writeBranch.message, writeBranch.status);
  const resolvedBranchId = writeBranch.value ?? branchScope.value.branchId;

  const sanitizedRows = (rows as unknown[])
    .filter((row): row is Record<string, unknown> => row !== null && typeof row === "object")
    .filter((row) => {
      const day = typeof row.day === "string" ? row.day : "";
      const period = Number(row.period);
      const sessionType = typeof row.session_type === "string" ? row.session_type : "";
      const teacherId = typeof row.teacher_id === "string" ? row.teacher_id : "";
      return VALID_DAYS.has(day) && period >= 1 && period <= 10 && VALID_SESSION_TYPES.has(sessionType) && UUID_REGEX.test(teacherId);
    })
    .map((row) => ({
      school_id: targetSchoolId,
      branch_id: resolvedBranchId,
      grade,
      section: section || null,
      day: row.day as string,
      period: Number(row.period),
      session_type: row.session_type as string,
      teacher_id: row.teacher_id as string,
    }));

  let deleteQuery = applyBranchScopeToQuery(
    actorSupabase
      .from("weekly_schedule")
      .delete()
      .eq("school_id", targetSchoolId)
      .eq("grade", grade),
    branchScope.value,
  );
  if (section) deleteQuery = deleteQuery.eq("section", section);
  const { error: deleteError } = await deleteQuery;
  if (deleteError) return jsonError(deleteError.message || "تعذر حذف الجدول القديم.", 500);

  if (sanitizedRows.length > 0) {
    const { error: insertError } = await actorSupabase.from("weekly_schedule").insert(sanitizedRows);
    if (insertError) return jsonError(insertError.message || "تعذر حفظ الجدول.", 500);
  }

  return NextResponse.json({ ok: true, count: sanitizedRows.length });
}
