import { NextRequest, NextResponse } from "next/server";

import {
  MANAGED_USER_INACTIVE_BAN_DURATION,
  validateUpdateManagedUserInput,
  type ManagedUserRecord,
} from "@/lib/managed-users";
import {
  MANAGED_USER_SELECT,
  decorateManagedUsers,
  normalizeManagedUserRecord,
  replaceTeacherAssignments,
  resolveManagedUsersActorContext,
} from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

function jsonError(message: string, status: number, fieldErrors?: Record<string, string>) {
  return NextResponse.json(
    {
      error: {
        message,
        ...(fieldErrors && Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
      },
    },
    { status },
  );
}

function getPostgrestStatus(error: { code?: string | null } | null | undefined, fallback = 500) {
  if (!error?.code) return fallback;
  if (error.code === "23505") return 409;
  if (error.code === "23503" || error.code === "23514") return 400;
  return fallback;
}

function mergeManagedUserPayload(existing: ManagedUserRecord, body: Record<string, unknown>) {
  const rawStudent = body.student as Record<string, unknown> | undefined;
  const rawTeacher = body.teacher as Record<string, unknown> | undefined;
  const emailOverride = typeof body.email === "string" && body.email.trim() ? body.email : existing.email;

  return {
    school_id: existing.school_id,
    role: body.role ?? existing.role,
    full_name: body.full_name ?? existing.full_name,
    email: emailOverride,
    phone: body.phone ?? existing.phone ?? "",
    is_active: typeof body.is_active === "boolean" ? body.is_active : existing.is_active,
    student:
      existing.role === "student"
        ? {
            class_name: rawStudent?.class_name ?? existing.student?.class_name ?? "",
            section: rawStudent?.section ?? existing.student?.section ?? "",
            address: rawStudent?.address ?? existing.student?.address ?? "",
            total_fee: rawStudent?.total_fee ?? existing.student?.total_fee ?? 0,
            paid_fee: rawStudent?.paid_fee ?? existing.student?.paid_fee ?? 0,
            discount_value: rawStudent?.discount_value ?? existing.student?.discount_value ?? 0,
          }
        : null,
    teacher:
      existing.role === "teacher"
        ? {
            specialization: rawTeacher?.specialization ?? existing.teacher?.specialization ?? "",
            notes: rawTeacher?.notes ?? existing.teacher?.notes ?? "",
            assignments:
              Array.isArray(rawTeacher?.assignments) && rawTeacher?.assignments.length > 0
                ? rawTeacher.assignments
                : existing.teacher?.assignments ?? [],
          }
        : null,
  };
}

function buildAuthMetadata(existing: ManagedUserRecord, overrides: { full_name: string; role?: string; school_id?: string }) {
  return {
    accountType: "managed_user",
    managedRole: overrides.role ?? existing.role,
    schoolId: overrides.school_id ?? existing.school_id,
    full_name: overrides.full_name,
  };
}

async function rollbackAuthUser(
  authUserId: string,
  existing: ManagedUserRecord,
) {
  const serviceSupabase = createServiceSupabaseClient();
  await serviceSupabase.auth.admin.updateUserById(authUserId, {
    email: existing.email,
    email_confirm: true,
    ban_duration: existing.is_active ? "none" : MANAGED_USER_INACTIVE_BAN_DURATION,
    user_metadata: buildAuthMetadata(existing, { full_name: existing.full_name }),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ authUserId: string }> },
) {
  const { authUserId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const requestedSchoolId = typeof body?.school_id === "string" ? body.school_id : null;

  const context = await resolveManagedUsersActorContext(requestedSchoolId);
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, targetSchoolId } = context.value;
  const { data: existingRecord, error: existingError } = await actorSupabase
    .from("managed_user_profiles")
    .select(MANAGED_USER_SELECT)
    .eq("auth_user_id", authUserId)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (existingError) {
    return jsonError(existingError.message || "تعذر تحميل الحساب المطلوب.", getPostgrestStatus(existingError));
  }

  if (!existingRecord) {
    return jsonError("الحساب المطلوب غير موجود أو خارج نطاق المدرسة الحالية.", 404);
  }

  const existing = normalizeManagedUserRecord(existingRecord as Record<string, unknown>);
  if (body?.role && body.role !== existing.role) {
    return jsonError("لا يمكن تغيير نوع الحساب بعد إنشائه.", 400, {
      role: "تعديل الدور غير مدعوم. أنشئ حساباً جديداً عند الحاجة.",
    });
  }

  const validation = validateUpdateManagedUserInput(mergeManagedUserPayload(existing, body ?? {}));
  if (!validation.ok) {
    return jsonError(
      "message" in validation ? validation.message : "تحقق من الحقول المطلوبة ثم أعد المحاولة.",
      400,
      "fieldErrors" in validation ? validation.fieldErrors : {},
    );
  }

  const serviceSupabase = createServiceSupabaseClient();
  const authUpdatePayload: Record<string, unknown> = {
    ban_duration: validation.value.is_active ? "none" : MANAGED_USER_INACTIVE_BAN_DURATION,
    user_metadata: buildAuthMetadata(existing, {
      full_name: validation.value.full_name,
      school_id: targetSchoolId,
      role: validation.value.role,
    }),
  };

  if (validation.value.email !== existing.email) {
    authUpdatePayload.email = validation.value.email;
    authUpdatePayload.email_confirm = true;
  }

  const { error: authError } = await serviceSupabase.auth.admin.updateUserById(authUserId, authUpdatePayload);
  if (authError) {
    const status = authError.message?.toLowerCase().includes("already") ? 409 : 400;
    return jsonError(authError.message || "تعذر تحديث حساب المصادقة.", status, {
      email: "تعذر حفظ البريد الإلكتروني المحدد.",
    });
  }

  const { error: profileError } = await actorSupabase
    .from("managed_user_profiles")
    .update({
      full_name: validation.value.full_name,
      email: validation.value.email,
      phone: validation.value.phone,
      is_active: validation.value.is_active,
    })
    .eq("auth_user_id", authUserId);

  if (profileError) {
    await rollbackAuthUser(authUserId, existing);
    return jsonError(profileError.message || "تعذر تحديث ملف الحساب.", getPostgrestStatus(profileError, 400));
  }

  if (existing.role === "student") {
    if (!existing.student?.id) {
      await rollbackAuthUser(authUserId, existing);
      await actorSupabase
        .from("managed_user_profiles")
        .update({
          full_name: existing.full_name,
          email: existing.email,
          phone: existing.phone,
          is_active: existing.is_active,
        })
        .eq("auth_user_id", authUserId);

      return jsonError("رابط سجل الطالب غير مكتمل لهذا الحساب.", 500);
    }

    const { error: studentError } = await actorSupabase
      .from("students")
      .update({
        full_name: validation.value.full_name,
        class_name: validation.value.student!.class_name,
        section: validation.value.student!.section || "",
        phone: validation.value.phone,
        address: validation.value.student!.address,
        total_fee: validation.value.student!.total_fee,
        paid_fee: validation.value.student!.paid_fee,
        discount_value: validation.value.student!.discount_value,
      })
      .eq("id", existing.student.id);

    if (studentError) {
      await rollbackAuthUser(authUserId, existing);
      await actorSupabase
        .from("managed_user_profiles")
        .update({
          full_name: existing.full_name,
          email: existing.email,
          phone: existing.phone,
          is_active: existing.is_active,
        })
        .eq("auth_user_id", authUserId);

      return jsonError(studentError.message || "تعذر تحديث بيانات الطالب المرتبطة.", getPostgrestStatus(studentError, 400));
    }
  }

  if (existing.role === "teacher") {
    if (!existing.teacher?.id) {
      await rollbackAuthUser(authUserId, existing);
      await actorSupabase
        .from("managed_user_profiles")
        .update({
          full_name: existing.full_name,
          email: existing.email,
          phone: existing.phone,
          is_active: existing.is_active,
        })
        .eq("auth_user_id", authUserId);

      return jsonError("رابط سجل المدرس غير مكتمل لهذا الحساب.", 500);
    }

    const { error: teacherError } = await actorSupabase
      .from("teachers")
      .update({
        full_name: validation.value.full_name,
        email: validation.value.email,
        phone: validation.value.phone,
        specialization: validation.value.teacher?.specialization,
        notes: validation.value.teacher?.notes,
        is_active: validation.value.is_active,
      })
      .eq("id", existing.teacher.id);

    if (teacherError) {
      await rollbackAuthUser(authUserId, existing);
      await actorSupabase
        .from("managed_user_profiles")
        .update({
          full_name: existing.full_name,
          email: existing.email,
          phone: existing.phone,
          is_active: existing.is_active,
        })
        .eq("auth_user_id", authUserId);

      return jsonError(teacherError.message || "تعذر تحديث بيانات المدرس المرتبطة.", getPostgrestStatus(teacherError, 400));
    }

    try {
      await replaceTeacherAssignments(actorSupabase, {
        schoolId: targetSchoolId,
        teacherId: existing.teacher.id,
        assignments: validation.value.teacher?.assignments ?? [],
      });
    } catch (assignmentError) {
      return jsonError(
        assignmentError instanceof Error ? assignmentError.message : "تعذر حفظ تكليفات المدرس.",
        400,
      );
    }
  }

  if (validation.value.email !== existing.email) {
    const { error: credentialError } = await actorSupabase
      .from("managed_user_credentials")
      .update({ login_identifier: validation.value.email })
      .eq("auth_user_id", authUserId);

    if (credentialError && !credentialError.message.toLowerCase().includes("could not find")) {
      return jsonError(credentialError.message || "تعذر تحديث معرّف دخول التطبيق.", 400);
    }
  }

  const { data: updatedUser, error: fetchError } = await actorSupabase
    .from("managed_user_profiles")
    .select(MANAGED_USER_SELECT)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (fetchError) {
    return jsonError(fetchError.message || "تم الحفظ لكن تعذر إعادة تحميل الحساب.", 500);
  }

  return NextResponse.json({
    ok: true,
    user: updatedUser
      ? (
          await decorateManagedUsers(actorSupabase, [
            normalizeManagedUserRecord(updatedUser as Record<string, unknown>),
          ])
        )[0] ?? null
      : null,
  });
}
