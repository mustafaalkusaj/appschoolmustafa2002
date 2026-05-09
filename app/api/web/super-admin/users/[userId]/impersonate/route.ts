import { NextRequest, NextResponse } from "next/server";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return jsonError("معرف المستخدم غير صالح.", 400);
  }

  const { dataSupabase } = context.value;

  const { data: userProfile, error: profileError } = await dataSupabase
    .from("user_profiles")
    .select("email")
    .eq("id", normalizedUserId)
    .maybeSingle();

  if (profileError || !userProfile?.email) {
    return jsonError("تعذر العثور على بريد المستخدم الإلكتروني.", 404);
  }

  try {
    const serviceSupabase = createServiceSupabaseClient();
    const { data, error } = await serviceSupabase.auth.admin.generateLink({
      type: "magiclink",
      email: userProfile.email,
    });

    if (error) {
      return jsonError(error.message || "تعذر توليد رابط تسجيل الدخول.", 500);
    }

    const link = data?.properties?.action_link;
    if (!link) {
      return jsonError("تعذر استرداد رابط تسجيل الدخول.", 500);
    }

    return NextResponse.json({ ok: true, link, email: userProfile.email });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "تعذر توليد رابط التسجيل.",
      500,
    );
  }
}
