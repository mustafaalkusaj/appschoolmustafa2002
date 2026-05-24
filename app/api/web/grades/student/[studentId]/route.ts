import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { fetchStudentGradeHistory } from "@/lib/grades/grade-entries-server";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import type { GradeEntry } from "@/lib/grades/types";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;

  if (!studentId) {
    return jsonError("studentId مطلوب.", 400);
  }

  const searchParams = req.nextUrl.searchParams;
  const schoolId = searchParams.get("schoolId");

  // ── Auth ────────────────────────────────────────────────────────────────────
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "إدارة الدرجات متاحة ضمن نطاق المدرسة الحالية فقط.",
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

  // ── Branch scope ─────────────────────────────────────────────────────────────
  const branchScope = resolveBranchScope(context.value);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  // ── Rate limit ───────────────────────────────────────────────────────────────
  const rateLimited = await enforceRateLimit(req, {
    namespace: "grades-student",
    windowMs: 60_000,
    maxHits: 120,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  // ── Permission ──────────────────────────────────────────────────────────────
  const canView = await routeUserHasPermission(actorSupabase, actorUserId, "view_grades");
  if (!canView) {
    return jsonError("ليس لديك صلاحية عرض الدرجات.", 403);
  }

  // ── Validate student belongs to this school and branch ───────────────────────
  const { data: studentRows, error: studentError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .eq("school_id", targetSchoolId),
    branchScope.value,
  ).limit(1);

  if (studentError) {
    return jsonError("تعذر التحقق من بيانات الطالب.", 500);
  }

  const studentExists = (studentRows ?? []).length > 0;
  if (!studentExists) {
    return jsonError("الطالب غير موجود أو لا ينتمي إلى هذا الفرع.", 404);
  }

  // ── Fetch full grade history ─────────────────────────────────────────────────
  const result = await fetchStudentGradeHistory(actorSupabase, targetSchoolId, studentId);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, gate: result.gate, entries: [], grouped: {} },
      { status: result.gate.code === "missing_table" ? 503 : 500 },
    );
  }

  // ── Group by academic_year → semester ────────────────────────────────────────
  const grouped: Record<string, Record<string, GradeEntry[]>> = {};

  for (const entry of result.items) {
    const year = entry.academic_year;
    const sem = String(entry.semester);

    if (!grouped[year]) grouped[year] = {};
    if (!grouped[year][sem]) grouped[year][sem] = [];
    grouped[year][sem].push(entry);
  }

  return NextResponse.json({
    ok: true,
    gate: result.gate,
    entries: result.items,
    grouped,
  });
}
