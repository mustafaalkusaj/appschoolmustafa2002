import { NextRequest, NextResponse } from "next/server";

import {
  MANAGED_USER_SELECT,
  buildManagedUserAccountCard,
  decorateManagedUsers,
  markAccountCardPrinted,
  normalizeManagedUserRecord,
  resolveManagedUsersActorContext,
} from "@/lib/managed-users-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ authUserId: string }> },
) {
  const { authUserId } = await params;
  const schoolId = req.nextUrl.searchParams.get("schoolId");
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

  const [user] = await decorateManagedUsers(actorSupabase, [
    normalizeManagedUserRecord(data as Record<string, unknown>),
  ]);

  if (!user) {
    return jsonError("تعذر تهيئة بيانات بطاقة الحساب.", 500);
  }

  const accountCard = await buildManagedUserAccountCard(actorSupabase, user);
  await markAccountCardPrinted(actorSupabase, authUserId);

  return NextResponse.json({
    ok: true,
    accountCard,
    user,
  });
}
