import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { buildStudentPromotionPlan } from "@/lib/students/promotion";
import { invalidateSchoolCacheDomains } from "@/lib/server-cache";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

// GET: dry-run preview — no DB changes
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("school_id") ?? "";
  const requestedBranchId = searchParams.get("branch_id") || null;

  if (!schoolId) return jsonError("school_id مطلوب.", 400);

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin", "employee"], roleDeniedMessage: "معاينة الترحيل متاحة ضمن المدرسة الحالية فقط." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const canEdit = await routeUserHasPermission(actorSupabase, actorUserId, "edit_students");
  if (!canEdit) return jsonError("ليس لديك صلاحية ترحيل الطلاب.", 403);

  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) return jsonError(branchScope.message, branchScope.status);

  const { data: students, error: fetchError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("students")
      .select("id, full_name, class_name, status")
      .eq("school_id", targetSchoolId)
      .not("status", "in", "(deleted,withdrawn,archived,graduated)"),
    branchScope.value,
  );

  if (fetchError) return jsonError(fetchError.message || "تعذر تحميل بيانات الطلاب.", 500);

  const normalizedStudents = (students ?? []).map((s) => ({
    id: String((s as Record<string, unknown>).id ?? ""),
    class_name: typeof (s as Record<string, unknown>).class_name === "string"
      ? ((s as Record<string, unknown>).class_name as string)
      : null,
    full_name: typeof (s as Record<string, unknown>).full_name === "string"
      ? ((s as Record<string, unknown>).full_name as string)
      : null,
  }));

  const plan = buildStudentPromotionPlan(normalizedStudents);

  // Group promotable by class transition
  type PromotionGroup = { from: string; to: string; count: number; students: { id: string; full_name: string }[] };
  const groupMap = new Map<string, PromotionGroup>();
  for (const update of plan.updates) {
    const key = `${update.fromClassName}→${update.toClassName}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, { from: update.fromClassName, to: update.toClassName, count: 0, students: [] });
    }
    const entry = groupMap.get(key)!;
    entry.count++;
    const student = normalizedStudents.find((s) => s.id === update.id);
    entry.students.push({ id: update.id, full_name: student?.full_name ?? update.id });
  }

  const terminalStudents = plan.skipped
    .filter((s) => s.reason === "terminal")
    .map((s) => {
      const student = normalizedStudents.find((st) => st.id === s.id);
      return { id: s.id, full_name: student?.full_name ?? s.id, class_name: s.className };
    });

  const unrecognizedStudents = plan.skipped
    .filter((s) => s.reason !== "terminal")
    .map((s) => {
      const student = normalizedStudents.find((st) => st.id === s.id);
      return { id: s.id, full_name: student?.full_name ?? s.id, class_name: s.className, reason: s.reason };
    });

  return NextResponse.json({
    ok: true,
    summary: plan.summary,
    promotableGroups: Array.from(groupMap.values()),
    terminalStudents,
    unrecognizedStudents,
    totalActive: normalizedStudents.length,
  });
}

// POST: execute promotion
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";
  const requestedBranchId = typeof body?.branch_id === "string" ? body.branch_id.trim() || null : null;
  const graduateTerminal = body?.graduate_terminal !== false;
  const resetPaidFee = body?.reset_paid_fee !== false;

  if (!schoolId) return jsonError("school_id مطلوب.", 400);

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "ترحيل السنة الدراسية متاح للمديرين فقط.",
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
  const canEdit = await routeUserHasPermission(actorSupabase, actorUserId, "edit_students");
  if (!canEdit) return jsonError("ليس لديك صلاحية ترحيل الطلاب.", 403);

  const rateLimited = await enforceRateLimit(req, {
    namespace: "students-promote-year",
    windowMs: 60_000,
    maxHits: 3,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) return jsonError(branchScope.message, branchScope.status);

  const { data: students, error: fetchError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("students")
      .select("id, class_name, status")
      .eq("school_id", targetSchoolId)
      .not("status", "in", "(deleted,withdrawn,archived,graduated)"),
    branchScope.value,
  );

  if (fetchError) return jsonError(fetchError.message || "تعذر تحميل بيانات الطلاب.", 500);

  const plan = buildStudentPromotionPlan(
    (students ?? []).map((s) => ({
      id: String((s as Record<string, unknown>).id ?? ""),
      class_name: typeof (s as Record<string, unknown>).class_name === "string"
        ? ((s as Record<string, unknown>).class_name as string)
        : null,
    })),
  );

  // 1. Promote students (update class_name)
  if (plan.updates.length > 0) {
    const groups = new Map<string, string[]>();
    for (const update of plan.updates) {
      const ids = groups.get(update.toClassName) ?? [];
      ids.push(update.id);
      groups.set(update.toClassName, ids);
    }
    for (const [toClass, ids] of Array.from(groups.entries())) {
      const { error } = await actorSupabase
        .from("students")
        .update({ class_name: toClass })
        .eq("school_id", targetSchoolId)
        .in("id", ids);
      if (error) return jsonError("تعذر ترحيل الطلاب: " + (error.message ?? ""), 500);
    }
  }

  // 2. Graduate terminal students (grade 12)
  let graduatedCount = 0;
  if (graduateTerminal) {
    const terminalIds = plan.skipped.filter((s) => s.reason === "terminal").map((s) => s.id);
    if (terminalIds.length > 0) {
      const { error } = await actorSupabase
        .from("students")
        .update({ status: "graduated" })
        .eq("school_id", targetSchoolId)
        .in("id", terminalIds);
      if (error) return jsonError("تعذر تعيين الطلاب الخريجين: " + (error.message ?? ""), 500);
      graduatedCount = terminalIds.length;
    }
  }

  // 3. Reset paid_fee = 0 for all remaining active students
  let feesResetCount = 0;
  if (resetPaidFee) {
    const { error, count } = await applyBranchScopeToQuery(
      actorSupabase
        .from("students")
        .update({ paid_fee: 0 })
        .eq("school_id", targetSchoolId)
        .not("status", "in", "(deleted,withdrawn,archived,graduated)"),
      branchScope.value,
    );
    if (error) return jsonError("تعذر إعادة تصفير الأقساط: " + (error.message ?? ""), 500);
    feesResetCount = count ?? plan.updates.length;
  }

  invalidateSchoolCacheDomains(targetSchoolId, [
    "dashboard-overview",
    "payments-meta",
    "reports-overview",
    "students-list",
    "students-meta",
  ]);

  return NextResponse.json({
    ok: true,
    promoted: plan.updates.length,
    graduated: graduatedCount,
    feesReset: feesResetCount,
    skipped: plan.skipped.filter((s) => s.reason !== "terminal").length,
  });
}
