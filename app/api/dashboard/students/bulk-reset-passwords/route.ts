import { NextRequest, NextResponse } from "next/server";
import {
  resolveManagedUsersActorContext,
  generateTemporaryPassword,
  upsertManagedUserCredential,
  fetchManagedUserCredentials,
} from "@/lib/managed-users-server";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id : null;

  const context = await resolveManagedUsersActorContext(schoolId, req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من الصلاحيات.", 401);
  }

  const requestedBranchId =
    typeof body?.branch_id === "string" ? body.branch_id : null;
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "students-bulk-reset-passwords",
    windowMs: 60 * 60_000, // 1 hour
    maxHits: 3,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  const { actorSupabase, targetSchoolId } = context.value;
  const serviceSupabase = createServiceSupabaseClient();

  // Fetch all students with auth accounts in scope
  const { data: students, error } = await applyBranchScopeToQuery(
    serviceSupabase
      .from("students")
      .select("auth_user_id, full_name")
      .eq("school_id", targetSchoolId)
      .in("status", ["active", "graduated", "archived", "withdrawn"])
      .not("auth_user_id", "is", null)
      .order("class_name", { ascending: true })
      .order("full_name", { ascending: true })
      .limit(2000),
    branchScope.value,
  );

  if (error) {
    return jsonError("تعذر تحميل بيانات الطلاب.", 500);
  }

  const validStudents = (students ?? []).filter(
    (s): s is typeof s & { auth_user_id: string } => typeof s.auth_user_id === "string",
  );

  if (validStudents.length === 0) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  // Fetch existing login identifiers for all students
  const authUserIds = validStudents.map((s) => s.auth_user_id);
  const credentialsMap = await fetchManagedUserCredentials(serviceSupabase, authUserIds).catch(() => new Map());

  // Reset passwords in batches of 10 to avoid overwhelming auth service
  const BATCH_SIZE = 10;
  let successCount = 0;

  for (let i = 0; i < validStudents.length; i += BATCH_SIZE) {
    const batch = validStudents.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async (student) => {
        const temporaryPassword = generateTemporaryPassword();
        const { error: authError } = await serviceSupabase.auth.admin.updateUserById(
          student.auth_user_id,
          { password: temporaryPassword },
        );
        if (authError) return;

        const existingLoginIdentifier = credentialsMap.get(student.auth_user_id)?.login_identifier;
        if (!existingLoginIdentifier) return;

        await upsertManagedUserCredential(actorSupabase, {
          authUserId: student.auth_user_id,
          schoolId: targetSchoolId,
          loginIdentifier: existingLoginIdentifier,
          temporaryPassword,
        }).catch(() => { /* fire-and-forget: credential store failure must not abort the batch */ });

        successCount++;
      }),
    );
  }

  return NextResponse.json({ ok: true, count: successCount });
}
