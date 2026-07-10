import { NextRequest, NextResponse } from "next/server";

import { isMissingTableError } from "@/lib/admin-infrastructure";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { invalidateSchoolCacheDomains } from "@/lib/server-cache";
import {
  applyEffectiveSalaryDeductions,
  calculateNetSalary,
  loadSchoolDeductionIndex,
} from "@/lib/salaries/effective-deductions";

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function extractMonthRange(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  if (!year || !monthIndex) {
    return { from: "0000-01-01", to: "9999-12-31" };
  }
  const start = `${year}-${String(monthIndex).padStart(2, "0")}-01`;
  const endDate = new Date(year, monthIndex, 0).getDate();
  const end = `${year}-${String(monthIndex).padStart(2, "0")}-${String(endDate).padStart(2, "0")}`;
  return { from: start, to: end };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";
  const month = typeof body?.month === "string" ? body.month.trim() : "";

  if (!schoolId || !month) {
    return jsonError("بيانات الأرشفة غير مكتملة.", 400);
  }

  if (!MONTH_REGEX.test(month)) {
    return jsonError("صيغة الشهر غير صالحة. استخدم YYYY-MM.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "أرشفة الرواتب متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const requestedBranchId = typeof body?.branch_id === "string" && body.branch_id.trim() ? body.branch_id.trim() : null;
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = await enforceRateLimit(req, {
    namespace: "salaries-archive",
    windowMs: 60_000,
    maxHits: 20,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const canManageSalaries = await routeUserHasPermission(actorSupabase, actorUserId, "manage_salaries");
  if (!canManageSalaries) {
    return jsonError("ليس لديك صلاحية أرشفة الرواتب.", 403);
  }
  const { from, to } = extractMonthRange(month);

  const [teachersResult, salariesResult, lecturesResult] = await Promise.all([
    applyBranchScopeToQuery(
      actorSupabase.from("teachers").select("id").eq("school_id", targetSchoolId),
      branchScope.value,
    ),
    applyBranchScopeToQuery(
      actorSupabase
        .from("salaries")
        .select("id, teacher_id, gross_salary, deductions, month, paid_at, notes, teachers(full_name,subject)")
        .eq("school_id", targetSchoolId)
        .eq("month", month),
      branchScope.value,
    ),
    applyBranchScopeToQuery(
      actorSupabase
        .from("daily_lectures")
        .select("id, teacher_id, grade, section, period, session_type, lecture_date, price")
        .eq("school_id", targetSchoolId)
        .gte("lecture_date", from)
        .lte("lecture_date", to),
      branchScope.value,
    ),
  ]);

  if (teachersResult.error) {
    return jsonError(teachersResult.error.message || "تعذر تحميل الأساتذة قبل الأرشفة.", 500);
  }
  if (salariesResult.error) {
    return jsonError(salariesResult.error.message || "تعذر تحميل رواتب الشهر المطلوب.", 500);
  }
  if (lecturesResult.error) {
    return jsonError(lecturesResult.error.message || "تعذر تحميل المحاضرات المرتبطة بالشهر.", 500);
  }

  const normalizedSalaries = (salariesResult.data ?? []).map((item) => ({
    ...item,
    teachers: Array.isArray(item.teachers) ? item.teachers[0] ?? null : item.teachers ?? null,
  }));
  const deductionIndex = await loadSchoolDeductionIndex(actorSupabase, targetSchoolId);
  const salaries = applyEffectiveSalaryDeductions(normalizedSalaries, deductionIndex);
  const lectures = lecturesResult.data ?? [];
  const totalTeachers = teachersResult.data?.length ?? 0;
  const totalAmount = salaries.reduce(
    (sum, salary) => sum + calculateNetSalary(salary.gross_salary, salary.deductions),
    0,
  );

  const archivePayload = {
    school_id: targetSchoolId,
    month,
    total_teachers: totalTeachers,
    total_amount: totalAmount,
    archive_date: new Date().toISOString(),
    data: {
      salaries,
      lectures,
    },
  };

  const { data: existingArchive, error: existingArchiveError } = await actorSupabase
    .from("salary_archives")
    .select("id")
    .eq("school_id", targetSchoolId)
    .eq("month", month)
    .order("archive_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingArchiveError) {
    if (isMissingTableError(existingArchiveError, "salary_archives")) {
      return jsonError("جدول أرشيف الرواتب غير موجود بعد في قاعدة البيانات الحالية.", 500);
    }
    return jsonError(existingArchiveError.message || "تعذر التحقق من أرشيف الرواتب الحالي.", 500);
  }

  // Capture old archive state before update (needed for correct rollback if lecture deletion fails)
  let oldArchiveSnapshot: Record<string, unknown> | null = null;
  if (existingArchive?.id) {
    const { data: snap } = await actorSupabase
      .from("salary_archives")
      .select("*")
      .eq("id", existingArchive.id)
      .eq("school_id", targetSchoolId)
      .single();
    oldArchiveSnapshot = snap ?? null;
  }

  const wasInserted = !existingArchive?.id;
  const archiveWriteResult = existingArchive?.id
    ? await actorSupabase
        .from("salary_archives")
        .update(archivePayload)
        .eq("id", existingArchive.id)
        .eq("school_id", targetSchoolId)
        .select("*")
        .single()
    : await actorSupabase
        .from("salary_archives")
        .insert(archivePayload)
        .select("*")
        .single();

  const { data: archive, error: archiveError } = archiveWriteResult;

  if (archiveError) {
    if (isMissingTableError(archiveError, "salary_archives")) {
      return jsonError("جدول أرشيف الرواتب غير موجود بعد في قاعدة البيانات الحالية.", 500);
    }
    return jsonError(archiveError.message || "تعذر أرشفة بيانات الرواتب.", 500);
  }

  const { error: purgeLecturesError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("daily_lectures")
      .delete()
      .eq("school_id", targetSchoolId)
      .gte("lecture_date", from)
      .lte("lecture_date", to),
    branchScope.value,
  );

  if (purgeLecturesError) {
    // Rollback: restore previous state.
    // If we did an INSERT, delete the new record.
    // If we did an UPDATE, restore the old snapshot to avoid destroying previous archive data.
    if (wasInserted) {
      await actorSupabase
        .from("salary_archives")
        .delete()
        .eq("id", archive!.id)
        .eq("school_id", targetSchoolId);
    } else if (oldArchiveSnapshot) {
      const { id: _id, ...restorePayload } = oldArchiveSnapshot as Record<string, unknown>;
      await actorSupabase
        .from("salary_archives")
        .update(restorePayload)
        .eq("id", existingArchive!.id)
        .eq("school_id", targetSchoolId);
    }
    return jsonError(purgeLecturesError.message || "تعذر تصفير سجل المحاضرات — تم التراجع عن الأرشفة.", 500);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (actorSupabase.rpc as any)("purge_old_salary_archives");
  } catch {
    // Ignore when migration has not been applied yet.
  }

  invalidateSchoolCacheDomains(targetSchoolId, ["dashboard-overview", "reports-overview"]);

  return NextResponse.json({
    ok: true,
    archive,
    summary: {
      totalTeachers,
      totalAmount,
      archivedLectureCount: lectures.length,
    },
  });
}
