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
      .select(`id, grade, section, school_id, branch_id`)
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

    const classCount = Array.isArray(classesData) ? classesData.length : 0;
    console.log(`[Validate] Loaded ${classCount} classes for school ${targetSchoolId}`);

    const classes = Array.isArray(classesData)
      ? classesData
          .map((classRow: any) => {
            let parsedSections: Array<{ id: string; name: string }> = [];
            const sectionRaw = classRow.section;
            if (sectionRaw) {
              if (typeof sectionRaw === 'string') {
                try {
                  const parsed = JSON.parse(sectionRaw);
                  if (Array.isArray(parsed)) {
                    parsedSections = parsed.map((s: any, i: number) => ({
                      id: s.id || s.name || String(i),
                      name: s.name || String(s)
                    }));
                  }
                } catch {
                  parsedSections = sectionRaw.split(',').map((s, i) => ({
                    id: `${classRow.id}_${i}`,
                    name: s.trim()
                  }));
                }
              } else if (Array.isArray(sectionRaw)) {
                parsedSections = sectionRaw.map((s: any, i: number) => ({
                  id: s.id || s.name || String(i),
                  name: s.name || String(s)
                }));
              }
            }
            const sections = parsedSections.sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""), "ar"));
            const displayName = `الصف ${classRow.grade || ''}`;
            return {
              id: classRow.id,
              nameAr: displayName,
              nameEn: `Grade ${classRow.grade || ''}`,
              gradeLevel: classRow.grade || 0,
              branchId: classRow.branch_id || null,
              schoolId: classRow.school_id || targetSchoolId,
              academicYearId: null,
              name: displayName,
              sections,
              sectionsCount: sections.length,
            };
          })
          .sort((left, right) => String(left.nameAr || "").localeCompare(String(right.nameAr || ""), "ar"))
      : [];

    if (classCount > 0) {
      console.log('[Validate] First 3 classes:', classes.slice(0, 3).map((c: any) => ({
        id: c.id,
        nameAr: c.nameAr,
        nameEn: c.nameEn,
        gradeLevel: c.gradeLevel,
        branchId: c.branchId,
        schoolId: c.schoolId,
        academicYearId: c.academicYearId,
        sectionsCount: c.sectionsCount
      })));
    }

    return NextResponse.json({
      debug: {
        classesLoaded: classCount,
        timestamp: new Date().toISOString(),
      },
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
