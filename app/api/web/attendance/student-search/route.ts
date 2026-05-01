import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function normalizeQuery(value: string | null) {
  return (value ?? "")
    .replace(/[\u0000-\u001F\u007F,()%]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const q = normalizeQuery(req.nextUrl.searchParams.get("q"));
  const className = normalizeQuery(req.nextUrl.searchParams.get("className")).slice(0, 60);
  const section = normalizeQuery(req.nextUrl.searchParams.get("section")).slice(0, 20);

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "بيانات الحضور متاحة ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "attendance-student-search",
    windowMs: 60_000,
    maxHits: 120,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  if (!q || q.length < 2) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const canViewAttendance = await routeUserHasPermission(
    context.value.actorSupabase,
    context.value.actorUserId,
    "view_attendance",
  );
  if (!canViewAttendance) {
    return jsonError("ليس لديك صلاحية البحث في بيانات الحضور.", 403);
  }

  let query = context.value.actorSupabase
    .from("students")
    .select("id, full_name, class_name, section")
    .eq("school_id", context.value.targetSchoolId)
    .neq("status", "deleted")
    .limit(20);

  // Branch admin: restrict to their branch only
  if (context.value.scopeLevel === "branch_user" && context.value.actorBranchId) {
    query = query.eq("branch_id", context.value.actorBranchId);
  }

  if (className) query = query.eq("class_name", className);
  if (section) query = query.eq("section", section);

  // Prefer server-side filtering to avoid leaking other-school rows.
  query = query.or(
    [
      `full_name.ilike.%${q}%`,
      `class_name.ilike.%${q}%`,
      `section.ilike.%${q}%`,
    ].join(","),
  );

  const { data, error } = await query.order("full_name", { ascending: true });

  if (error) {
    return jsonError(error.message || "تعذر البحث عن الطالب.", 500);
  }

  const items = (Array.isArray(data) ? data : [])
    .map((row) => ({
      id: String((row as Record<string, unknown>).id ?? ""),
      full_name: String((row as Record<string, unknown>).full_name ?? ""),
      class_name: String((row as Record<string, unknown>).class_name ?? ""),
      section: typeof (row as Record<string, unknown>).section === "string" ? ((row as Record<string, unknown>).section as string) : null,
    }))
    .filter((row) => row.id && row.full_name);

  return NextResponse.json({ ok: true, items });
}
