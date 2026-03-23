import { NextRequest, NextResponse } from "next/server";

import {
  buildManagedUserAccountCard,
  fetchManagedUserByAuthUserId,
  generateTemporaryPassword,
  resolveManagedUsersActorContext,
  upsertManagedUserCredential,
} from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ authUserId: string }> },
) {
  const { authUserId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id : null;
  const context = await resolveManagedUsersActorContext(schoolId);

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, targetSchoolId } = context.value;
  let user = null;
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

  const temporaryPassword = generateTemporaryPassword();
  const serviceSupabase = createServiceSupabaseClient();
  const { error: authError } = await serviceSupabase.auth.admin.updateUserById(authUserId, {
    password: temporaryPassword,
  });

  if (authError) {
    return jsonError(authError.message || "تعذر إعادة تعيين كلمة المرور المؤقتة.", 500);
  }

  await upsertManagedUserCredential(actorSupabase, {
    authUserId,
    schoolId: targetSchoolId,
    loginIdentifier: user.app_account?.login_identifier ?? user.email,
    temporaryPassword,
  });

  const refreshedUser = await fetchManagedUserByAuthUserId(actorSupabase, {
    authUserId,
    schoolId: targetSchoolId,
  });
  if (!refreshedUser) {
    return jsonError("تعذر إعادة تحميل الحساب بعد إعادة تعيين كلمة المرور.", 500);
  }

  const accountCard = await buildManagedUserAccountCard(actorSupabase, refreshedUser);

  return NextResponse.json({
    ok: true,
    user: refreshedUser,
    accountCard,
  });
}
