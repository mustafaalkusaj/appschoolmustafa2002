import { NextRequest, NextResponse } from "next/server";

import {
  buildManagedUserAccountCard,
  fetchManagedUserByAuthUserId,
  generateTemporaryPassword,
  resolveManagedUsersActorContext,
  upsertManagedUserCredential,
} from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
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
  const context = await resolveManagedUsersActorContext(schoolId, req.headers.get("authorization"));

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = enforceRateLimit(req, {
    namespace: "managed-user-reset-password",
    windowMs: 10 * 60_000,
    maxHits: 10,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

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

  const accountCard = await buildManagedUserAccountCard(actorSupabase, user);

  return NextResponse.json({
    ok: true,
    user,
    accountCard,
  });
}
