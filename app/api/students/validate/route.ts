import { NextRequest, NextResponse } from "next/server";
import { readStudentImportErrorMessage } from "@/lib/api/student-import";
import { resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users/context";
import { tableHasColumn } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(request: NextRequest) {
  const rateLimited = await enforceRateLimit(request, {
    namespace: "students-import-validate",
    windowMs: 60_000,
    maxHits: 30,
  });
  if (rateLimited) {
    return rateLimited;
  }

  try {
    const actorContext = await resolveSchoolScopedActorContext(
      null,
      {
        allowedRoles: ["admin", "super_admin"],
        roleDeniedMessage: "استيراد الطلاب متاح لمدير المدرسة فقط.",
      },
      request.headers.get("authorization"),
    );

    if (!actorContext.ok) {
      return jsonError(actorContext.message, actorContext.status);
    }

    const requestedBranchId =
      request.nextUrl.searchParams.get("branchId") ?? request.nextUrl.searchParams.get("branch_id");
    const branchScope = resolveBranchScope(
      actorContext.value,
      requestedBranchId,
      "لا يمكنك تحميل صفوف فرع غير مصرح لك به.",
    );
    if (!branchScope.ok) {
      return jsonError(branchScope.message, branchScope.status);
    }

    const { actorSupabase, targetSchoolId } = actorContext.value;
    const classesHasBranchScope = await tableHasColumn(actorSupabase, "classes", "branch_id").catch(() => false);

    let classesQuery = actorSupabase
      .from("classes")
      .select(`
        id,
        nameAr,
        nameEn,
        gradeLevel,
        sections (
          id,
          name
        )
      `)
      .eq("school_id", targetSchoolId);
    if (classesHasBranchScope && branchScope.value.branchIds.length > 0) {
      classesQuery = branchScope.value.branchId
        ? classesQuery.eq("branch_id", branchScope.value.branchId)
        : classesQuery.in("branch_id", branchScope.value.branchIds);
    }

    const { data: classesData, error: classesError } = await classesQuery;

    if (classesError) {
      console.error("[Validate] Classes query error:", {
        code: classesError.code,
        message: classesError.message,
        details: classesError.details,
        hint: classesError.hint,
      });
      throw new Error("تعذر تحميل قائمة الصفوف. يرجى مراجعة مسؤول النظام.");
    }

    console.log(`[Validate] Loaded ${Array.isArray(classesData) ? classesData.length : 0} classes for school ${targetSchoolId}`);

    const classes = Array.isArray(classesData)
      ? classesData
          .map((classRow) => ({
            id: classRow.id,
            nameAr: classRow.nameAr,
            nameEn: classRow.nameEn,
            gradeLevel: classRow.gradeLevel,
            // Provide 'name' for backward compatibility (use Arabic name)
            name: classRow.nameAr,
            sections: Array.isArray(classRow.sections)
              ? [...classRow.sections].sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""), "ar"))
              : [],
          }))
          .sort((left, right) => String(left.nameAr || "").localeCompare(String(right.nameAr || ""), "ar"))
      : [];

    return NextResponse.json({
      classes,
    }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Validation API error:", error);
    return jsonError(readStudentImportErrorMessage(error, "Failed to fetch validation data"), 500);
  }
}
