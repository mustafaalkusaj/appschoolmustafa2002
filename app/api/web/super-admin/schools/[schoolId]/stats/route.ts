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
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من الصلاحيات.",
      "status" in context ? context.status : 500,
    );
  }

  const normalizedId = schoolId.trim();
  if (!normalizedId) return jsonError("معرف المدرسة غير صالح.", 400);

  const db = context.value.dataSupabase;

  const [schoolRes, studentsRes, usersRes, branchesRes, subRes] = await Promise.all([
    db.from("schools")
      .select("id, name, address, phone, owner_email, city, logo_url, plan, is_active, created_at")
      .eq("id", normalizedId)
      .maybeSingle(),
    db.from("students").select("id", { count: "exact", head: true }).eq("school_id", normalizedId),
    db.from("user_profiles").select("id", { count: "exact", head: true }).eq("school_id", normalizedId).neq("role", "super_admin"),
    db.from("branches").select("id", { count: "exact", head: true }).eq("school_id", normalizedId),
    db.from("subscriptions")
      .select("id, plan, status, start_date, end_date, created_at")
      .eq("school_id", normalizedId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (schoolRes.error) return jsonError(schoolRes.error.message || "تعذر تحميل بيانات المدرسة.", 500);
  if (!schoolRes.data) return jsonError("المدرسة غير موجودة.", 404);

  return NextResponse.json({
    ok: true,
    school: schoolRes.data,
    stats: {
      students: studentsRes.count ?? 0,
      users: usersRes.count ?? 0,
      branches: branchesRes.count ?? 0,
    },
    subscription: subRes.data ?? null,
  });
}
