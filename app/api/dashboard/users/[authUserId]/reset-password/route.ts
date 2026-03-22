import { NextRequest, NextResponse } from "next/server";

import {
  MANAGED_USER_SELECT,
  buildManagedUserAccountCard,
  decorateManagedUsers,
  generateTemporaryPassword,
  normalizeManagedUserRecord,
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
  const { data, error } = await actorSupabase
    .from("managed_user_profiles")
    .select(MANAGED_USER_SELECT)
    .eq("auth_user_id", authUserId)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (error) {
    return jsonError(error.message || "تعذر تحميل الحساب المطلوب.", 500);
  }

  if (!data) {
    return jsonError("الحساب المطلوب غير موجود داخل المدرسة الحالية.", 404);
  }

  const user = normalizeManagedUserRecord(data as Record<string, unknown>);
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
    loginIdentifier: user.email,
    temporaryPassword,
  });

  const [decoratedUser] = await decorateManagedUsers(actorSupabase, [user]);
  if (!decoratedUser) {
    return jsonError("تعذر إعادة تحميل الحساب بعد إعادة تعيين كلمة المرور.", 500);
  }

  const accountCard = await buildManagedUserAccountCard(actorSupabase, decoratedUser);

  return NextResponse.json({
    ok: true,
    user: decoratedUser,
    accountCard,
  });
}
