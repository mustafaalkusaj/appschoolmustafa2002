import { NextRequest, NextResponse } from "next/server";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function generateRandomPassword(length = 8): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
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

  const newPassword = generateRandomPassword(8);

  try {
    const serviceSupabase = createServiceSupabaseClient();
    const { error } = await serviceSupabase.auth.admin.updateUserById(normalizedUserId, {
      password: newPassword,
    });

    if (error) {
      return jsonError(error.message || "تعذر إعادة تعيين كلمة المرور.", 500);
    }

    return NextResponse.json({ ok: true, temporaryPassword: newPassword });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "تعذر إعادة تعيين كلمة المرور.",
      500,
    );
  }
}
