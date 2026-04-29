import { NextRequest, NextResponse } from "next/server";
import { buildStudentInsertPayloads, getStudentImportValidationMessage, readStudentImportErrorMessage, studentImportRequestSchema } from "@/lib/api/student-import";
import { resolveBranchIdForWrite, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users/context";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  buildDuplicateStudentNameMessage,
  collectDuplicateStudentNames,
  findExistingDuplicateStudentNames,
} from "@/lib/students/import-dedup";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(request: NextRequest) {
  const rateLimited = await enforceRateLimit(request, {
    namespace: "students-bulk-import",
    windowMs: 60_000,
    maxHits: 12,
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

    const rawBody = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    // Extract rows from chunk OR from parseResult.validRows
    let rowsToImport: any[] = [];
    if (rawBody && typeof rawBody === 'object') {
      if (Array.isArray((rawBody as any).chunk) && (rawBody as any).chunk.length > 0) {
        rowsToImport = (rawBody as any).chunk;
      } else if ((rawBody as any).parseResult?.validRows && Array.isArray((rawBody as any).parseResult.validRows)) {
        rowsToImport = (rawBody as any).parseResult.validRows;
      }
    }

    if (rowsToImport.length === 0) {
      return jsonError("لا توجد صفوف صالحة للاستيراد", 400);
    }

    // Validate using the schema
    const parsed = studentImportRequestSchema.safeParse({ chunk: rowsToImport });
    if (!parsed.success) {
      return jsonError(getStudentImportValidationMessage(parsed.error), 400);
    }

    const branchScope = resolveBranchScope(
      actorContext.value,
      typeof rawBody?.branch_id === "string" ? rawBody.branch_id : null,
      "لا يمكنك استيراد بيانات داخل فرع غير مصرح لك به.",
    );
    if (!branchScope.ok) {
      return jsonError(branchScope.message, branchScope.status);
    }

    const writeBranch = resolveBranchIdForWrite(
      branchScope.value,
      typeof rawBody?.branch_id === "string" ? rawBody.branch_id : null,
    );
    if (!writeBranch.ok) {
      return jsonError(writeBranch.message, writeBranch.status);
    }

    const { actorSupabase, targetSchoolId } = actorContext.value;
    const fileDuplicates = collectDuplicateStudentNames(parsed.data.chunk);
    if (fileDuplicates.length > 0) {
      return jsonError(buildDuplicateStudentNameMessage({ fileDuplicates }), 409);
    }

    let existingStudentsQuery = actorSupabase
      .from("students")
      .select("full_name, status")
      .eq("school_id", targetSchoolId)
      .neq("status", "deleted");

    existingStudentsQuery = branchScope.value.branchIds.length > 0
      ? existingStudentsQuery.in("branch_id", branchScope.value.branchIds)
      : existingStudentsQuery;

    const { data: existingStudents, error: existingStudentsError } = await existingStudentsQuery;

    if (existingStudentsError) {
      return jsonError(existingStudentsError.message || "تعذر فحص أسماء الطلاب قبل الاستيراد.", 500);
    }

    const existingDuplicates = findExistingDuplicateStudentNames(
      parsed.data.chunk.map((row) => row.fullName),
      ((existingStudents ?? []) as Array<Record<string, unknown>>).map((row) =>
        typeof row.full_name === "string" ? row.full_name : null,
      ),
    );

    if (existingDuplicates.length > 0) {
      return jsonError(buildDuplicateStudentNameMessage({ existingDuplicates }), 409);
    }

    const validated = buildStudentInsertPayloads(
      parsed.data.chunk,
      targetSchoolId,
      writeBranch.value as string,
    );

    console.log(`[BulkImport] Processing ${validated.length} students for school ${targetSchoolId}`);

    // Debug: Check payload structure
    if (validated.length > 0) {
      const firstPayload = validated[0];
      console.log('[BulkImport] Payload structure (first row):', {
        hasClassId: 'classId' in firstPayload,
        classIdValue: (firstPayload as any).classId,
        hasClassName: 'className' in firstPayload,
        hasSection: 'section' in firstPayload,
        payloadKeys: Object.keys(firstPayload),
      });
    }

    const { data, error } = await actorSupabase
      .from("students")
      .insert(validated)
      .select("id");

    if (error) {
      console.error("[BulkImport] Insert error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      // Hide database details from user
      const userMessage = error.message?.includes("column")
        ? "خطأ في إعدادات النظام. يرجى مراجعة مسؤول النظام."
        : error.message || "فشل استيراد الطلاب";
      return jsonError(userMessage, 500);
    }

    const importedCount = data?.length ?? validated.length;
    const failedCount = validated.length - importedCount;
    console.log(`[BulkImport] Successfully imported ${importedCount}/${validated.length} students (${failedCount} failed)`);

    return NextResponse.json({
      success: true,
      imported: importedCount,
      failed: failedCount,
      total: validated.length,
      message: importedCount > 0
        ? `تم استيراد ${importedCount} من ${validated.length} طالب بنجاح${failedCount > 0 ? ` (فشل ${failedCount})` : ''}`
        : 'فشل الاستيراد',
      debug: {
        payloadStructure: validated.length > 0 ? {
          hasClassId: 'classId' in validated[0],
          classIdValue: (validated[0] as any).classId,
          payloadKeys: Object.keys(validated[0]),
        } : null,
        rowsSent: validated.length,
        rowsImported: importedCount,
        rowsFailed: failedCount,
      },
    });
  } catch (error) {
    console.error("Bulk import server error:", error);
    return jsonError(readStudentImportErrorMessage(error, "Import failed"), 500);
  }
}
