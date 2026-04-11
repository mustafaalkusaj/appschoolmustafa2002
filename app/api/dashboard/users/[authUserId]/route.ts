import { NextRequest, NextResponse } from "next/server";

import { isMissingTableError } from "@/lib/admin-infrastructure";
import {
  MANAGED_USER_INACTIVE_BAN_DURATION,
  validateUpdateManagedUserInput,
  type ManagedUserRecord,
} from "@/lib/managed-users";
import {
  ensureManagedUserProfileLink,
  fetchManagedUserByAuthUserId,
  getTeacherTableCapabilities,
  replaceTeacherAssignments,
  resolveManagedUsersActorContext,
  syncManagedAuthIdentityMetadata,
  syncManagedUserAccountState,
  type ManagedUsersActorContext,
  updateManagedUserLoginIdentifier,
} from "@/lib/managed-users-server";
import { invalidateManagedUsersListCache } from "@/lib/managed-users/list-cache";
import { enforceRateLimit } from "@/lib/rate-limit";
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

function getPrimaryTeacherSubjectName(input: {
  teacher?: {
    specialization?: string | null;
    assignments?: Array<{ subject_name: string }> | null;
  } | null;
}) {
  return input.teacher?.specialization ?? input.teacher?.assignments?.[0]?.subject_name ?? null;
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
  });
  await syncManagedAuthIdentityMetadata({
    authUserId,
    role: existing.role,
    schoolId: existing.school_id,
    fullName: existing.full_name,
    loginIdentifier: existing.app_account?.login_identifier ?? existing.email,
    isActive: existing.is_active,
  });
}

async function restoreManagedProfile(
  actorSupabase: ManagedUsersActorContext["actorSupabase"],
  existing: ManagedUserRecord,
) {
  await ensureManagedUserProfileLink(actorSupabase, {
    authUserId: existing.auth_user_id,
    schoolId: existing.school_id,
    role: existing.role,
    fullName: existing.full_name,
    email: existing.email,
    phone: existing.phone,
    isActive: existing.is_active,
    studentId: existing.student?.id ?? null,
    teacherId: existing.teacher?.id ?? null,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ authUserId: string }> },
) {
  const { authUserId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const requestedSchoolId = typeof body?.school_id === "string" ? body.school_id : null;

  const context = await resolveManagedUsersActorContext(requestedSchoolId, req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = enforceRateLimit(req, {
    namespace: "managed-user-patch",
    windowMs: 10 * 60_000,
    maxHits: 30,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  let existing: ManagedUserRecord | null = null;

  try {
    existing = await fetchManagedUserByAuthUserId(actorSupabase, {
      authUserId,
      schoolId: targetSchoolId,
    });
  } catch (existingError) {
    return jsonError(
      existingError instanceof Error ? existingError.message : "تعذر تحميل الحساب المطلوب.",
      getPostgrestStatus(existingError as { code?: string | null }),
    );
  }

  if (!existing) {
    return jsonError("الحساب المطلوب غير موجود أو خارج نطاق المدرسة الحالية.", 404);
  }
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

  const teacherTableCapabilities =
    existing.role === "teacher" ? await getTeacherTableCapabilities(actorSupabase) : null;
  const serviceSupabase = createServiceSupabaseClient();
  const authUpdatePayload: Record<string, unknown> = {
    ban_duration: validation.value.is_active ? "none" : MANAGED_USER_INACTIVE_BAN_DURATION,
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

  if (existing.role === "student") {
    if (!existing.student?.id) {
      await rollbackAuthUser(authUserId, existing);
      await restoreManagedProfile(actorSupabase, existing);

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
      .eq("id", existing.student.id)
      .eq("school_id", targetSchoolId);

    if (studentError) {
      await rollbackAuthUser(authUserId, existing);
      await restoreManagedProfile(actorSupabase, existing);

      return jsonError(studentError.message || "تعذر تحديث بيانات الطالب المرتبطة.", getPostgrestStatus(studentError, 400));
    }
  }

  if (existing.role === "teacher") {
    if (!existing.teacher?.id) {
      await rollbackAuthUser(authUserId, existing);
      await restoreManagedProfile(actorSupabase, existing);

      return jsonError("رابط سجل المدرس غير مكتمل لهذا الحساب.", 500);
    }

    const teacherUpdatePayload: Record<string, unknown> = {
      full_name: validation.value.full_name,
      email: validation.value.email,
      phone: validation.value.phone,
    };
    const teacherSubject = getPrimaryTeacherSubjectName({
      teacher: {
        specialization: validation.value.teacher?.specialization ?? null,
        assignments:
          (validation.value.teacher?.assignments ?? []).map((assignment) => ({
            subject_name: assignment.subject_name,
          })) ?? [],
      },
    });

    if (teacherTableCapabilities?.specialization) {
      teacherUpdatePayload.specialization = teacherSubject;
    } else if (teacherTableCapabilities?.subject) {
      teacherUpdatePayload.subject = teacherSubject;
    }

    if (teacherTableCapabilities?.notes) {
      teacherUpdatePayload.notes = validation.value.teacher?.notes ?? null;
    }

    if (teacherTableCapabilities?.is_active) {
      teacherUpdatePayload.is_active = validation.value.is_active;
    } else if (teacherTableCapabilities?.status) {
      teacherUpdatePayload.status = validation.value.is_active ? "active" : "inactive";
    }

    const { error: teacherError } = await actorSupabase
      .from("teachers")
      .update(teacherUpdatePayload)
      .eq("id", existing.teacher.id)
      .eq("school_id", targetSchoolId);

    if (teacherError) {
      await rollbackAuthUser(authUserId, existing);
      await restoreManagedProfile(actorSupabase, existing);

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
    try {
      await updateManagedUserLoginIdentifier(actorSupabase, {
        authUserId,
        schoolId: targetSchoolId,
        loginIdentifier: validation.value.email,
      });
    } catch (credentialError) {
      return jsonError(
        credentialError instanceof Error ? credentialError.message : "تعذر تحديث معرّف دخول التطبيق.",
        400,
      );
    }
  }

  try {
    await syncManagedUserAccountState(actorSupabase, {
      authUserId,
      schoolId: targetSchoolId,
      role: validation.value.role,
      fullName: validation.value.full_name,
      email: validation.value.email,
      phone: validation.value.phone,
      isActive: validation.value.is_active,
      studentId: existing.student?.id ?? null,
      teacherId: existing.teacher?.id ?? null,
    });
  } catch (identityError) {
    return jsonError(
      identityError instanceof Error ? identityError.message : "تم الحفظ لكن تعذر مزامنة هوية حساب التطبيق.",
      500,
    );
  }

  let updatedUser: ManagedUserRecord | null = null;
  try {
    updatedUser = await fetchManagedUserByAuthUserId(actorSupabase, {
      authUserId,
      schoolId: targetSchoolId,
    });
  } catch (fetchError) {
    return jsonError(
      fetchError instanceof Error ? fetchError.message : "تم الحفظ لكن تعذر إعادة تحميل الحساب.",
      500,
    );
  }

  invalidateManagedUsersListCache(targetSchoolId);

  return NextResponse.json({
    ok: true,
    user: updatedUser,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ authUserId: string }> },
) {
  const { authUserId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const requestedSchoolId =
    typeof body?.school_id === "string"
      ? body.school_id
      : typeof req.nextUrl.searchParams.get("schoolId") === "string"
        ? req.nextUrl.searchParams.get("schoolId")
        : null;

  const context = await resolveManagedUsersActorContext(requestedSchoolId, req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = enforceRateLimit(req, {
    namespace: "managed-user-delete",
    windowMs: 10 * 60_000,
    maxHits: 12,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  let existing: ManagedUserRecord | null = null;

  try {
    existing = await fetchManagedUserByAuthUserId(actorSupabase, {
      authUserId,
      schoolId: targetSchoolId,
    });
  } catch (existingError) {
    return jsonError(
      existingError instanceof Error ? existingError.message : "تعذر تحميل الحساب المطلوب.",
      getPostgrestStatus(existingError as { code?: string | null }),
    );
  }

  if (!existing) {
    return jsonError("الحساب المطلوب غير موجود أو خارج نطاق المدرسة الحالية.", 404);
  }

  if (existing.role === "teacher" && existing.teacher?.id) {
    const { error: assignmentsDeleteError } = await actorSupabase
      .from("teacher_assignments")
      .delete()
      .eq("teacher_id", existing.teacher.id)
      .eq("school_id", targetSchoolId);
    if (
      assignmentsDeleteError &&
      assignmentsDeleteError.code !== "42P01" &&
      !isMissingTableError(assignmentsDeleteError, "teacher_assignments") &&
      !assignmentsDeleteError.message.toLowerCase().includes("could not find")
    ) {
      return jsonError(assignmentsDeleteError.message || "تعذر حذف تكليفات الأستاذ.", 400);
    }

    const { error: teacherDeleteError } = await actorSupabase
      .from("teachers")
      .delete()
      .eq("id", existing.teacher.id)
      .eq("school_id", targetSchoolId);
    if (teacherDeleteError) {
      return jsonError(teacherDeleteError.message || "تعذر حذف سجل الأستاذ.", getPostgrestStatus(teacherDeleteError, 400));
    }
  }

  if (existing.role === "student" && existing.student?.id) {
    const { error: studentDeleteError } = await actorSupabase
      .from("students")
      .delete()
      .eq("id", existing.student.id)
      .eq("school_id", targetSchoolId);
    if (studentDeleteError) {
      return jsonError(studentDeleteError.message || "تعذر حذف سجل الطالب.", getPostgrestStatus(studentDeleteError, 400));
    }
  }

  await actorSupabase
    .from("managed_user_credentials")
    .delete()
    .eq("auth_user_id", authUserId)
    .eq("school_id", targetSchoolId);
  await actorSupabase
    .from("managed_user_profiles")
    .delete()
    .eq("auth_user_id", authUserId)
    .eq("school_id", targetSchoolId);
  await actorSupabase
    .from("user_profiles")
    .delete()
    .eq("id", authUserId)
    .eq("school_id", targetSchoolId);

  const serviceSupabase = createServiceSupabaseClient();
  const { error: authDeleteError } = await serviceSupabase.auth.admin.deleteUser(authUserId);
  if (authDeleteError) {
    return jsonError(authDeleteError.message || "تم حذف السجلات لكن تعذر حذف حساب المصادقة.", 500);
  }

  invalidateManagedUsersListCache(targetSchoolId);

  return NextResponse.json({ ok: true });
}
