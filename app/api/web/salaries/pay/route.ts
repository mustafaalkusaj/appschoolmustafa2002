import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolBranchId, resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";
  const teacherId = typeof body?.teacher_id === "string" ? body.teacher_id.trim() : "";
  const requestedBranchId = typeof body?.branch_id === "string" && body.branch_id.trim() ? body.branch_id.trim() : null;
  const month = typeof body?.month === "string" ? body.month.trim() : "";
  const grossSalary = Number(body?.gross_salary ?? 0);
  const deductions = Number(body?.deductions ?? 0);
  const notes = typeof body?.notes === "string" && body.notes.trim() ? body.notes.trim() : null;

  if (!schoolId || !teacherId || !month) {
    return jsonError("بيانات صرف الراتب غير مكتملة.", 400);
  }

  if (!Number.isFinite(grossSalary) || grossSalary < 0 || !Number.isFinite(deductions) || deductions < 0) {
    return jsonError("قيم الراتب أو الخصومات غير صالحة.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "صرف الرواتب متاح للإدارة فقط.",
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
    namespace: "salaries-pay",
    windowMs: 60_000,
    maxHits: 40,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const canManageSalaries = await routeUserHasPermission(actorSupabase, actorUserId, "manage_salaries");
  if (!canManageSalaries) {
    return jsonError("ليس لديك صلاحية صرف الرواتب.", 403);
  }
  const { data: teacher, error: teacherError } = await actorSupabase
    .from("teachers")
    .select("id, full_name")
    .eq("id", teacherId)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (teacherError || !teacher?.id) {
    return jsonError("الأستاذ المطلوب غير موجود ضمن المدرسة الحالية.", 404);
  }

  const { data: existing } = await actorSupabase
    .from("salaries")
    .select("id")
    .eq("school_id", targetSchoolId)
    .eq("teacher_id", teacherId)
    .eq("month", month)
    .order("created_at", { ascending: true })
    .limit(1);

  if (existing && existing.length > 0) {
    return jsonError("تم دفع راتب هذا الشهر مسبقاً.", 409);
  }

  const branchId = requestedBranchId ?? (await resolveSchoolBranchId(actorSupabase, targetSchoolId));
  const { data: insertedSalary, error: insertError } = await actorSupabase
    .from("salaries")
    .insert({
      school_id: targetSchoolId,
      branch_id: branchId,
      teacher_id: teacherId,
      gross_salary: grossSalary,
      deductions,
      month,
      is_paid: true,
      paid_at: new Date().toISOString(),
      notes,
    })
    .select("id, school_id, branch_id, teacher_id, gross_salary, deductions, month, is_paid, paid_at, notes, created_at, teachers(full_name,subject)")
    .single();

  if (insertError || !insertedSalary) {
    return jsonError(insertError?.message || "تعذر صرف الراتب.", 500);
  }

  const { data: duplicateRows } = await actorSupabase
    .from("salaries")
    .select("id")
    .eq("school_id", targetSchoolId)
    .eq("teacher_id", teacherId)
    .eq("month", month)
    .order("created_at", { ascending: true });

  let warning = "";
  if (duplicateRows && duplicateRows.length > 1) {
    const keeperId = duplicateRows[0]?.id;
    const duplicateIds = duplicateRows.slice(1).map((row) => row.id).filter(Boolean);

    if (duplicateIds.length > 0) {
      await actorSupabase.from("salaries").delete().eq("school_id", targetSchoolId).in("id", duplicateIds);
    }

    if (keeperId !== insertedSalary.id) {
      return jsonError("تم اكتشاف عملية متزامنة لهذا الشهر. احتُفظ بأول سجل فقط.", 409);
    }

    warning = "تمت إزالة تكرارات متزامنة لراتب هذا الشهر تلقائياً.";
  }

  return NextResponse.json({
    ok: true,
    salary: {
      ...insertedSalary,
      teachers: Array.isArray(insertedSalary.teachers)
        ? insertedSalary.teachers[0] ?? null
        : insertedSalary.teachers ?? null,
    },
    warning,
  });
}
