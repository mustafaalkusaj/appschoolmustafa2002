import { NextRequest, NextResponse } from "next/server";
import { readStudentImportErrorMessage } from "@/lib/api/student-import";
import { resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users/context";
import { tableHasColumn } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { generateImportPreview } from "@/lib/students/import-engine";
import { loadXLSX } from "@/lib/xlsx-loader";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

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
      request.nextUrl.searchParams.get("school") ?? request.nextUrl.searchParams.get("schoolId"),
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

    // Parse Excel file — use raw array mode to support files with title rows above headers
    const XLSX = await loadXLSX();
    const buffer = await file.arrayBuffer();
    const wb = await XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];

    // Get raw rows as arrays so we can find the real header row regardless of its position
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawRows = (XLSX.utils.sheet_to_json as any)(ws, { header: 1, defval: "" }) as unknown[][];

    if (rawRows.length === 0) {
      return jsonError("الملف فارغ أو لا يحتوي على بيانات", 400);
    }

    // Find header row: first row that has at least 2 recognizable column aliases
    // (search first 15 rows to handle files with title/logo rows at top)
    const { findColumnIndex: _findCol, COLUMN_ALIASES } = await import("@/lib/students/import-engine");
    const requiredFields = ["fullName", "className"] as const;

    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(15, rawRows.length); i++) {
      const rowCells = (rawRows[i] as unknown[]).map((v) => String(v ?? "").trim());
      const matchCount = requiredFields.filter((field) =>
        rowCells.some((cell) => {
          const aliases = COLUMN_ALIASES[field] ?? [];
          const cellNorm = cell.toLowerCase();
          return aliases.some((alias) => cellNorm === alias.toLowerCase() ||
            cellNorm.replace(/\s+/g, "") === alias.toLowerCase().replace(/\s+/g, ""));
        })
      ).length;
      if (matchCount >= 2) {
        headerRowIdx = i;
        break;
      }
    }

    // Build header→column map from detected header row
    const headerCells = (rawRows[headerRowIdx] as unknown[]).map((v) => String(v ?? "").trim());

    // Convert raw rows to objects using detected headers
    const rows = rawRows.slice(headerRowIdx).map((rawRow) => {
      const cells = rawRow as unknown[];
      const obj: Record<string, string> = {};
      headerCells.forEach((header, colIdx) => {
        if (header) obj[header] = String(cells[colIdx] ?? "").trim();
      });
      return obj;
    });

    if (rows.length <= 1) {
      return jsonError("الملف لا يحتوي على بيانات بعد رأس الأعمدة", 400);
    }

    // Load classes for current school/branch
    const { targetSchoolId } = actorContext.value;
    const adminSupabase = createServiceSupabaseClient();
    const classesHasBranchScope = await tableHasColumn(adminSupabase, "classes", "branch_id").catch(() => false);

    let classesQuery = adminSupabase
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
      console.error("[ParseImport] Classes query error:", {
        code: classesError.code,
        message: classesError.message,
      });
      throw new Error("تعذر تحميل قائمة الصفوف.");
    }

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
            const displayName =
              String(classRow.grade || "").trim() ||
              `الصف ${classRow.id}`;
            return {
              id: classRow.id,
              nameAr: displayName,
              nameEn: `Grade ${classRow.grade || ''}`,
              gradeLevel: classRow.grade || 0,
              schoolId: classRow.school_id || targetSchoolId,
              branchId: classRow.branch_id || branchScope.value.branchId || "",
              academicYearId: undefined,
              section: String(classRow.section || "").trim(),
              sections: parsedSections,
              sectionsCount: parsedSections.length,
            };
          })
          .sort((left, right) => String(left.nameAr || "").localeCompare(String(right.nameAr || ""), "ar"))
      : [];

    const classIds = classes.map((cls) => cls.id);
    let sectionsByClassId = new Map<string, Array<{ id: string; name: string }>>();
    if (classIds.length > 0) {
      const { data: sectionsData, error: sectionsError } = await adminSupabase
        .from("sections")
        .select("id, class_id, name")
        .in("class_id", classIds);

      if (!sectionsError && Array.isArray(sectionsData)) {
        sectionsByClassId = new Map();
        sectionsData.forEach((sectionRow: any) => {
          const classId = String(sectionRow.class_id || "");
          const section = {
            id: String(sectionRow.id || ""),
            name: String(sectionRow.name || "").trim(),
          };
          if (!sectionsByClassId.has(classId)) {
            sectionsByClassId.set(classId, []);
          }
          sectionsByClassId.get(classId)!.push(section);
        });
      }
    }

    const enrichedClasses = classes.map((cls) => {
      const dbSections = sectionsByClassId.get(cls.id) ?? [];
      return {
        ...cls,
        sections: dbSections.length > 0 ? dbSections : cls.sections,
        sectionsCount: dbSections.length > 0 ? dbSections.length : cls.sections.length,
      };
    });

    // Extract unique classes/sections from Excel

    // Generate import preview
    const preview = generateImportPreview(
      rows as Record<string, unknown>[],
      enrichedClasses,
      targetSchoolId,
      branchScope.value.branchId || "",
    );

    // Prepare response
    const invalidRowsPreview = preview.invalidRows.slice(0, 10).map(row => ({
      rowNumber: row.rowIndex,
      errors: row.errors,
    }));

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
      validRows: preview.validRows,
      errors: invalidRowsPreview,
      debug: {
        timestamp: new Date().toISOString(),
        classesLoaded: enrichedClasses.length,
        matchedClassesCount: preview.matchedClasses.size,
      },
    });
  } catch (error) {
    console.error("[ParseImport] Error:", error);
    return jsonError(readStudentImportErrorMessage(error, "تعذر تحليل الملف"), 500);
  }
}
