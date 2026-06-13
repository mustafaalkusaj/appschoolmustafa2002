import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { jsonError } from "@/lib/route-utils";
import { generateClassAttendanceReport } from "@/lib/reports/pdf-generator";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const className = url.searchParams.get("className");
  const section = url.searchParams.get("section") || "";
  const schoolId = url.searchParams.get("schoolId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const locale = (url.searchParams.get("locale") === "en" ? "en" : "ar") as "ar" | "en";

  if (!className || !schoolId || !from || !to) {
    return jsonError("className, schoolId, from, and to are required.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin", "employee"], roleDeniedMessage: "غير مصرح بالوصول." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "Unauthorized",
      "status" in context ? context.status : 403,
    );
  }

  const { actorSupabase, targetSchoolId } = context.value;

  const requestedBranchId = url.searchParams.get("branchId") ?? url.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  let query = applyBranchScopeToQuery(
    actorSupabase
      .from("attendance")
      .select("id, date, status, students!inner(full_name, class_name, section)")
      .eq("school_id", targetSchoolId)
      .gte("date", from)
      .lte("date", to),
    branchScope.value,
  );

  // Filter by class name via the joined students table
  query = query.eq("students.class_name", className);
  if (section) {
    query = query.eq("students.section", section);
  }

  const { data: records } = await query.order("date", { ascending: true });

  const rows = (records ?? []).map((r: Record<string, unknown>) => {
    const student = r.students as { full_name: string; class_name: string; section: string } | null;
    return {
      student_name: student?.full_name ?? "—",
      date: String(r.date ?? ""),
      status: String(r.status ?? ""),
    };
  });

  // Fetch school branding
  const { data: school } = await actorSupabase
    .from("schools")
    .select("name, logo_url, primary_color")
    .eq("id", targetSchoolId)
    .maybeSingle();

  const html = generateClassAttendanceReport({
    className,
    section,
    dateRange: { from, to },
    rows,
    locale,
    branding: {
      schoolName: (school?.name as string) ?? null,
      logoUrl: (school?.logo_url as string) ?? null,
      primaryColor: (school?.primary_color as string) ?? null,
    },
  });

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
