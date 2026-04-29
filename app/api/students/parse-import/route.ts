import { NextRequest, NextResponse } from "next/server";
import { readStudentImportErrorMessage } from "@/lib/api/student-import";
import { resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users/context";
import { tableHasColumn } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { generateImportPreview } from "@/lib/students/import-engine";
import { loadXLSX } from "@/lib/xlsx-loader";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(request: NextRequest) {
  const rateLimited = await enforceRateLimit(request, {
    namespace: "students-parse-import",
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

    // Get file from request
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return jsonError("لم يتم تحميل ملف", 400);
    }

    if (!file.name.match(/\.(xlsx?|csv)$/i)) {
      return jsonError("الملف يجب أن يكون Excel (.xlsx, .xls) أو CSV", 400);
    }

    // Parse Excel file
    const XLSX = await loadXLSX();
    const buffer = await file.arrayBuffer();
    const wb = await XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);

    console.log(`[ParseImport] Loaded ${rows.length} rows from file ${file.name}`);

    if (rows.length === 0) {
      return jsonError("الملف فارغ أو لا يحتوي على بيانات", 400);
    }

    // Load classes for current school/branch
    const { actorSupabase, targetSchoolId } = actorContext.value;
    const classesHasBranchScope = await tableHasColumn(actorSupabase, "classes", "branch_id").catch(() => false);

    let classesQuery = actorSupabase
      .from("classes")
      .select(`
        id,
        nameAr,
        nameEn,
        gradeLevel,
        branch_id,
        school_id,
        academic_year_id
      `)
      .eq("school_id", targetSchoolId);

    if (classesHasBranchScope && branchScope.value.branchIds.length > 0) {
      classesQuery = branchScope.value.branchId
        ? classesQuery.eq("branch_id", branchScope.value.branchId)
        : classesQuery.in("branch_id", branchScope.value.branchIds);
    }

    const { data: classesData, error: classesError } = await classesQuery;

    if (classesError) {
      console.error("[ParseImport] Classes query error:", {
        code: classesError.code,
        message: classesError.message,
      });
      throw new Error("تعذر تحميل قائمة الصفوف.");
    }

    const classes = Array.isArray(classesData)
      ? classesData
          .map((classRow: any) => {
            return {
              id: classRow.id,
              nameAr: classRow.nameAr,
              nameEn: classRow.nameEn,
              gradeLevel: classRow.gradeLevel,
              schoolId: classRow.school_id || targetSchoolId,
              branchId: classRow.branch_id || branchScope.value.branchId || "",
              academicYearId: classRow.academic_year_id,
              sections: Array.isArray(classRow.sections) ? classRow.sections : [],
              sectionsCount: Array.isArray(classRow.sections) ? classRow.sections.length : 0,
            };
          })
          .sort((left, right) => String(left.nameAr || "").localeCompare(String(right.nameAr || ""), "ar"))
      : [];

    console.log(`[ParseImport] Loaded ${classes.length} classes`);
    console.log("[ParseImport] Classes detail:", classes.map(c => ({
      id: c.id,
      nameAr: c.nameAr,
      nameEn: c.nameEn,
      sections: c.sections.map((s: any) => s.name || s),
    })));

    // Extract unique classes/sections from Excel
    const excelClasses = new Set(rows.map((r: any) => r['الصف'] || r['class'] || r['Class']));
    const excelSections = new Set(rows.map((r: any) => r['الشعبة'] || r['section'] || r['Section']));

    console.log("[ParseImport] Excel data summary:", {
      totalRows: rows.length,
      headers: Object.keys(rows[0] || {}),
      uniqueClasses: Array.from(excelClasses),
      uniqueSections: Array.from(excelSections),
    });

    // Generate import preview
    const preview = generateImportPreview(
      rows as Record<string, unknown>[],
      classes,
      targetSchoolId,
      branchScope.value.branchId || "",
    );

    // Prepare response
    const invalidRowsPreview = preview.invalidRows.slice(0, 10).map(row => ({
      rowNumber: row.rowIndex,
      errors: row.errors,
    }));

    console.log(
      `[ParseImport] Preview: ${preview.validRows.length} valid, ${preview.invalidRows.length} invalid`,
    );

    if (preview.invalidRows.length > 0) {
      console.log("[ParseImport] First invalid row:", JSON.stringify(preview.invalidRows[0]));
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: preview.totalRows,
        validRows: preview.validRows.length,
        invalidRows: preview.invalidRows.length,
      },
      preview: {
        headerRowIndex: preview.headerRowIndex,
        detectedHeaders: preview.detectedHeaders,
        columnMapping: preview.columnMapping,
      },
      errors: invalidRowsPreview,
      debug: {
        timestamp: new Date().toISOString(),
        classesLoaded: classes.length,
        matchedClassesCount: preview.matchedClasses.size,
      },
    });
  } catch (error) {
    console.error("[ParseImport] Error:", error);
    return jsonError(readStudentImportErrorMessage(error, "تعذر تحليل الملف"), 500);
  }
}
