import { NextRequest, NextResponse } from "next/server";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  const { schoolId } = await params;
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const sourceSchoolId = schoolId.trim();
  if (!sourceSchoolId) {
    return jsonError("معرف المدرسة المصدر غير صالح.", 400);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("طلب غير صالح.", 400);
  }

  const { targetSchoolId } = body as { targetSchoolId?: string };
  const normalizedTarget = (targetSchoolId ?? "").trim();
  if (!normalizedTarget) {
    return jsonError("معرف المدرسة الهدف غير صالح.", 400);
  }

  if (sourceSchoolId === normalizedTarget) {
    return jsonError("لا يمكن نسخ الصفوف إلى نفس المدرسة.", 400);
  }

  const { dataSupabase } = context.value;

  // Verify target school exists
  const { data: targetSchool, error: targetError } = await dataSupabase
    .from("schools")
    .select("id, name")
    .eq("id", normalizedTarget)
    .maybeSingle();

  if (targetError || !targetSchool?.id) {
    return jsonError("المدرسة الهدف غير موجودة.", 404);
  }

  // Get source classes
  const { data: sourceClasses, error: classesError } = await dataSupabase
    .from("classes")
    .select("grade, section")
    .eq("school_id", sourceSchoolId);

  if (classesError) {
    return jsonError(classesError.message || "تعذر تحميل صفوف المدرسة المصدر.", 500);
  }

  if (!sourceClasses || sourceClasses.length === 0) {
    return jsonError("لا توجد صفوف في المدرسة المصدر للنسخ.", 400);
  }

  // Insert classes into target school
  const newClasses = sourceClasses.map((cls) => ({
    grade: cls.grade,
    section: cls.section,
    school_id: normalizedTarget,
  }));

  const { data: insertedClasses, error: insertError } = await dataSupabase
    .from("classes")
    .insert(newClasses)
    .select("id");

  if (insertError) {
    return jsonError(insertError.message || "تعذر نسخ الصفوف.", 500);
  }

  return NextResponse.json({
    ok: true,
    copied: insertedClasses?.length ?? 0,
    targetSchoolName: (targetSchool as { id: string; name: string }).name,
  });
}
