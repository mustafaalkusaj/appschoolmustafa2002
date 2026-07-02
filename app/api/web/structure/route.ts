import { NextRequest, NextResponse } from "next/server";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { jsonError, jsonCached } from "@/lib/route-utils";

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "عرض هيكل الصفوف متاح ضمن نطاق المدرسة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const requestedBranchId =
    req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;

  try {
    // classes carry branch_id, so scope them directly.
    const { data: classRows, error: classesError } = await applyBranchScopeToQuery(
      actorSupabase
        .from("classes")
        .select("id, name")
        .eq("school_id", targetSchoolId)
        .order("name"),
      branchScope.value,
    );
    if (classesError) {
      return jsonError("تعذر تحميل هيكل الصفوف.", 500);
    }

    const classes = classRows ?? [];
    const classIds = classes.map((row) => String((row as { id: unknown }).id));

    // sections have no branch_id — scope them through their parent class ids
    // so a branch-restricted employee only sees sections of in-branch classes.
    let sections: unknown[] = [];
    if (classIds.length > 0) {
      const { data: sectionRows, error: sectionsError } = await actorSupabase
        .from("sections")
        .select("id, name, class_id")
        .eq("school_id", targetSchoolId)
        .in("class_id", classIds)
        .order("name");
      if (sectionsError) {
        return jsonError("تعذر تحميل هيكل الصفوف.", 500);
      }
      sections = sectionRows ?? [];
    }

    return jsonCached({ classes, sections }, 60, 120);
  } catch {
    return jsonError("تعذر تحميل هيكل الصفوف.", 500);
  }
}
