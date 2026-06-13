import { NextRequest, NextResponse } from "next/server";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

const ACTIVE_STATUSES = ["active", "graduated", "suspended", "withdrawn"];

export async function GET(req: NextRequest) {
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const { dataSupabase } = context.value;

  // Fetch all non-deleted students with their status
  const { data: studentsData, error: studentsError } = await dataSupabase
    .from("students")
    .select("school_id, branch_id, status")
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

  type StudentRow = { school_id: string | null; branch_id: string | null; status: string | null };
  const students = (studentsData ?? []) as StudentRow[];
  const schools  = (schoolsData  ?? []) as Array<{ id: string; name: string }>;
  const branches = (branchesData ?? []) as Array<{ id: string; name: string; school_id: string }>;

  // Build lookup maps
  const schoolNameById = new Map(schools.map((s) => [s.id, s.name]));
  const branchesBySchool = new Map<string, Array<{ id: string; name: string }>>();
  for (const branch of branches) {
    const list = branchesBySchool.get(branch.school_id) ?? [];
    list.push({ id: branch.id, name: branch.name });
    branchesBySchool.set(branch.school_id, list);
  }

  // Count active and transferred per school and per branch
  const schoolActive      = new Map<string, number>();
  const schoolTransferred = new Map<string, number>();
  const branchActive      = new Map<string, number>();
  const branchTransferred = new Map<string, number>();

  for (const student of students) {
    const isActive      = ACTIVE_STATUSES.includes(student.status ?? "");
    const isTransferred = student.status === "transferred";

    if (student.school_id) {
      if (isActive)      schoolActive.set(student.school_id,      (schoolActive.get(student.school_id)      ?? 0) + 1);
      if (isTransferred) schoolTransferred.set(student.school_id, (schoolTransferred.get(student.school_id) ?? 0) + 1);
    }
    if (student.branch_id) {
      if (isActive)      branchActive.set(student.branch_id,      (branchActive.get(student.branch_id)      ?? 0) + 1);
      if (isTransferred) branchTransferred.set(student.branch_id, (branchTransferred.get(student.branch_id) ?? 0) + 1);
    }
  }

  // Build result
  const allSchoolIds = new Set<string>([
    ...Array.from(schoolActive.keys()),
    ...Array.from(schoolTransferred.keys()),
    ...schools.map((s) => s.id),
  ]);

  const result = Array.from(allSchoolIds)
    .filter((id) => schoolNameById.has(id))
    .map((schoolId) => {
      const active      = schoolActive.get(schoolId)      ?? 0;
      const transferred = schoolTransferred.get(schoolId) ?? 0;

      const branchRows = (branchesBySchool.get(schoolId) ?? []).map((branch) => ({
        branch_id:   branch.id,
        branch_name: branch.name,
        active:      branchActive.get(branch.id)      ?? 0,
        transferred: branchTransferred.get(branch.id) ?? 0,
      }));

      return {
        school_id:    schoolId,
        school_name:  schoolNameById.get(schoolId) ?? "—",
        active,
        transferred,
        total_students: active + transferred,
        branches: branchRows,
      };
    })
    .sort((a, b) => b.total_students - a.total_students);

  const grandTotal      = result.reduce((s, x) => s + x.total_students, 0);
  const grandActive     = result.reduce((s, x) => s + x.active,         0);
  const grandTransferred = result.reduce((s, x) => s + x.transferred,    0);

  return NextResponse.json({
    ok: true,
    schools: result,
    grand_total:       grandTotal,
    grand_active:      grandActive,
    grand_transferred: grandTransferred,
  });
}
