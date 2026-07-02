import { NextRequest, NextResponse } from "next/server";
import { resolveManagedUsersActorContext, fetchManagedUserCredentials } from "@/lib/managed-users-server";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

export type BulkCardItem = {
  auth_user_id: string;
  full_name: string;
  class_name: string | null;
  section: string | null;
  login_identifier: string | null;
  password: string | null;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveManagedUsersActorContext(schoolId, req.headers.get("authorization"));

  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من الصلاحيات.", 401);
  }

  const requestedBranchId = req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "students-bulk-cards",
    windowMs: 60_000,
    maxHits: 10,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  const { targetSchoolId } = context.value;
  const dataSupabase = createServiceSupabaseClient();

  // Fetch students with auth_user_id
  type StudentRow = { auth_user_id: string | null; full_name: string; class_name: string | null; section: string | null };
  const { data: students, error } = (await applyBranchScopeToQuery(
    dataSupabase
      .from("students")
      .select("auth_user_id, full_name, class_name, section")
      .eq("school_id", targetSchoolId)
      .in("status", ["active", "graduated", "archived", "withdrawn"])
      .not("auth_user_id", "is", null)
      .order("class_name", { ascending: true })
      .order("full_name", { ascending: true })
      .limit(2000),
    branchScope.value,
  )) as { data: StudentRow[] | null; error: { message: string } | null };

  if (error) {
    return jsonError("تعذر تحميل بيانات الطلاب.", 500);
  }

  const validStudents = (students ?? []).filter(
    (s): s is typeof s & { auth_user_id: string } => typeof s.auth_user_id === "string",
  );

  if (validStudents.length === 0) {
    return NextResponse.json({ ok: true, cards: [] });
  }

  // Fetch login identifiers in bulk
  const authUserIds = validStudents.map((s) => s.auth_user_id);
  const credentialsMap = await fetchManagedUserCredentials(dataSupabase, authUserIds).catch(() => new Map());

  const cards: BulkCardItem[] = validStudents.map((s) => {
    const cred = credentialsMap.get(s.auth_user_id);
    return {
      auth_user_id: s.auth_user_id,
      full_name: s.full_name ?? "",
      class_name: s.class_name ?? null,
      section: s.section ?? null,
      login_identifier: cred?.login_identifier ?? null,
      password: cred?.temporary_password_plain ?? null,
    };
  });

  return NextResponse.json({ ok: true, cards });
}
