import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

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

  let query = context.value.actorSupabase
    .from("students")
    .select("id, school_id, auth_user_id, full_name, class_name, section, status")
    .eq("school_id", context.value.targetSchoolId)
    .order("created_at", { ascending: false });

  if (status === "active") {
    query = query.in("status", ACTIVE_CARD_STATUSES);
  } else {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,class_name.ilike.%${search}%`);
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
