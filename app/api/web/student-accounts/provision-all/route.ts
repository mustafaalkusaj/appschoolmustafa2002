import { NextRequest, NextResponse } from "next/server";
import {
  buildManagedAuthIdentityPayload,
  generateManagedLoginIdentifier,
  generateTemporaryPassword,
  hashPassword,
  resolveSchoolScopedActorContext,
  syncManagedUserAccountState,
} from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(request: NextRequest) {
  const rateLimited = await enforceRateLimit(request, {
    namespace: "students-provision-all",
    windowMs: 5 * 60_000,
    maxHits: 5,
  });
  if (rateLimited) return rateLimited;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  const context = await resolveSchoolScopedActorContext(
    typeof body?.schoolId === "string" ? body.schoolId : null,
    {
      allowedRoles: ["admin", "super_admin"],
      roleDeniedMessage: "إنشاء حسابات الطلبة متاح لمدير المدرسة فقط.",
    },
    request.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const serviceSupabase = createServiceSupabaseClient();

  const { data: studentsWithout, error: fetchError } = await serviceSupabase
    .from("students")
    .select("id, full_name, phone")
    .eq("school_id", targetSchoolId)
    .eq("status", "active")
    .is("deleted_at", null)
    .is("auth_user_id", null);

  if (fetchError) {
    return jsonError("تعذر جلب قائمة الطلبة بدون حسابات.", 500);
  }

  const studentsToProvision = (studentsWithout ?? []).filter(
    (s) => typeof s.full_name === "string" && (s.full_name as string).trim(),
  );

  if (studentsToProvision.length === 0) {
    return NextResponse.json({ ok: true, created: 0, failed: 0, message: "جميع الطلبة لديهم حسابات بالفعل." });
  }

  let created = 0;
  const failed: Array<{ studentId: string; name: string; reason: string }> = [];

  const CONCURRENCY = 10;

  const createAccount = async (student: { id: string; full_name: unknown; phone: unknown }) => {
    const fullName = (student.full_name as string).trim();
    const phone = typeof student.phone === "string" ? student.phone : null;

    const loginIdentifier = await generateManagedLoginIdentifier(actorSupabase, {
      schoolId: targetSchoolId,
      role: "student",
      fullName,
      preferredEmail: "",
    });
    const temporaryPassword = generateTemporaryPassword();
    const createdAt = new Date().toISOString();

    const authIdentityPayload = buildManagedAuthIdentityPayload({
      role: "student",
      schoolId: targetSchoolId,
      fullName,
      loginIdentifier,
      createdBy: actorUserId,
      credentialPatch: {
        temporaryPasswordHash: hashPassword(temporaryPassword),
        hasPendingSetup: true,
        passwordLastResetAt: createdAt,
        cardLastPrintedAt: null,
      },
    });

    const authEmail = loginIdentifier.includes("@") ? loginIdentifier : `${loginIdentifier}@schoolapp.local`;

    const { data: createdUser, error: createError } = await serviceSupabase.auth.admin.createUser({
      email: authEmail,
      password: temporaryPassword,
      email_confirm: true,
      ...authIdentityPayload,
    });

    if (createError || !createdUser.user?.id) {
      failed.push({ studentId: student.id, name: fullName, reason: createError?.message ?? "فشل إنشاء الحساب" });
      return;
    }

    const authUserId = createdUser.user.id;

    const { error: linkError } = await serviceSupabase
      .from("students")
      .update({ auth_user_id: authUserId })
      .eq("id", student.id)
      .eq("school_id", targetSchoolId);

    if (linkError) {
      await serviceSupabase.auth.admin.deleteUser(authUserId);
      failed.push({ studentId: student.id, name: fullName, reason: "فشل ربط الحساب" });
      return;
    }

    await syncManagedUserAccountState(actorSupabase, {
      authUserId,
      schoolId: targetSchoolId,
      role: "student",
      fullName,
      email: loginIdentifier,
      phone,
      isActive: true,
      studentId: student.id,
      temporaryPassword,
    });

    created++;
  };

  for (let i = 0; i < studentsToProvision.length; i += CONCURRENCY) {
    const batch = studentsToProvision.slice(i, i + CONCURRENCY);
    await Promise.allSettled(batch.map((s) => createAccount(s)));
  }

  return NextResponse.json({
    ok: true,
    created,
    failed: failed.length,
    total: studentsToProvision.length,
    ...(failed.length > 0 && { failed_details: failed }),
  });
}
