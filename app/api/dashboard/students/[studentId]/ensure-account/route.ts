import { NextRequest, NextResponse } from "next/server";

import {
  buildManagedAuthIdentityPayload,
  buildManagedUserAccountCard,
  findManagedProfileByLinkedRecord,
  fetchManagedUserByAuthUserId,
  generateManagedLoginIdentifier,
  generateTemporaryPassword,
  persistManagedUserProfile,
  resolveManagedUsersActorContext,
  syncManagedAuthIdentityMetadata,
  syncStudentTeacherLinks,
  upsertManagedUserCredential,
} from "@/lib/managed-users-server";
import { createRouteSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";

type RouteSupabaseClient = Awaited<ReturnType<typeof createRouteSupabaseClient>>;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

async function ensureManagedProfile(options: {
  actorSupabase: RouteSupabaseClient;
  authUserId: string;
  schoolId: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  studentId: string;
  createdBy: string | null;
}) {
  try {
    await persistManagedUserProfile(options.actorSupabase, {
      mode: "insert",
      authUserId: options.authUserId,
      schoolId: options.schoolId,
      role: "student",
      fullName: options.fullName,
      email: options.email,
      phone: options.phone,
      isActive: options.isActive,
      studentId: options.studentId,
      createdBy: options.createdBy,
    });
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string }).code || "")
        : "";
    if (code !== "23505") {
      throw error;
    }

    await persistManagedUserProfile(options.actorSupabase, {
      mode: "update",
      authUserId: options.authUserId,
      schoolId: options.schoolId,
      role: "student",
      fullName: options.fullName,
      email: options.email,
      phone: options.phone,
      isActive: options.isActive,
      studentId: options.studentId,
      createdBy: options.createdBy,
    });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id : null;

  const context = await resolveManagedUsersActorContext(schoolId);
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const { data: student, error: studentError } = await actorSupabase
    .from("students")
    .select("id, full_name, phone, school_id, class_name, section, status, auth_user_id")
    .eq("id", studentId)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (studentError || !student?.id) {
    return jsonError("الطالب المطلوب غير موجود ضمن المدرسة الحالية.", 404);
  }

  const serviceSupabase = createServiceSupabaseClient();
  const studentName = typeof student.full_name === "string" ? student.full_name.trim() : "";
  if (!studentName) {
    return jsonError("لا يمكن إنشاء حساب تطبيق لطالب بلا اسم كامل.", 400);
  }

  const studentPhone = typeof student.phone === "string" ? student.phone : null;
  const studentSection = typeof student.section === "string" && student.section.trim() ? student.section.trim() : null;
  const isActive = student.status !== "deleted";

  let authUserId = typeof student.auth_user_id === "string" ? student.auth_user_id : null;
  let loginIdentifier = "";
  let createdNewAccount = false;

  try {
    if (!authUserId) {
      const existingManagedProfile = await findManagedProfileByLinkedRecord(actorSupabase, {
        schoolId: targetSchoolId,
        role: "student",
        relatedRecordId: studentId,
      });

      if (existingManagedProfile?.authUserId) {
        authUserId = existingManagedProfile.authUserId;

        const { error: relinkStudentError } = await actorSupabase
          .from("students")
          .update({ auth_user_id: authUserId })
          .eq("id", studentId)
          .eq("school_id", targetSchoolId);

        if (relinkStudentError) {
          return jsonError(relinkStudentError.message || "تعذر إعادة ربط حساب التطبيق الحالي بسجل الطالب.", 500);
        }
      }
    }

    if (!authUserId) {
      loginIdentifier = await generateManagedLoginIdentifier(actorSupabase, {
        schoolId: targetSchoolId,
        role: "student",
        fullName: studentName,
        preferredEmail: "",
      });
      const temporaryPassword = generateTemporaryPassword();

      const createdAt = new Date().toISOString();
      const authIdentityPayload = buildManagedAuthIdentityPayload({
        role: "student",
        schoolId: targetSchoolId,
        fullName: studentName,
        loginIdentifier,
        createdBy: actorUserId,
        credentialPatch: {
          temporaryPassword,
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
        return jsonError(createAuthError?.message || "تعذر إنشاء حساب التطبيق للطالب.", 500);
      }

      authUserId = createdUser.user.id;
      createdNewAccount = true;

      const { error: linkStudentError } = await actorSupabase
        .from("students")
        .update({ auth_user_id: authUserId })
        .eq("id", studentId);

      if (linkStudentError) {
        await serviceSupabase.auth.admin.deleteUser(authUserId);
        return jsonError(linkStudentError.message || "تعذر ربط الحساب بسجل الطالب.", 500);
      }

      await ensureManagedProfile({
        actorSupabase,
        authUserId,
        schoolId: targetSchoolId,
        fullName: studentName,
        email: loginIdentifier,
        phone: studentPhone,
        isActive,
        studentId,
        createdBy: actorUserId,
      });

      await upsertManagedUserCredential(actorSupabase, {
        authUserId,
        schoolId: targetSchoolId,
        loginIdentifier,
        temporaryPassword,
      });

      await syncManagedAuthIdentityMetadata({
        authUserId,
        role: "student",
        schoolId: targetSchoolId,
        fullName: studentName,
        loginIdentifier,
        createdBy: actorUserId,
        isActive,
      });
    }

    if (!authUserId) {
      return jsonError("تعذر تحديد حساب المصادقة لهذا الطالب.", 500);
    }

    const { data: authUserResponse, error: authUserError } = await serviceSupabase.auth.admin.getUserById(authUserId);
    if (authUserError || !authUserResponse.user) {
      return jsonError(authUserError?.message || "تعذر تحميل مستخدم المصادقة لهذا الطالب.", 500);
    }

    loginIdentifier = authUserResponse.user.email || loginIdentifier || "";
    if (!loginIdentifier) {
      loginIdentifier = await generateManagedLoginIdentifier(actorSupabase, {
        schoolId: targetSchoolId,
        role: "student",
        fullName: studentName,
        preferredEmail: "",
      });
    }

    if (!authUserResponse.user.email && loginIdentifier) {
      const { error: updateLoginIdentifierError } = await serviceSupabase.auth.admin.updateUserById(authUserId, {
        email: loginIdentifier,
        email_confirm: true,
      });

      if (updateLoginIdentifierError) {
        return jsonError(
          updateLoginIdentifierError.message || "تعذر تثبيت معرّف الدخول لحساب الطالب الحالي.",
          500,
        );
      }
    }

    await ensureManagedProfile({
      actorSupabase,
      authUserId,
      schoolId: targetSchoolId,
      fullName: studentName,
      email: loginIdentifier,
      phone: studentPhone,
      isActive,
      studentId,
      createdBy: actorUserId,
    });

    await syncManagedAuthIdentityMetadata({
      authUserId,
      role: "student",
      schoolId: targetSchoolId,
      fullName: studentName,
      loginIdentifier,
      createdBy: actorUserId,
      isActive,
    });

    let user = await fetchManagedUserByAuthUserId(actorSupabase, {
      authUserId,
      schoolId: targetSchoolId,
    });

    if (!user) {
      return jsonError("تعذر إعادة تحميل حساب الطالب بعد الربط.", 500);
    }

    let accountCard = null;

    try {
      accountCard = await buildManagedUserAccountCard(actorSupabase, user);
    } catch {
      const temporaryPassword = generateTemporaryPassword();
      const { error: updatePasswordError } = await serviceSupabase.auth.admin.updateUserById(authUserId, {
        password: temporaryPassword,
      });

      if (updatePasswordError) {
        return jsonError(updatePasswordError.message || "تعذر إصدار كلمة مرور مؤقتة لهذا الطالب.", 500);
      }

      await upsertManagedUserCredential(actorSupabase, {
        authUserId,
        schoolId: targetSchoolId,
        loginIdentifier,
        temporaryPassword,
      });

      user = await fetchManagedUserByAuthUserId(actorSupabase, {
        authUserId,
        schoolId: targetSchoolId,
      });

      if (!user) {
        return jsonError("تعذر تحميل الحساب بعد إصدار كلمة المرور المؤقتة.", 500);
      }

      accountCard = await buildManagedUserAccountCard(actorSupabase, user);
    }

    try {
      await syncStudentTeacherLinks(actorSupabase, {
        schoolId: targetSchoolId,
        studentId,
        className: typeof student.class_name === "string" ? student.class_name : "",
        section: studentSection,
      });
    } catch {
      // Do not block card generation on auto-link failures.
    }

    return NextResponse.json({
      ok: true,
      createdNewAccount,
      user,
      accountCard,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر تجهيز حساب التطبيق لهذا الطالب.", 500);
  }
}
