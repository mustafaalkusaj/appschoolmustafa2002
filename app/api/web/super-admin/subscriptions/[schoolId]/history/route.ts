import { NextRequest, NextResponse } from "next/server";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  const { schoolId } = await params;
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const normalizedSchoolId = schoolId.trim();
  if (!normalizedSchoolId) {
    return jsonError("معرف المدرسة غير صالح.", 400);
  }

  const { dataSupabase } = context.value;

  const { data, error } = await dataSupabase
    .from("subscriptions")
    .select("id, school_id, plan, status, start_date, end_date, created_at")
    .eq("school_id", normalizedSchoolId)
    .order("created_at", { ascending: false });

  if (error) {
    return jsonError(error.message || "تعذر تحميل سجل الاشتراكات.", 500);
  }

  return NextResponse.json({ ok: true, subscriptions: data ?? [] });
}
