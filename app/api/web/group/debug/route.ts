import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { jsonError } from "@/lib/route-utils";

export async function GET(req: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    null,
    {
      allowedRoles: ["admin"],
      roleDeniedMessage: "Unauthorized",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError("Not authorized", 403);
  }

  if (context.value.scopeLevel !== "group_admin") {
    return jsonError("Only group admins can access this", 403);
  }

  const { actorSupabase, targetSchoolId, actorUserId } = context.value;

  try {
    // Get school and group info
    const { data: school, error: schoolError } = await actorSupabase
      .from("schools")
      .select("id, name, group_id")
      .eq("id", targetSchoolId)
      .maybeSingle();

    if (schoolError || !school) {
      return jsonError("School not found", 404);
    }

    const groupId = school.group_id;

    // Get branches
    const { data: branches, error: branchesError } = await actorSupabase
      .from("branches")
      .select("id, name, group_id, school_id")
      .eq("group_id", groupId)
      .order("name", { ascending: true });

    // Get students
    const { data: students, error: studentsError } = await actorSupabase
      .from("students")
      .select("id, school_id, branch_id, full_name")
      .eq("school_id", targetSchoolId)
      .neq("status", "deleted")
      .limit(20);

    const studentsWithBranch = students?.filter((s) => s.branch_id)?.length ?? 0;
    const studentsWithoutBranch = (students?.length ?? 0) - studentsWithBranch;

    // Get the specific branches that students reference
    const studentBranchIds = students
      ?.filter((s) => s.branch_id)
      .map((s) => s.branch_id)
      .filter((v, i, a) => a.indexOf(v) === i) ?? [];

    let referencedBranches: any[] = [];
    if (studentBranchIds.length > 0) {
      const { data: refBranches } = await actorSupabase
        .from("branches")
        .select("id, name, group_id, school_id")
        .in("id", studentBranchIds);
      referencedBranches = refBranches ?? [];
    }

    return NextResponse.json({
      user: {
        id: actorUserId,
        scope: context.value.scopeLevel,
      },
      school: {
        id: school.id,
        name: school.name,
        groupId: school.group_id,
      },
      branches: {
        count: branches?.length ?? 0,
        data: branches ?? [],
        error: branchesError?.message,
      },
      referencedBranches: {
        count: referencedBranches.length,
        data: referencedBranches,
        note: "Branches that students actually reference by branch_id",
      },
      students: {
        totalCount: students?.length ?? 0,
        withBranchId: studentsWithBranch,
        withoutBranchId: studentsWithoutBranch,
        sample: students ?? [],
        error: studentsError?.message,
      },
      summary: {
        message: "Debug data for group overview",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: "Server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
