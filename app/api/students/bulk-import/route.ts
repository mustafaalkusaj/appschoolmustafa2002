import { NextRequest, NextResponse } from "next/server";
import { buildStudentInsertPayloads, getStudentImportValidationMessage, readStudentImportErrorMessage, studentImportRequestSchema } from "@/lib/api/student-import";
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

    const parsed = studentImportRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return jsonError(getStudentImportValidationMessage(parsed.error), 400);
    }

    const { actorSupabase, targetSchoolId } = actorContext.value;
    const fileDuplicates = collectDuplicateStudentNames(parsed.data.chunk);
    if (fileDuplicates.length > 0) {
      return jsonError(buildDuplicateStudentNameMessage({ fileDuplicates }), 409);
    }

    const { data: existingStudents, error: existingStudentsError } = await actorSupabase
      .from("students")
      .select("full_name, status")
      .eq("school_id", targetSchoolId)
      .neq("status", "deleted");

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

    const validated = buildStudentInsertPayloads(parsed.data.chunk, targetSchoolId);
    const { data, error } = await actorSupabase
      .from("students")
      .insert(validated)
      .select("id");

    if (error) {
      console.error("Bulk import insert error:", error);
      return jsonError(error.message, 500);
    }

    return NextResponse.json({
      success: true,
      imported: data?.length ?? validated.length,
    });
  } catch (error) {
    console.error("Bulk import server error:", error);
    return jsonError(readStudentImportErrorMessage(error, "Import failed"), 500);
  }
}
