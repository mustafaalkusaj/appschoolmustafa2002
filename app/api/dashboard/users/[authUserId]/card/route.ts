import { NextRequest, NextResponse } from "next/server";

import {
  buildManagedUserAccountCard,
  fetchManagedUserByAuthUserId,
  fetchManagedUserCredentials,
  generateTemporaryPassword,
  markAccountCardPrinted,
  resolveManagedUsersActorContext,
  upsertManagedUserCredential,
} from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ authUserId: string }> },
) {
  const { authUserId } = await params;
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveManagedUsersActorContext(schoolId, req.headers.get("authorization"));

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, targetSchoolId } = context.value;
  let user: Awaited<ReturnType<typeof fetchManagedUserByAuthUserId>> = null;
  try {
    user = await fetchManagedUserByAuthUserId(actorSupabase, {
      authUserId,
      schoolId: targetSchoolId,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر تحميل الحساب المطلوب.", 500);
  }

  if (!user) {
    return jsonError("الحساب المطلوب غير موجود داخل المدرسة الحالية.", 404);
  }

  // Check if credentials have a plaintext password; auto-reset if missing so the card always shows a password
  const credMap = await fetchManagedUserCredentials(actorSupabase, [authUserId]);
  const cred = credMap.get(authUserId);
  let autoResetPassword: string | undefined;

  if (!cred?.temporary_password_plain) {
    autoResetPassword = generateTemporaryPassword();
    const serviceSupabase = createServiceSupabaseClient();
    const { error: authError } = await serviceSupabase.auth.admin.updateUserById(authUserId, {
      password: autoResetPassword,
    });
    if (authError) {
      return jsonError(authError.message || "تعذر إصدار كلمة مرور مؤقتة.", 500);
    }
    await upsertManagedUserCredential(actorSupabase, {
      authUserId,
      schoolId: targetSchoolId,
      loginIdentifier: cred?.login_identifier ?? user.email ?? "",
      temporaryPassword: autoResetPassword,
    });
  }

  const accountCard = await buildManagedUserAccountCard(actorSupabase, user, {
    ...(autoResetPassword ? { temporaryPassword: autoResetPassword } : {}),
  });
  await markAccountCardPrinted(actorSupabase, {
    authUserId,
    schoolId: targetSchoolId,
  });

  return NextResponse.json({
    ok: true,
    accountCard,
    user,
    ...(autoResetPassword ? { temporary_password: autoResetPassword } : {}),
  });
}
