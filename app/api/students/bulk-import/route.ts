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
import {
  buildManagedAuthIdentityPayload,
  generateManagedLoginIdentifier,
  generateTemporaryPassword,
  hashPassword,
  syncManagedUserAccountState,
} from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

interface ProvisionResult {
  studentId: string;
  studentName: string;
  authUserId: string | null;
  loginIdentifier: string | null;
  error: string | null;
}

async function provisionAuthForStudent(
  serviceSupabase: ReturnType<typeof createServiceSupabaseClient>,
  actorSupabase: ReturnType<typeof createServiceSupabaseClient>,
  studentId: string,
  studentName: string,
  schoolId: string,
  actorUserId: string,
): Promise<ProvisionResult> {
  try {
    const loginIdentifier = await generateManagedLoginIdentifier(actorSupabase, {
      schoolId,
      role: "student",
      fullName: studentName,
      preferredEmail: "",
    });
    const temporaryPassword = generateTemporaryPassword();
    const createdAt = new Date().toISOString();

    const authIdentityPayload = buildManagedAuthIdentityPayload({
      role: "student",
      schoolId,
      fullName: studentName,
      loginIdentifier,
      createdBy: actorUserId,
      credentialPatch: {
        temporaryPasswordHash: hashPassword(temporaryPassword),
        hasPendingSetup: true,
        passwordLastResetAt: createdAt,
        cardLastPrintedAt: null,
      },
    });

    const { data: createdUser, error: createAuthError } = await serviceSupabase.auth.admin.createUser({
      email: loginIdentifier,
      password: temporaryPassword,
      email_confirm: true,
      ...authIdentityPayload,
    });

    if (createAuthError || !createdUser.user?.id) {
      return {
        studentId,
        studentName,
        authUserId: null,
        loginIdentifier: null,
        error: createAuthError?.message || "تعذر إنشاء حساب المصادقة",
      };
    }

    const authUserId = createdUser.user.id;

    const { error: linkError } = await actorSupabase
      .from("students")
      .update({ auth_user_id: authUserId })
      .eq("id", studentId)
      .eq("school_id", schoolId);

    if (linkError) {
      await serviceSupabase.auth.admin.deleteUser(authUserId);
      return {
        studentId,
        studentName,
        authUserId: null,
        loginIdentifier: null,
        error: linkError.message || "تعذر ربط الحساب بسجل الطالب",
      };
    }

    await syncManagedUserAccountState(actorSupabase, {
      authUserId,
      schoolId,
      role: "student",
      fullName: studentName,
      email: loginIdentifier,
      phone: null,
      isActive: true,
      studentId,
      createdBy: actorUserId,
      temporaryPassword,
    });

    return {
      studentId,
      studentName,
      authUserId,
      loginIdentifier,
      error: null,
    };
  } catch (err) {
    return {
      studentId,
      studentName,
      authUserId: null,
      loginIdentifier: null,
      error: err instanceof Error ? err.message : "خطأ غير متوقع أثناء إنشاء الحساب",
    };
  }
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
    const rawBody = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    const actorContext = await resolveSchoolScopedActorContext(
      typeof rawBody?.school === "string"
        ? rawBody.school
        : typeof rawBody?.schoolId === "string"
          ? rawBody.schoolId
          : null,
      {
        allowedRoles: ["admin", "super_admin"],
        roleDeniedMessage: "استيراد الطلاب متاح لمدير المدرسة فقط.",
      },
      request.headers.get("authorization"),
    );

    if (!actorContext.ok) {
      return jsonError(actorContext.message, actorContext.status);
    }

    let rowsToImport: unknown[] = [];
    if (rawBody && typeof rawBody === 'object') {
      if (Array.isArray((rawBody as Record<string, unknown>).chunk) && ((rawBody as Record<string, unknown>).chunk as unknown[]).length > 0) {
        rowsToImport = (rawBody as Record<string, unknown>).chunk as unknown[];
      } else if (
        (rawBody as Record<string, unknown>).parseResult &&
        typeof (rawBody as Record<string, unknown>).parseResult === 'object' &&
        Array.isArray(((rawBody as Record<string, unknown>).parseResult as Record<string, unknown>)?.validRows)
      ) {
        rowsToImport = ((rawBody as Record<string, unknown>).parseResult as Record<string, unknown>).validRows as unknown[];
      }
    }

    if (rowsToImport.length === 0) {
      return jsonError("لا توجد صفوف صالحة للاستيراد", 400);
    }

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

    const { actorSupabase, targetSchoolId, actorUserId } = actorContext.value;
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

    const resolvedBranchId = writeBranch.value ?? branchScope.value.branchId;
    if (!resolvedBranchId) {
      return jsonError("تعذر تحديد الفرع الخاص بالمدرسة الحالية.", 400);
    }

    const validated = buildStudentInsertPayloads(
      parsed.data.chunk,
      targetSchoolId,
      resolvedBranchId,
    );

    const { data, error } = await actorSupabase
      .from("students")
      .insert(validated)
      .select("id, full_name");

    if (error) {
      return NextResponse.json(
        {
          error: {
            message: [error.message, error.details, error.hint]
              .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
              .join(" | ") || "فشل استيراد الطلاب",
            code: error.code ?? null,
          },
        },
        { status: 500 },
      );
    }

    const insertedStudents = data ?? [];
    const importedCount = insertedStudents.length;

    // Provision auth accounts for all inserted students
    const serviceSupabase = createServiceSupabaseClient();
    let accountsCreated = 0;
    let accountsFailed = 0;

    for (const student of insertedStudents) {
      const studentId = typeof student.id === "string" ? student.id : String(student.id);
      const studentName = typeof student.full_name === "string" ? student.full_name : "";

      if (!studentName) {
        accountsFailed++;
        continue;
      }

      const result = await provisionAuthForStudent(
        serviceSupabase,
        actorSupabase,
        studentId,
        studentName,
        targetSchoolId,
        actorUserId,
      );

      if (result.authUserId) {
        accountsCreated++;
      } else {
        accountsFailed++;
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedCount,
      failed: validated.length - importedCount,
      total: validated.length,
      accounts: {
        created: accountsCreated,
        failed: accountsFailed,
      },
      message: importedCount > 0
        ? `تم استيراد ${importedCount} طالب وإنشاء ${accountsCreated} حساب تطبيق`
        : "فشل الاستيراد",
    });
  } catch (error) {
    return jsonError(readStudentImportErrorMessage(error, "Import failed"), 500);
  }
}
