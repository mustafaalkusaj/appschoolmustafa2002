import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolBranchId, resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "سجل السحوبات متاح للإدارة فقط.",
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
  const rateLimited = enforceRateLimit(req, {
    namespace: "salaries-deductions-read",
    windowMs: 60_000,
    maxHits: 90,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const { data, error } = await actorSupabase
    .from("deductions")
    .select("id, teacher_id, amount, notes, deduction_date, teachers(full_name)")
    .eq("school_id", targetSchoolId)
    .order("deduction_date", { ascending: false });

  if (error) {
    return jsonError(error.message || "تعذر تحميل سجل السحوبات.", 500);
  }

  return NextResponse.json({
    ok: true,
    deductions: (data ?? []).map((item) => ({
      ...item,
      teachers: Array.isArray(item.teachers) ? item.teachers[0] ?? null : item.teachers ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";
  const teacherId = typeof body?.teacher_id === "string" ? body.teacher_id.trim() : "";
  const branchId = typeof body?.branch_id === "string" && body.branch_id.trim() ? body.branch_id.trim() : null;
  const amount = Math.max(0, Number(body?.amount ?? 0) || 0);
  const notes = typeof body?.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
  const deductionDate =
    typeof body?.deduction_date === "string" && body.deduction_date.trim()
      ? body.deduction_date.trim()
      : new Date().toISOString().split("T")[0];

  if (!schoolId || !teacherId) {
    return jsonError("بيانات السحب غير مكتملة.", 400);
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonError("قيمة السحب غير صالحة.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إدارة السحوبات متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const rateLimited = enforceRateLimit(req, {
    namespace: "salaries-deductions-write",
    windowMs: 60_000,
    maxHits: 45,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const canManageSalaries = await routeUserHasPermission(context.value.actorSupabase, context.value.actorUserId, "manage_salaries");
  if (!canManageSalaries) {
    return jsonError("ليس لديك صلاحية إدارة السحوبات.", 403);
  }

  const { data: teacher, error: teacherError } = await context.value.actorSupabase
    .from("teachers")
    .select("id, full_name")
    .eq("id", teacherId)
    .eq("school_id", context.value.targetSchoolId)
    .maybeSingle();

  if (teacherError || !teacher?.id) {
    return jsonError("الأستاذ المطلوب غير موجود ضمن المدرسة الحالية.", 404);
  }

  const resolvedBranchId = branchId ?? (await resolveSchoolBranchId(context.value.actorSupabase, context.value.targetSchoolId));
  const { data, error } = await context.value.actorSupabase
    .from("deductions")
    .insert({
      school_id: context.value.targetSchoolId,
      branch_id: resolvedBranchId,
      teacher_id: teacherId,
      amount,
      notes,
      deduction_date: deductionDate,
    })
    .select("id, teacher_id, amount, notes, deduction_date, teachers(full_name)")
    .single();

  if (error || !data) {
    return jsonError(error?.message || "تعذر تسجيل السحب.", 500);
  }

  return NextResponse.json({
    ok: true,
    deduction: {
      ...data,
      teachers: Array.isArray(data.teachers) ? data.teachers[0] ?? null : data.teachers ?? null,
    },
  });
}
