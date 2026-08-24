import { NextRequest, NextResponse } from "next/server";

import {
  buildManagedAuthIdentityPayload,
  buildManagedUserAccountCard,
  findManagedProfileByLinkedRecord,
  fetchManagedUserByAuthUserId,
  generateManagedLoginIdentifier,
  generateTemporaryPassword,
  hashPassword,
  resolveManagedUsersActorContext,
  syncManagedUserAccountState,
  syncStudentTeacherLinks,
  upsertManagedUserCredential,
} from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id : null;

  const context = await resolveManagedUsersActorContext(schoolId, req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = await enforceRateLimit(req, {
    namespace: "students-ensure-account",
    windowMs: 10 * 60_000,
    maxHits: 20,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

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
  let revealedPassword: string | null = null;

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
          return jsonError("تعذر إعادة ربط حساب التطبيق الحالي بسجل الطالب.", 500);
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
      revealedPassword = temporaryPassword;

      const createdAt = new Date().toISOString();
      const authIdentityPayload = buildManagedAuthIdentityPayload({
        role: "student",
        schoolId: targetSchoolId,
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
      // Supabase Auth requires an email — append @schoolapp.local to simple identifiers
      const authEmail = loginIdentifier.includes("@") ? loginIdentifier : `${loginIdentifier}@schoolapp.local`;
      const { data: createdUser, error: createAuthError } = await serviceSupabase.auth.admin.createUser({
        email: authEmail,
        password: temporaryPassword,
        email_confirm: true,
        ...authIdentityPayload,
      });

      if (createAuthError || !createdUser.user?.id) {
        return jsonError("تعذر إنشاء حساب التطبيق للطالب.", 500);
      }

      authUserId = createdUser.user.id;
      createdNewAccount = true;

      const { error: linkStudentError } = await actorSupabase
        .from("students")
        .update({ auth_user_id: authUserId })
        .eq("id", studentId)
        .eq("school_id", targetSchoolId);

      if (linkStudentError) {
        await serviceSupabase.auth.admin.deleteUser(authUserId);
        return jsonError("تعذر ربط الحساب بسجل الطالب.", 500);
      }

      await syncManagedUserAccountState(actorSupabase, {
        authUserId,
        schoolId: targetSchoolId,
        role: "student",
        fullName: studentName,
        email: loginIdentifier,
        phone: studentPhone,
        isActive,
        studentId,
        createdBy: actorUserId,
        temporaryPassword,
      });
    }

    if (!authUserId) {
      return jsonError("تعذر تحديد حساب المصادقة لهذا الطالب.", 500);
    }

    const { data: authUserResponse, error: authUserError } = await serviceSupabase.auth.admin.getUserById(authUserId);
    if (authUserError || !authUserResponse.user) {
      return jsonError("تعذر تحميل مستخدم المصادقة لهذا الطالب.", 500);
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
        return jsonError("تعذر تثبيت معرّف الدخول لحساب الطالب الحالي.", 500);
      }
    }

    await syncManagedUserAccountState(actorSupabase, {
      authUserId,
      schoolId: targetSchoolId,
      role: "student",
      fullName: studentName,
      email: loginIdentifier,
      phone: studentPhone,
      isActive,
      studentId,
      createdBy: actorUserId,
    });

    let user = await fetchManagedUserByAuthUserId(actorSupabase, {
      authUserId,
      schoolId: targetSchoolId,
    });

    if (!user) {
      return jsonError("تعذر إعادة تحميل حساب الطالب بعد الربط.", 500);
    }

    let accountCard: Awaited<ReturnType<typeof buildManagedUserAccountCard>> | null = null;

    try {
      accountCard = await buildManagedUserAccountCard(actorSupabase, user);
    } catch {
      const temporaryPassword = generateTemporaryPassword();
      revealedPassword = temporaryPassword;
      const { error: updatePasswordError } = await serviceSupabase.auth.admin.updateUserById(authUserId, {
        password: temporaryPassword,
      });

      if (updatePasswordError) {
        return jsonError("تعذر إصدار كلمة مرور مؤقتة لهذا الطالب.", 500);
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

      accountCard = await buildManagedUserAccountCard(actorSupabase, user, { temporaryPassword });
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
      // Include the plaintext password for one-time reveal (only when a new password was generated)
      temporary_password: revealedPassword,
    });
  } catch (error) {
    return jsonError("تعذر تجهيز حساب التطبيق لهذا الطالب.", 500);
  }
}
