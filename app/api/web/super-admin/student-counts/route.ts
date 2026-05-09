import { NextRequest, NextResponse } from "next/server";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const { dataSupabase } = context.value;

  // Fetch student records grouped by school_id and branch_id
  const { data: studentsData, error: studentsError } = await dataSupabase
    .from("students")
    .select("school_id, branch_id", { count: "exact" })
    .neq("status", "deleted");

  if (studentsError) {
    return jsonError(studentsError.message || "تعذر تحميل بيانات الطلاب.", 500);
  }

  // Fetch schools
  const { data: schoolsData, error: schoolsError } = await dataSupabase
    .from("schools")
    .select("id, name");

  if (schoolsError) {
    return jsonError(schoolsError.message || "تعذر تحميل بيانات المدارس.", 500);
  }

  // Fetch branches
  const { data: branchesData, error: branchesError } = await dataSupabase
    .from("branches")
    .select("id, name, school_id");

  if (branchesError) {
    return jsonError(branchesError.message || "تعذر تحميل بيانات الفروع.", 500);
  }

  const students = (studentsData ?? []) as Array<{ school_id: string | null; branch_id: string | null }>;
  const schools = (schoolsData ?? []) as Array<{ id: string; name: string }>;
  const branches = (branchesData ?? []) as Array<{ id: string; name: string; school_id: string }>;

  // Build lookup maps
  const schoolNameById = new Map(schools.map((s) => [s.id, s.name]));
  const branchNameById = new Map(branches.map((b) => [b.id, b.name]));
  const branchesBySchool = new Map<string, Array<{ id: string; name: string }>>();
  for (const branch of branches) {
    const list = branchesBySchool.get(branch.school_id) ?? [];
    list.push({ id: branch.id, name: branch.name });
    branchesBySchool.set(branch.school_id, list);
  }

  // Count students per school and per branch
  const schoolTotals = new Map<string, number>();
  const branchTotals = new Map<string, number>();

  for (const student of students) {
    if (student.school_id) {
      schoolTotals.set(student.school_id, (schoolTotals.get(student.school_id) ?? 0) + 1);
    }
    if (student.branch_id) {
      branchTotals.set(student.branch_id, (branchTotals.get(student.branch_id) ?? 0) + 1);
    }
  }

  // Build result: iterate all schools that have either students or branches
  const allSchoolIds = new Set<string>([
    ...Array.from(schoolTotals.keys()),
    ...schools.map((s) => s.id),
  ]);

  const result = Array.from(allSchoolIds)
    .filter((schoolId) => schoolNameById.has(schoolId))
    .map((schoolId) => {
      const schoolBranches = branchesBySchool.get(schoolId) ?? [];
      const branchRows = schoolBranches.map((branch) => ({
        branch_id: branch.id,
        branch_name: branch.name,
        student_count: branchTotals.get(branch.id) ?? 0,
      }));

      return {
        school_id: schoolId,
        school_name: schoolNameById.get(schoolId) ?? "—",
        total_students: schoolTotals.get(schoolId) ?? 0,
        branches: branchRows,
      };
    })
    .sort((a, b) => b.total_students - a.total_students);

  const grandTotal = result.reduce((sum, s) => sum + s.total_students, 0);

  return NextResponse.json({ ok: true, schools: result, grand_total: grandTotal });
}
