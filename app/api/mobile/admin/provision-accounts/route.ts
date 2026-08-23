import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users/context";
import {
  buildManagedAuthIdentityPayload,
  generateManagedLoginIdentifier,
  generateTemporaryPassword,
  hashPassword,
} from "@/lib/managed-users-server";
import { ensureManagedUserProfileLink } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

/**
 * POST /api/mobile/admin/provision-accounts
 *
 * Provisions Supabase Auth accounts for students and teachers
 * that were bulk-imported without auth credentials.
 *
 * Body: { school_id?: string; dry_run?: boolean }
 *   - school_id: resolved from actor context if omitted
 *   - dry_run: if true, returns counts without creating accounts
 *
 * Requires admin or super_admin role.
 */

interface ProvisionResult {
  id: string;
  full_name: string;
  role: "student" | "teacher";
  login_identifier: string;
  temporary_password: string;
  status: "provisioned" | "error";
  error?: string;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(request: NextRequest) {
  const rateLimited = await enforceRateLimit(request, {
    namespace: "provision-accounts",
    windowMs: 60_000,
    maxHits: 5,
  });
  if (rateLimited) return rateLimited;

  try {
    const rawBody = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    const actorContext = await resolveSchoolScopedActorContext(
      typeof rawBody?.school_id === "string" ? rawBody.school_id : null,
      {
        allowedRoles: ["admin", "super_admin"],
        roleDeniedMessage:
          "تزويد الحسابات متاح لمدير المدرسة أو المشرف العام فقط.",
      },
      request.headers.get("authorization"),
    );

    if (!actorContext.ok) {
      return jsonError(actorContext.message, actorContext.status);
    }

    const { actorSupabase, targetSchoolId, actorUserId } = actorContext.value;
    const dryRun = rawBody?.dry_run === true;

    // ── Fetch unprovisioned students ──────────────────────────────
    const { data: unprovisionedStudents, error: studentsError } =
      await actorSupabase
        .from("students")
        .select("id, full_name, phone, branch_id")
        .eq("school_id", targetSchoolId)
        .is("auth_user_id", null)
        .is("deleted_at", null);

    if (studentsError) {
      return jsonError(
        `خطأ في جلب الطلاب: ${studentsError.message}`,
        500,
      );
    }

    // ── Fetch unprovisioned teachers ─────────────────────────────
    const { data: unprovisionedTeachers, error: teachersError } =
      await actorSupabase
        .from("teachers")
        .select("id, full_name, phone, email, branch_id")
        .eq("school_id", targetSchoolId)
        .is("auth_user_id", null)
        .eq("is_active", true);

    if (teachersError) {
      return jsonError(
        `خطأ في جلب المدرسين: ${teachersError.message}`,
        500,
      );
    }

    const studentCount = unprovisionedStudents?.length ?? 0;
    const teacherCount = unprovisionedTeachers?.length ?? 0;

    // ── Dry-run mode ─────────────────────────────────────────────
    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dry_run: true,
        summary: {
          students_without_auth: studentCount,
          teachers_without_auth: teacherCount,
          total: studentCount + teacherCount,
        },
      });
    }

    if (studentCount + teacherCount === 0) {
      return NextResponse.json({
        ok: true,
        summary: {
          students_provisioned: 0,
          teachers_provisioned: 0,
          errors: 0,
          total: 0,
        },
        results: [],
        message: "جميع الطلاب والمدرسين لديهم حسابات مصادقة بالفعل.",
      });
    }

    const serviceSupabase = createServiceSupabaseClient();
    const results: ProvisionResult[] = [];
    let studentSuccess = 0;
    let teacherSuccess = 0;
    let errorCount = 0;

    // ── Provision students ───────────────────────────────────────
    for (const student of unprovisionedStudents ?? []) {
      try {
        const loginIdentifier = await generateManagedLoginIdentifier(
          actorSupabase,
          {
            schoolId: targetSchoolId,
            role: "student",
            fullName: student.full_name,
          },
        );

        const temporaryPassword = generateTemporaryPassword();
        const createdAt = new Date().toISOString();

        const authIdentityPayload = buildManagedAuthIdentityPayload({
          role: "student",
          schoolId: targetSchoolId,
          fullName: student.full_name,
          loginIdentifier,
          createdBy: actorUserId,
          credentialPatch: {
            temporaryPasswordHash: hashPassword(temporaryPassword),
            hasPendingSetup: true,
            passwordLastResetAt: createdAt,
            cardLastPrintedAt: null,
          },
        });

        const authEmail = `${loginIdentifier}@schoolapp.local`;

        const { data: authData, error: createAuthError } =
          await serviceSupabase.auth.admin.createUser({
            email: authEmail,
            password: temporaryPassword,
            email_confirm: true,
            ...authIdentityPayload,
          });

        if (createAuthError || !authData?.user) {
          errorCount++;
          results.push({
            id: student.id,
            full_name: student.full_name,
            role: "student",
            login_identifier: loginIdentifier,
            temporary_password: "",
            status: "error",
            error: createAuthError?.message ?? "فشل إنشاء حساب المصادقة",
          });
          continue;
        }

        const authUserId = authData.user.id;

        // Update student record + create managed profile in parallel
        const [linkResult, profileResult] = await Promise.allSettled([
          actorSupabase
            .from("students")
            .update({ auth_user_id: authUserId })
            .eq("id", student.id)
            .eq("school_id", targetSchoolId),
          ensureManagedUserProfileLink(actorSupabase, {
            authUserId,
            schoolId: targetSchoolId,
            role: "student",
            fullName: student.full_name,
            email: loginIdentifier,
            phone: student.phone ?? null,
            isActive: true,
            studentId: student.id,
            teacherId: null,
            createdBy: actorUserId,
          }),
        ]);

        // Store credential record
        await actorSupabase.from("managed_user_credentials").upsert(
          {
            auth_user_id: authUserId,
            school_id: targetSchoolId,
            login_identifier: loginIdentifier,
            temporary_password_hash: hashPassword(temporaryPassword),
            temporary_password_plain: temporaryPassword,
            has_pending_setup: true,
            password_last_reset_at: createdAt,
          },
          { onConflict: "auth_user_id" },
        );

        const linkFailed =
          linkResult.status === "rejected" ||
          (linkResult.status === "fulfilled" &&
            (linkResult.value as { error?: unknown }).error);
        const profileFailed = profileResult.status === "rejected";

        if (linkFailed || profileFailed) {
          errorCount++;
          results.push({
            id: student.id,
            full_name: student.full_name,
            role: "student",
            login_identifier: loginIdentifier,
            temporary_password: temporaryPassword,
            status: "error",
            error: "تم إنشاء حساب المصادقة لكن فشل ربط الملف الشخصي",
          });
          continue;
        }

        studentSuccess++;
        results.push({
          id: student.id,
          full_name: student.full_name,
          role: "student",
          login_identifier: loginIdentifier,
          temporary_password: temporaryPassword,
          status: "provisioned",
        });
      } catch (err) {
        errorCount++;
        results.push({
          id: student.id,
          full_name: student.full_name,
          role: "student",
          login_identifier: "",
          temporary_password: "",
          status: "error",
          error:
            err instanceof Error ? err.message : "خطأ غير متوقع أثناء التزويد",
        });
      }
    }

    // ── Provision teachers ────────────────────────────────────────
    for (const teacher of unprovisionedTeachers ?? []) {
      try {
        const loginIdentifier = await generateManagedLoginIdentifier(
          actorSupabase,
          {
            schoolId: targetSchoolId,
            role: "teacher",
            fullName: teacher.full_name,
            preferredEmail: teacher.email,
          },
        );

        const temporaryPassword = generateTemporaryPassword();
        const createdAt = new Date().toISOString();

        const authIdentityPayload = buildManagedAuthIdentityPayload({
          role: "teacher",
          schoolId: targetSchoolId,
          fullName: teacher.full_name,
          loginIdentifier,
          createdBy: actorUserId,
          credentialPatch: {
            temporaryPasswordHash: hashPassword(temporaryPassword),
            hasPendingSetup: true,
            passwordLastResetAt: createdAt,
            cardLastPrintedAt: null,
          },
        });

        // If teacher has a real email, use that; otherwise use managed format
        const authEmail = loginIdentifier.includes("@")
          ? loginIdentifier
          : `${loginIdentifier}@schoolapp.local`;

        const { data: authData, error: createAuthError } =
          await serviceSupabase.auth.admin.createUser({
            email: authEmail,
            password: temporaryPassword,
            email_confirm: true,
            ...authIdentityPayload,
          });

        if (createAuthError || !authData?.user) {
          errorCount++;
          results.push({
            id: teacher.id,
            full_name: teacher.full_name,
            role: "teacher",
            login_identifier: loginIdentifier,
            temporary_password: "",
            status: "error",
            error: createAuthError?.message ?? "فشل إنشاء حساب المصادقة",
          });
          continue;
        }

        const authUserId = authData.user.id;

        const [linkResult, profileResult] = await Promise.allSettled([
          actorSupabase
            .from("teachers")
            .update({ auth_user_id: authUserId })
            .eq("id", teacher.id)
            .eq("school_id", targetSchoolId),
          ensureManagedUserProfileLink(actorSupabase, {
            authUserId,
            schoolId: targetSchoolId,
            role: "teacher",
            fullName: teacher.full_name,
            email: loginIdentifier,
            phone: teacher.phone ?? null,
            isActive: true,
            studentId: null,
            teacherId: teacher.id,
            createdBy: actorUserId,
          }),
        ]);

        await actorSupabase.from("managed_user_credentials").upsert(
          {
            auth_user_id: authUserId,
            school_id: targetSchoolId,
            login_identifier: loginIdentifier,
            temporary_password_hash: hashPassword(temporaryPassword),
            temporary_password_plain: temporaryPassword,
            has_pending_setup: true,
            password_last_reset_at: createdAt,
          },
          { onConflict: "auth_user_id" },
        );

        const linkFailed =
          linkResult.status === "rejected" ||
          (linkResult.status === "fulfilled" &&
            (linkResult.value as { error?: unknown }).error);
        const profileFailed = profileResult.status === "rejected";

        if (linkFailed || profileFailed) {
          errorCount++;
          results.push({
            id: teacher.id,
            full_name: teacher.full_name,
            role: "teacher",
            login_identifier: loginIdentifier,
            temporary_password: temporaryPassword,
            status: "error",
            error: "تم إنشاء حساب المصادقة لكن فشل ربط الملف الشخصي",
          });
          continue;
        }

        teacherSuccess++;
        results.push({
          id: teacher.id,
          full_name: teacher.full_name,
          role: "teacher",
          login_identifier: loginIdentifier,
          temporary_password: temporaryPassword,
          status: "provisioned",
        });
      } catch (err) {
        errorCount++;
        results.push({
          id: teacher.id,
          full_name: teacher.full_name,
          role: "teacher",
          login_identifier: "",
          temporary_password: "",
          status: "error",
          error:
            err instanceof Error ? err.message : "خطأ غير متوقع أثناء التزويد",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      summary: {
        students_provisioned: studentSuccess,
        teachers_provisioned: teacherSuccess,
        errors: errorCount,
        total: studentSuccess + teacherSuccess + errorCount,
      },
      results,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message:
            err instanceof Error ? err.message : "خطأ داخلي في الخادم",
        },
      },
      { status: 500 },
    );
  }
}
