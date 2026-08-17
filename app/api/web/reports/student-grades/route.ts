import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { jsonError } from "@/lib/route-utils";
import { generateStudentGradeReport } from "@/lib/reports/pdf-generator";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const studentId = url.searchParams.get("studentId");
  const schoolId = url.searchParams.get("schoolId");
  const locale = (url.searchParams.get("locale") === "en" ? "en" : "ar") as "ar" | "en";

  if (!studentId || !schoolId) {
    return jsonError("studentId and schoolId are required.", 400);
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

  const { data: student } = await applyBranchScopeToQuery(
    actorSupabase
      .from("students")
      .select("id, full_name, class_name, section")
      .eq("id", studentId)
      .eq("school_id", targetSchoolId)
      .is("deleted_at", null),
    branchScope.value,
  ).maybeSingle();

  if (!student) {
    return jsonError("Student not found.", 404);
  }

  // Fetch grades. The grades table has subject_id (FK -> subjects) and a free-text
  // `exam_type`; it has NO `status`/`grade_type_id`/`grade_types` relation —
  // selecting those errored and rendered an empty report.
  const { data: grades, error: gradesError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("grades")
      .select("id, subject_id, score, max_score, exam_type, subjects(name)")
      .eq("student_id", studentId)
      .eq("school_id", targetSchoolId)
      .order("created_at", { ascending: true }),
    branchScope.value,
  );

  if (gradesError) {
    // Same trap as the attendance report: an errored query is indistinguishable
    // from "this student has no grades" once it reaches the PDF.
    console.error("[reports/student-grades] grades query failed", {
      schoolId: targetSchoolId,
      studentId,
      error: gradesError,
    });
    return jsonError("تعذر تحميل درجات الطالب.", 500);
  }

  const entries = (grades ?? []).map((g: Record<string, unknown>) => {
    const subj = g.subjects as { name: string } | null;
    const examType = typeof g.exam_type === "string" ? g.exam_type : null;
    const score = Number(g.score) || 0;
    const maxScore = Number(g.max_score) || 0;
    return {
      subject_name: subj?.name ?? "—",
      grade_type_name: examType,
      score,
      max_score: maxScore,
      percentage: maxScore > 0 ? (score / maxScore) * 100 : 0,
      status: "",
    };
  });

  // Fetch school branding
  const { data: school } = await actorSupabase
    .from("schools")
    .select("name, logo_url, primary_color")
    .eq("id", targetSchoolId)
    .maybeSingle();

  const html = generateStudentGradeReport({
    studentName: student.full_name as string,
    className: student.class_name as string ?? "",
    sectionName: student.section as string ?? null,
    entries,
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
