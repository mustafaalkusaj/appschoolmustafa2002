import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext, syncStudentTeacherLinks } from "@/lib/managed-users-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  const schoolId = typeof body?.school_id === "string" ? body.school_id : null;
  const className = typeof body?.class_name === "string" ? body.class_name.trim() : "";
  const sectionRaw = typeof body?.section === "string" ? body.section.trim() : "";
  const section = sectionRaw || null;

  if (!schoolId) {
    return jsonError("يجب تحديد المدرسة قبل مزامنة ربط الطالب مع الأساتذة.", 400);
  }

  if (!className) {
    return jsonError("اسم الصف مطلوب لمزامنة ربط الطالب.", 400);
  }

  const context = await resolveSchoolScopedActorContext(schoolId, {
    allowedRoles: ["super_admin", "admin", "employee"],
    roleDeniedMessage: "لا تملك صلاحية مزامنة ربط الطلاب مع الأساتذة.",
  }, req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, targetSchoolId } = context.value;

  const { data: student, error: studentError } = await actorSupabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (studentError || !student?.id) {
    return jsonError("الطالب المطلوب غير موجود ضمن المدرسة الحالية.", 404);
  }

  try {
    const linkResult = await syncStudentTeacherLinks(actorSupabase, {
      schoolId: targetSchoolId,
      studentId,
      className,
      section,
    });

    return NextResponse.json({
      ok: true,
      linkedTeacherIds: linkResult.teacherIds,
      persisted: linkResult.persisted,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر مزامنة ربط الطالب مع الأساتذة.", 500);
  }
}
