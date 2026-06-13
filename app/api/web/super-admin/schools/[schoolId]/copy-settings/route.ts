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
    return jsonError("لا يمكن نسخ الإعدادات إلى نفس المدرسة.", 400);
  }

  const { dataSupabase } = context.value;

  // Get source school settings
  const { data: sourceSchool, error: sourceError } = await dataSupabase
    .from("schools")
    .select("id, name, logo_url, primary_color, secondary_color, plan")
    .eq("id", sourceSchoolId)
    .maybeSingle();

  if (sourceError || !sourceSchool?.id) {
    return jsonError("المدرسة المصدر غير موجودة.", 404);
  }

  // Verify target school exists
  const { data: targetSchool, error: targetError } = await dataSupabase
    .from("schools")
    .select("id, name")
    .eq("id", normalizedTarget)
    .maybeSingle();

  if (targetError || !targetSchool?.id) {
    return jsonError("المدرسة الهدف غير موجودة.", 404);
  }

  // Copy branding settings (colors + logo) to target school
  const updatePayload: Record<string, unknown> = {};
  if (sourceSchool.primary_color) updatePayload.primary_color = sourceSchool.primary_color;
  if (sourceSchool.secondary_color) updatePayload.secondary_color = sourceSchool.secondary_color;
  if (sourceSchool.logo_url) updatePayload.logo_url = sourceSchool.logo_url;

  if (Object.keys(updatePayload).length === 0) {
    return jsonError("المدرسة المصدر لا تحتوي على إعدادات تصميم للنسخ.", 400);
  }

  const { error: updateError } = await dataSupabase
    .from("schools")
    .update(updatePayload)
    .eq("id", normalizedTarget);

  if (updateError) {
    return jsonError(updateError.message || "تعذر نسخ الإعدادات.", 500);
  }

  return NextResponse.json({
    ok: true,
    copied: Object.keys(updatePayload),
    targetSchoolName: (targetSchool as { id: string; name: string }).name,
  });
}
