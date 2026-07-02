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

  // Steps 1-3 (promote → graduate → reset paid_fee) run ATOMICALLY inside a
  // single DB transaction via the promote_year_execute RPC. Previously these
  // were three separate auto-committed updates: a mid-sequence failure left the
  // school half-promoted, and a retry re-promoted everyone (double class
  // advancement). The RPC is SECURITY DEFINER and enforces admin role +
  // same-school internally. Branch scope is already applied: the id sets below
  // come from the branch-scoped `students` fetch above.
  const promotions = plan.updates.map((u) => ({ id: u.id, to_class: u.toClassName }));
  const terminalIds = graduateTerminal
    ? plan.skipped.filter((s) => s.reason === "terminal").map((s) => s.id)
    : [];
  const terminalIdSet = new Set(terminalIds);
  // Reset paid_fee for every active in-scope student except those just graduated
  // (matches the previous "not in (…,graduated)" filter after graduation).
  const resetIds = resetPaidFee
    ? (students ?? [])
        .map((s) => String((s as Record<string, unknown>).id ?? ""))
        .filter((id) => id && !terminalIdSet.has(id))
    : [];

  const { data: promoteResult, error: promoteError } = await actorSupabase.rpc(
    "promote_year_execute",
    {
      p_school_id: targetSchoolId,
      p_promotions: promotions,
      p_terminal_ids: terminalIds,
      p_reset_ids: resetIds,
    },
  );
  if (promoteError) {
    return jsonError("تعذر ترحيل السنة الدراسية: " + (promoteError.message ?? ""), 500);
  }
  const graduatedCount =
    (promoteResult as { graduated?: number } | null)?.graduated ?? terminalIds.length;
  const feesResetCount =
    (promoteResult as { fees_reset?: number } | null)?.fees_reset ?? resetIds.length;

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
