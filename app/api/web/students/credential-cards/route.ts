import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { buildSafeOrFilter } from "@/lib/supabase-query-helpers";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

const ACTIVE_CARD_STATUSES = ["active", "graduated", "archived", "withdrawn"];

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const status = req.nextUrl.searchParams.get("status")?.trim() || "active";
  const search = req.nextUrl.searchParams.get("search")?.trim() || "";
  const className = req.nextUrl.searchParams.get("className")?.trim() || "";
  const section = req.nextUrl.searchParams.get("section")?.trim() || "";

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "طباعة بطاقات الدخول متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const requestedBranchId = req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorUserId } = context.value;
  const rateLimited = await enforceRateLimit(req, {
    namespace: "credential-cards",
    windowMs: 60_000,
    maxHits: 10,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  let query = applyBranchScopeToQuery(
    context.value.actorSupabase
      .from("students")
      .select("id, school_id, auth_user_id, full_name, class_name, section, status")
      .eq("school_id", context.value.targetSchoolId),
    branchScope.value,
  ).order("created_at", { ascending: false });

  if (status === "active") {
    query = query.in("status", ACTIVE_CARD_STATUSES);
  } else {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(buildSafeOrFilter(["full_name", "class_name"], search));
  }

  if (className) {
    query = query.eq("class_name", className);
  }

  if (section) {
    query = query.eq("section", section);
  }

  const { data, error } = await query;
  if (error) {
    return jsonError(error.message || "تعذر تحميل بيانات بطاقات الدخول.", 500);
  }

  return NextResponse.json({
    ok: true,
    students: data ?? [],
  });
}
