import { NextRequest, NextResponse } from "next/server";

import {
  resolveSchoolBranchId,
  resolveSchoolScopedActorContext,
  tableHasColumn,
} from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

type TeacherBody = {
  school_id?: unknown;
  branch_id?: unknown;
  full_name?: unknown;
  subject?: unknown;
  job_title?: unknown;
  salary_type?: unknown;
  phone?: unknown;
  address?: unknown;
  base_salary?: unknown;
  lecture_price?: unknown;
  weekly_hours?: unknown;
  classes_taught?: unknown;
  status?: unknown;
};

function buildTeacherSelect(includeLecturePrice: boolean) {
  return includeLecturePrice
    ? "id, school_id, branch_id, full_name, subject, job_title, salary_type, phone, address, base_salary, lecture_price, weekly_hours, classes_taught, status"
    : "id, school_id, branch_id, full_name, subject, job_title, salary_type, phone, address, base_salary, weekly_hours, classes_taught, status";
}

function normalizeTeacherPayload(body: TeacherBody, branchId: string | null, includeLecturePrice: boolean) {
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  if (!fullName) {
    return { ok: false as const, message: "يرجى إدخال الاسم." };
  }

  const salaryType =
    body.salary_type === "hourly" || body.salary_type === "mixed" ? body.salary_type : "fixed";
  const classesTaught = Array.isArray(body.classes_taught)
    ? body.classes_taught
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as { grade?: unknown; section?: unknown };
          const grade = typeof row.grade === "string" ? row.grade.trim() : "";
          const section = typeof row.section === "string" ? row.section.trim() : "";
          return grade ? { grade, section } : null;
        })
        .filter(Boolean)
    : [];

  return {
    ok: true as const,
    value: {
      branch_id: branchId,
      full_name: fullName,
      subject: typeof body.subject === "string" && body.subject.trim() ? body.subject.trim() : null,
      job_title: typeof body.job_title === "string" && body.job_title.trim() ? body.job_title.trim() : null,
      salary_type: salaryType,
      phone: typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null,
      address: typeof body.address === "string" && body.address.trim() ? body.address.trim() : null,
      base_salary: Math.max(0, Number(body.base_salary ?? 0) || 0),
      ...(includeLecturePrice ? { lecture_price: Math.max(0, Number(body.lecture_price ?? 0) || 0) } : {}),
      weekly_hours: Math.max(0, Number(body.weekly_hours ?? 0) || 0),
      classes_taught: classesTaught,
      status: body.status === "inactive" ? "inactive" : "active",
    },
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  const { teacherId } = await params;
  const normalizedTeacherId = teacherId.trim();
  if (!normalizedTeacherId) {
    return jsonError("معرف الأستاذ غير صالح.", 400);
  }

  const body = (await req.json().catch(() => null)) as TeacherBody | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";
  const branchId = typeof body?.branch_id === "string" && body.branch_id.trim() ? body.branch_id.trim() : null;

  if (!schoolId) {
    return jsonError("معرف المدرسة مطلوب.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إدارة الأساتذة متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const rateLimited = enforceRateLimit(req, {
    namespace: "salaries-teachers-update",
    windowMs: 60_000,
    maxHits: 45,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const canManageSalaries = await routeUserHasPermission(
    context.value.actorSupabase,
    context.value.actorUserId,
    "manage_salaries",
  );
  if (!canManageSalaries) {
    return jsonError("ليس لديك صلاحية إدارة الأساتذة.", 403);
  }

  const { data: existingTeacher, error: teacherLookupError } = await context.value.actorSupabase
    .from("teachers")
    .select("id")
    .eq("id", normalizedTeacherId)
    .eq("school_id", context.value.targetSchoolId)
    .maybeSingle();

  if (teacherLookupError || !existingTeacher?.id) {
    return jsonError("الأستاذ المطلوب غير موجود ضمن المدرسة الحالية.", 404);
  }

  const includeLecturePrice = await tableHasColumn(context.value.actorSupabase, "teachers", "lecture_price").catch(
    () => true,
  );
  const teacherSelect = buildTeacherSelect(includeLecturePrice);
  const resolvedBranchId = branchId ?? (await resolveSchoolBranchId(context.value.actorSupabase, context.value.targetSchoolId));
  const payload = normalizeTeacherPayload(body ?? {}, resolvedBranchId, includeLecturePrice);
  if (!payload.ok) {
    return jsonError(payload.message, 400);
  }

  const { data, error } = await context.value.actorSupabase
    .from("teachers")
    .update(payload.value)
    .eq("id", normalizedTeacherId)
    .eq("school_id", context.value.targetSchoolId)
    .select(teacherSelect)
    .single();

  if (error || !data) {
    return jsonError(error?.message || "تعذر تحديث بيانات الأستاذ.", 500);
  }

  return NextResponse.json({
    ok: true,
    teacher: data,
  });
}
